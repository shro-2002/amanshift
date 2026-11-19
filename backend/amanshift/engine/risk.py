"""Crew Risk Engine (doc 05 sections 2, 3, 7). Pure functions; all constants from policy."""

from __future__ import annotations

import math
from collections.abc import Callable
from dataclasses import dataclass, field
from datetime import datetime, timedelta

from amanshift.engine.models import Crew, EnvEvidence, Snapshot
from amanshift.policy.loader import Policy

CMP_DP = 9  # canonical comparison precision shared by design with the checker (doc 05 section 8)
TRUST_ORDER = {"fresh": 0, "stale": 1, "lost": 2}


def rel(m_w: float, pol: Policy) -> float:
    return pol.niosh.rel.a - pol.niosh.rel.b * math.log10(m_w)


def ral(m_w: float, pol: Policy) -> float:
    return pol.niosh.ral.a - pol.niosh.ral.b * math.log10(m_w)


def limit(m_w: float, acclimatized: bool, pol: Policy) -> float:
    return rel(m_w, pol) if acclimatized else ral(m_w, pol)


def local(t: datetime, pol: Policy) -> datetime:
    return t + timedelta(hours=pol.timezone_offset_h)


def floor_hour(t: datetime) -> datetime:
    return t.replace(minute=0, second=0, microsecond=0)


def forecast_tier(ev: EnvEvidence, eval_time: datetime, pol: Policy) -> int:
    tier = TRUST_ORDER[ev.trust]
    p = ev.provenance
    retrieval_age_h = (eval_time - p.retrieved_at).total_seconds() / 3600
    issue_age_h = (
        (eval_time - p.issued_at).total_seconds() / 3600 if p.issued_at is not None else math.inf
    )
    if retrieval_age_h > pol.forecast_max_retrieval_age_h or issue_age_h > pol.forecast_max_issue_age_h:
        tier = max(tier, TRUST_ORDER["stale"])
    return tier


def is_meter(ev: EnvEvidence) -> bool:
    return ev.provenance.kind == "measured"


def clim_p99(t: datetime, kind: str, pol: Policy) -> float:
    lt = local(t, pol)
    table = pol.clim_p99_raw
    month = table.get(str(lt.month)) or table["default"]
    cell = month.get(str(lt.hour)) or table["default"][str(lt.hour)]
    return cell[kind] + pol.forecast_margin_c


@dataclass(frozen=True)
class Bound:
    value: float
    all_fresh: bool
    sources: tuple[str, ...]


def upper_bound(snap: Snapshot, zone: str, t: datetime, kind: str, pol: Policy) -> Bound:
    """max of candidate WBGT values for zone-hour (doc 05 section 2). kind in {sun, shade}."""
    hour = floor_hour(t)
    field_name = "wbgt_sun_c" if kind == "sun" else "wbgt_shade_c"
    delta = pol.forecast_margin_c
    cands: list[tuple[float, str]] = []
    forecasts = [
        ev
        for ev in snap.env
        if not is_meter(ev) and ev.zone_id == zone and floor_hour(ev.provenance.valid_at) == hour
        and getattr(ev, field_name) is not None
    ]
    fresh = bool(forecasts) and all(forecast_tier(ev, snap.eval_time, pol) == 0 for ev in forecasts)
    for ev in forecasts:
        cands.append((float(getattr(ev, field_name)) + delta, "forecast"))
    if not fresh:
        cands.append((clim_p99(t, kind, pol), "climatology"))
    day = local(t, pol).date()
    for ev in snap.env:
        if (
            is_meter(ev)
            and ev.zone_id == zone
            and ev.meter_location == kind
            and ev.provenance.valid_at <= snap.eval_time
            and local(ev.provenance.valid_at, pol).date() == day
        ):
            v = ev.wbgt_sun_c if kind == "sun" else ev.wbgt_shade_c
            if v is not None:
                cands.append((float(v), "meter"))
    best = max(c[0] for c in cands)
    return Bound(best, fresh, tuple(sorted({c[1] for c in cands})))


def twl_zone(snap: Snapshot, zone: str, t: datetime, pol: Policy) -> str | None:
    day = local(t, pol).date()
    readings = [
        ev.twl_wm2
        for ev in snap.env
        if is_meter(ev)
        and ev.zone_id == zone
        and ev.twl_wm2 is not None
        and ev.provenance.valid_at <= snap.eval_time
        and local(ev.provenance.valid_at, pol).date() == day
    ]
    if not readings:
        return None
    low = min(r for r in readings if r is not None)
    if low <= pol.twl_zones.high_max:
        return "high"
    if low <= pol.twl_zones.medium_max:
        return "medium"
    return "low"


def midday_active(t: datetime, exposure: str, pol: Policy) -> bool:
    mb = pol.midday_break
    if exposure not in mb.exposures:
        return False
    lt = local(t, pol)
    mmdd = lt.strftime("%m-%d")
    if not mb.from_mmdd <= mmdd <= mb.to_mmdd:
        return False
    hhmm = lt.strftime("%H:%M")
    return mb.start <= hhmm < mb.end


def feasible(f: float, w_work: float, w_rest: float, crew: Crew, pol: Policy) -> bool:
    """NIOSH 1-h TWA check. w_work includes CAV; w_rest is the rest bound WITHOUT CAV."""
    cav = pol.clothing_adjustment_c[crew.ppe]
    m_w = pol.metabolic_w[crew.workload]
    m_r = pol.metabolic_rest_w
    w_twa = f * w_work + (1 - f) * (w_rest + cav)
    m_twa = f * m_w + (1 - f) * m_r
    lim = limit(m_twa, crew.acclimatization == "acclimatized", pol)
    return round(w_twa, CMP_DP) <= round(lim, CMP_DP)


@dataclass
class CrewRisk:
    crew_id: str
    w_work: float  # effective WBGT at work incl. clothing adjustment
    u_work: float
    limit_full: float
    ral_full: float
    twl_zone: str | None
    twl_cap: float
    feasible_by_rest: dict[str, list[float]]  # rest resource id -> permitted fractions (< cap)
    feasible_uncovered: list[float]  # [1.0] or []
    f_max: float
    raw_level: int
    all_fresh: bool
    floors: list[str] = field(default_factory=list)
    reasons: list[str] = field(default_factory=list)


BoundFn = Callable[[str, datetime, str], Bound]


def memo_bound(snap: Snapshot, pol: Policy) -> BoundFn:
    """upper_bound memoised per (zone, hour, kind); valid within one snapshot evaluation."""
    cache: dict[tuple[str, datetime, str], Bound] = {}

    def fn(zone: str, t: datetime, kind: str) -> Bound:
        key = (zone, floor_hour(t), kind)
        if key not in cache:
            cache[key] = upper_bound(snap, zone, t, kind, pol)
        return cache[key]

    return fn


def assess_crew(
    snap: Snapshot,
    crew: Crew,
    t: datetime,
    rest_zones: dict[str, str],
    has_water: bool,
    pol: Policy,
    bound: BoundFn | None = None,
) -> CrewRisk:
    """Raw level with best available coverage. rest_zones: trusted rest resource id -> zone."""
    bound = bound or memo_bound(snap, pol)
    kind = "sun" if crew.exposure == "direct_sun" else "shade"
    ub = bound(crew.zone_id, t, kind)
    cav = pol.clothing_adjustment_c[crew.ppe]
    w_work = ub.value + cav
    m_w = pol.metabolic_w[crew.workload]
    acc = crew.acclimatization == "acclimatized"
    zone_cls = twl_zone(snap, crew.zone_id, t, pol)
    caps = pol.twl_caps
    twl_cap = 1.0
    floors: list[str] = []
    reasons: list[str] = []
    min_level = 1
    if zone_cls in ("medium", "high"):
        zc = caps.medium if zone_cls == "medium" else caps.high
        twl_cap = zc.f_cap[crew.workload]
        min_level = zc.min_level[crew.workload]
        if not acc or crew.size <= caps.stop_level_crew_size_max:
            min_level = caps.stop_level_unacclimatized
        floors.append(f"TWL_{zone_cls.upper()}")
    all_fresh = ub.all_fresh
    by_rest: dict[str, list[float]] = {}
    for rid, rzone in sorted(rest_zones.items()):
        rb = bound(rzone, t, "shade")
        all_fresh = all_fresh and rb.all_fresh
        by_rest[rid] = [
            f for f in pol.work_fractions if f <= twl_cap and feasible(f, w_work, rb.value, crew, pol)
        ]
    full_ok = twl_cap >= 1.0 and feasible(1.0, w_work, w_work - cav, crew, pol)
    uncovered = [1.0] if full_ok else []
    candidates = [max(v) for v in by_rest.values() if v] + uncovered
    f_max = max(candidates) if (candidates and has_water) else 0.0
    if not has_water:
        reasons.append("NO_WATER")
    if f_max == 0:
        level = 4
        reasons.append("NO_FEASIBLE_WORK" if has_water else "COVERAGE_FORCED")
    elif f_max < 1:
        level = 3
    elif w_work > ral(m_w, pol):
        level = 2
        reasons.append("ABOVE_RAL")
    else:
        level = 1
    if midday_active(t, crew.exposure, pol):
        floors.append("MIDDAY_BREAK")
        level = 4
    if crew.escalation_active:
        floors.append("ESCALATION")
        level = 4
    level = max(level, min_level)
    if "climatology" in ub.sources:
        reasons.append("FORECAST_DEGRADED")
    if "meter" in ub.sources:
        reasons.append("METER")
    return CrewRisk(
        crew_id=crew.crew_id,
        w_work=w_work,
        u_work=ub.value,
        limit_full=limit(m_w, acc, pol),
        ral_full=ral(m_w, pol),
        twl_zone=zone_cls,
        twl_cap=twl_cap,
        feasible_by_rest=by_rest,
        feasible_uncovered=uncovered,
        f_max=f_max,
        raw_level=level,
        all_fresh=all_fresh,
        floors=floors,
        reasons=reasons,
    )

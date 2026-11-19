"""Hypothesis generators for snapshots and degradation operators (doc 06 section 4).

Degradations keep the evaluation context fixed: eval_time, crews, policy and meter/TWL readings
are never changed or removed. Ageing is done only by back-dating timestamps.
"""

from __future__ import annotations

from datetime import UTC, datetime, timedelta
from typing import Any

from hypothesis import strategies as st

from amanshift.engine.models import (
    Crew,
    EnvEvidence,
    PrevEval,
    Provenance,
    Resource,
    SiteGraph,
    Snapshot,
)
from amanshift.policy.loader import load_policy

ZONES = ["Z1", "Z2", "Z3"]
DAY = datetime(2026, 8, 3, tzinfo=UTC)  # inside midday-break dates
TRUST_NEXT = {"fresh": "stale", "stale": "lost"}
STATE_NEXT = {"up": "unconfirmed", "unconfirmed": "unknown", "unknown": "down"}
CONN_NEXT = {"online": "degraded", "degraded": "offline"}

wbgt = st.floats(17.0, 42.0, allow_nan=False).map(lambda x: round(x, 3))


@st.composite
def crews(draw: Any) -> list[Crew]:
    n = draw(st.integers(1, 12))
    out = []
    for i in range(n):
        out.append(Crew(
            crew_id=f"C{i + 1}", size=draw(st.integers(1, 30)),
            workload=draw(st.sampled_from(["light", "light", "moderate", "moderate", "heavy",
                                           "very_heavy"])),
            ppe=draw(st.sampled_from(["work_clothes", "work_clothes", "work_clothes",
                                      "cloth_coveralls", "double_layer_cloth",
                                      "sms_coveralls", "polyolefin_coveralls",
                                      "limited_use_vapor_barrier"])),
            acclimatization=draw(st.sampled_from(["acclimatized", "unacclimatized", "mixed"])),
            exposure=draw(st.sampled_from(["direct_sun", "shaded_outdoor", "indoor_unconditioned"])),
            zone_id=draw(st.sampled_from(ZONES)),
            escalation_active=draw(st.booleans().filter(lambda b: True)) and draw(st.integers(0, 9)) == 0,
        ))
    return out


@st.composite
def resources(draw: Any, eval_time: datetime) -> list[Resource]:
    n = draw(st.integers(4, 10))
    out = []
    for i in range(n):
        age = draw(st.one_of(st.none(), st.integers(0, 40), st.integers(0, 25)))
        fixed = [("shade", None), ("water", "Z1"), ("water", "Z2"), ("water", "Z3")]
        rtype = fixed[i][0] if i < len(fixed) else draw(
            st.sampled_from(["shade", "shade", "cooled_rest", "water"]))
        rzone = fixed[i][1] if i < len(fixed) else None
        out.append(Resource(
            resource_id=f"R{i + 1}", type=rtype,
            zone_id=rzone or draw(st.sampled_from(ZONES)), capacity=draw(st.integers(0, 80)),
            state=draw(st.sampled_from(["up", "up", "up", "unconfirmed", "unknown", "down"])),
            last_confirmed_at=None if age is None else eval_time - timedelta(minutes=age)))
    return out


@st.composite
def snapshots(draw: Any) -> Snapshot:
    pol = load_policy()
    slot = draw(st.integers(0, 47))  # 06:00 .. 17:45 local on the 15-min grid
    eval_time = DAY + timedelta(hours=6 - pol.timezone_offset_h, minutes=15 * slot)
    env: list[EnvEvidence] = []
    start = DAY + timedelta(hours=5 - pol.timezone_offset_h)
    for z in ZONES:
        if draw(st.integers(0, 9)) == 0:
            continue  # zone never had a forecast
        base_sun, base_shade = draw(wbgt), draw(wbgt)
        retrieved = eval_time - timedelta(minutes=draw(st.one_of(st.integers(0, 170), st.integers(0, 170), st.integers(0, 300))))
        issued = eval_time - timedelta(hours=draw(st.one_of(st.integers(10, 29), st.integers(10, 34))))
        trust = draw(st.sampled_from(["fresh"] * 6 + ["stale", "lost"]))
        for h in range(14):
            bump = draw(st.sampled_from([-1.0, 0.0, 0.0, 1.0]))
            env.append(EnvEvidence(
                zone_id=z, wbgt_sun_c=base_sun + bump, wbgt_shade_c=min(base_shade, base_sun) + bump,
                trust=trust, provenance=Provenance(
                    source="open-meteo-previous-runs", kind="forecast", issued_at=issued,
                    valid_at=start + timedelta(hours=h), retrieved_at=retrieved)))
    for _ in range(draw(st.integers(0, 2))):
        env.append(meter_ev(draw, eval_time, pol.timezone_offset_h))
    cs = draw(crews())
    prev = {}
    for c in cs:
        if draw(st.integers(0, 3)) == 0:
            prev[c.crew_id] = PrevEval(raw_level=draw(st.integers(1, 4)),
                                       f_max=draw(st.sampled_from(pol.work_fractions + [0.0])),
                                       all_fresh=draw(st.booleans()))
    walk = {"Z1|Z2": draw(st.integers(0, 12)), "Z2|Z3": draw(st.integers(0, 12)),
            "Z1|Z3": draw(st.integers(0, 20))}
    return Snapshot(site_id="prop", eval_time=eval_time, policy_version=pol.version, env=env,
                    crews=cs, resources=draw(resources(eval_time)),
                    graph=SiteGraph(zones=ZONES, walk_min=walk),
                    connectivity=draw(st.sampled_from(["online", "degraded", "offline"])),
                    prev_eval=prev)


def meter_ev(draw: Any, eval_time: datetime, tz_h: int, upto: datetime | None = None) -> EnvEvidence:
    loc = draw(st.sampled_from(["sun", "shade"]))
    val = draw(st.one_of(st.none(), st.floats(20.0, 42.0).map(lambda x: round(x, 3))))
    twl = draw(st.one_of(st.none(), st.floats(80.0, 220.0).map(lambda x: round(x, 1))))
    if val is None and twl is None:
        val = 30.0
    when = eval_time - timedelta(minutes=draw(st.integers(0, 180)))
    return EnvEvidence(
        zone_id=draw(st.sampled_from(ZONES)), meter_location=loc if val is not None else None,
        wbgt_sun_c=val if loc == "sun" else None, wbgt_shade_c=val if loc == "shade" else None,
        twl_wm2=twl, provenance=Provenance(source="onsite-meter", kind="measured",
                                           valid_at=when, retrieved_at=eval_time))


# ---- degradation operators (each returns a degraded copy with the same context)

def lower_trust(s: Snapshot, zone: str) -> Snapshot:
    env = [e.model_copy(update={"trust": TRUST_NEXT.get(e.trust, e.trust)})
           if e.zone_id == zone and e.provenance.kind != "measured" else e for e in s.env]
    return s.model_copy(update={"env": env})


def lower_resource(s: Snapshot, idx: int) -> Snapshot:
    rs = list(s.resources)
    r = rs[idx % len(rs)]
    rs[idx % len(rs)] = r.model_copy(update={"state": STATE_NEXT.get(r.state, r.state)})
    return s.model_copy(update={"resources": rs})


def age_forecast(s: Snapshot, minutes: int) -> Snapshot:
    def old(e: EnvEvidence) -> EnvEvidence:
        if e.provenance.kind == "measured":
            return e
        p = e.provenance
        prov = p.model_copy(update={"retrieved_at": p.retrieved_at - timedelta(minutes=minutes),
                                    "issued_at": None if p.issued_at is None
                                    else p.issued_at - timedelta(minutes=minutes)})
        return e.model_copy(update={"provenance": prov})
    return s.model_copy(update={"env": [old(e) for e in s.env]})


def age_confirmation(s: Snapshot, idx: int, minutes: int) -> Snapshot:
    rs = list(s.resources)
    r = rs[idx % len(rs)]
    if r.last_confirmed_at is not None:
        rs[idx % len(rs)] = r.model_copy(
            update={"last_confirmed_at": r.last_confirmed_at - timedelta(minutes=minutes)})
    return s.model_copy(update={"resources": rs})


def lower_connectivity(s: Snapshot) -> Snapshot:
    return s.model_copy(update={"connectivity": CONN_NEXT.get(s.connectivity, s.connectivity)})


@st.composite
def degradation(draw: Any) -> Any:
    kind = draw(st.sampled_from(["trust", "resource", "age_fc", "age_conf", "conn"]))
    if kind == "trust":
        z = draw(st.sampled_from(ZONES))
        return lambda s: lower_trust(s, z)
    if kind == "resource":
        i = draw(st.integers(0, 20))
        return lambda s: lower_resource(s, i)
    if kind == "age_fc":
        m = draw(st.integers(1, 600))
        return lambda s: age_forecast(s, m)
    if kind == "age_conf":
        i, m = draw(st.integers(0, 20)), draw(st.integers(1, 120))
        return lambda s: age_confirmation(s, i, m)
    return lower_connectivity

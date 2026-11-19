"""Fail-Safe Decision Kernel (doc 05 sections 3, 5, 9).

Permitted actions are built only from upper bounds (risk.upper_bound), trusted edges and floors,
so degradation can only shrink them (doc 02 section 6). Pure: no I/O, time comes from snapshot.
"""

from __future__ import annotations

from dataclasses import dataclass
from datetime import datetime, timedelta

from amanshift.engine import coverage, risk
from amanshift.engine.models import PlanAction, PrevEval, Snapshot
from amanshift.policy.loader import Policy

Option = tuple[str, float | None, str | None, str | None, str | None]  # kind, f, rest, water, t


@dataclass
class CrewDecision:
    crew_id: str
    risk: risk.CrewRisk
    effective_level: int
    f_cap: float
    rest_edges: tuple[str, ...]
    water_edges: tuple[str, ...]
    defer_times: tuple[str, ...]  # ISO UTC grid times t >= t* with level(t) <= 3
    escalated: bool

    @property
    def defer_earliest(self) -> str | None:
        return self.defer_times[0] if self.defer_times else None

    def work_options(self) -> list[tuple[float, str | None, str]]:
        if self.escalated or self.effective_level >= 4:
            return []
        out: list[tuple[float, str | None, str]] = []
        for w in self.water_edges:
            for r in self.rest_edges:
                for f in self.risk.feasible_by_rest.get(r, []):
                    if f <= self.f_cap:
                        out.append((f, r, w))
            if 1.0 in self.risk.feasible_uncovered and self.f_cap >= 1.0:
                out.append((1.0, None, w))
        return out

    def permitted(self) -> frozenset[Option]:
        rests: list[str | None] = [*self.rest_edges, None]
        if self.escalated:
            return frozenset(("stop_esc", None, r, None, None) for r in rests)
        opts: set[Option] = {("stop", None, r, None, None) for r in rests}
        opts |= {("defer", None, r, None, t) for r in rests for t in self.defer_times}
        opts |= {("work", f, r, w, None) for f, r, w in self.work_options()}
        return frozenset(opts)

    def allows(self, a: PlanAction) -> bool:
        if self.escalated:
            return a.action == "stop" and a.clinical_escalation and (
                a.rest_resource is None or a.rest_resource in self.rest_edges
            )
        if a.action == "stop":
            return a.rest_resource is None or a.rest_resource in self.rest_edges
        if a.action == "defer":
            ok_rest = a.rest_resource is None or a.rest_resource in self.rest_edges
            return ok_rest and a.defer_until in self.defer_times
        opt = (a.work_fraction, a.rest_resource, a.water_resource)
        return opt in self.work_options()


@dataclass
class SiteDecision:
    snapshot: Snapshot
    crews: dict[str, CrewDecision]
    edges: coverage.Edges


def _grid_after(t: datetime, pol: Policy) -> list[datetime]:
    step = timedelta(minutes=pol.tick_min)
    lt = risk.local(t, pol)
    base = t - timedelta(minutes=lt.minute % pol.tick_min, seconds=lt.second)
    end_local = lt.replace(hour=pol.work_hours_local.end, minute=0, second=0)
    end = t + (end_local - lt)
    out: list[datetime] = []
    cur = base + step
    while cur <= end:
        out.append(cur)
        cur += step
    return out


def iso(t: datetime) -> str:
    return t.strftime("%Y-%m-%dT%H:%M:%SZ")


def decide(snap: Snapshot, pol: Policy, with_defer: bool = True) -> SiteDecision:
    """with_defer=False skips t* (used only for display timelines and offline packs)."""
    e = coverage.edges(snap, pol)
    res = coverage.resource_index(snap)
    grid = _grid_after(snap.eval_time, pol)
    bound = risk.memo_bound(snap, pol)
    out: dict[str, CrewDecision] = {}
    for c in sorted(snap.crews, key=lambda c: c.crew_id):
        rest_zones = {rid: res[rid].zone_id for rid in e.rest[c.crew_id]}
        has_water = bool(e.water[c.crew_id])
        r = risk.assess_crew(snap, c, snap.eval_time, rest_zones, has_water, pol, bound)
        prev = snap.prev_eval.get(c.crew_id)
        eff = max(r.raw_level, prev.raw_level) if prev else r.raw_level
        f_cap = min(r.f_max, prev.f_max) if prev else r.f_max
        if prev and prev.raw_level > r.raw_level:
            r.reasons.append("DWELL")
        if eff >= 4:
            f_cap = 0.0
        defer: list[str] = []
        if with_defer and not c.escalation_active:
            future = [
                t
                for t in grid
                if risk.assess_crew(snap, c, t, rest_zones, has_water, pol, bound).raw_level <= 3
            ]
            defer = [iso(t) for t in future]
        out[c.crew_id] = CrewDecision(
            crew_id=c.crew_id,
            risk=r,
            effective_level=eff,
            f_cap=f_cap,
            rest_edges=e.rest[c.crew_id],
            water_edges=e.water[c.crew_id],
            defer_times=tuple(defer),
            escalated=c.escalation_active,
        )
    return SiteDecision(snap, out, e)


def prev_eval_of(decision: SiteDecision) -> dict[str, PrevEval]:
    """Raw evaluation to carry into the next 15-min tick's snapshot (dwell)."""
    return {
        cid: PrevEval(raw_level=d.risk.raw_level, f_max=d.risk.f_max, all_fresh=d.risk.all_fresh)
        for cid, d in decision.crews.items()
    }

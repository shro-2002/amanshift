"""P0 deterministic greedy planner (doc 05 section 6). Only options inside A_c are ever chosen.

Protection comes first: crews are served by level desc, size desc, id asc; stopped crews still
receive rest capacity; work fraction is chosen last, among already-permitted options.
"""

from __future__ import annotations

import hashlib

from amanshift.engine import coverage
from amanshift.engine.kernel import CrewDecision, SiteDecision
from amanshift.engine.models import Plan, PlanAction, canonical_json, snapshot_id
from amanshift.policy.loader import Policy


def _first_with_capacity(ids: tuple[str, ...], size: int, cap: dict[str, int]) -> str | None:
    for rid in ids:
        if cap[rid] >= size:
            return rid
    return None


def _choose(d: CrewDecision, size: int, cap: dict[str, int]) -> tuple[PlanAction, bool]:
    """Returns (action, forced_by_capacity)."""
    lvl = f"LEVEL_{d.effective_level}"
    rest = _first_with_capacity(d.rest_edges, size, cap)
    if d.escalated:
        return PlanAction(crew_id=d.crew_id, action="stop", rest_resource=rest,
                          clinical_escalation=True, reason_codes=[lvl, "ESCALATION"]), False
    options = d.work_options()
    if not options:
        codes = [lvl] + ([] if d.rest_edges else ["NO_COVERAGE"])
        return PlanAction(crew_id=d.crew_id, action="stop", rest_resource=rest,
                          reason_codes=codes), False
    water = _first_with_capacity(d.water_edges, size, cap)
    for r in d.rest_edges:
        if cap[r] < size or water is None:
            continue
        fs = [f for f, rr, w in options if rr == r and w == water]
        if fs:
            return PlanAction(crew_id=d.crew_id, action="work", work_fraction=max(fs),
                              rest_resource=r, water_resource=water, reason_codes=[lvl]), False
    uncovered = [f for f, rr, w in options if rr is None and w == water]
    if water is not None and uncovered:
        codes = [lvl, "NO_REST_CAPACITY" if d.rest_edges else "NO_COVERAGE"]
        return PlanAction(crew_id=d.crew_id, action="work", work_fraction=max(uncovered),
                          water_resource=water, reason_codes=codes), False
    code = "NO_WATER_CAPACITY" if water is None else "NO_REST_CAPACITY"
    return PlanAction(crew_id=d.crew_id, action="stop", rest_resource=rest,
                      reason_codes=[lvl, code, "PROTECTION_INSUFFICIENT"]), True


def plan(decision: SiteDecision, pol: Policy, previous: Plan | None = None,
         by_priority: bool = True) -> Plan:
    """by_priority=False serves crews in id order (benchmark baseline only)."""
    snap = decision.snapshot
    sizes = {c.crew_id: c.size for c in snap.crews}
    zones = {c.crew_id: c.zone_id for c in snap.crews}
    res = coverage.resource_index(snap)
    cap = {r.resource_id: r.capacity for r in snap.resources}
    if by_priority:
        order = sorted(decision.crews.values(),
                       key=lambda d: (-d.effective_level, -sizes[d.crew_id], d.crew_id))
    else:
        order = sorted(decision.crews.values(), key=lambda d: d.crew_id)
    prev_actions = {a.crew_id: a for a in previous.actions} if previous else {}
    actions: list[PlanAction] = []
    insufficient = False
    weighted = walk_pm = work_pf = 0.0
    changes = 0
    for d in order:
        size = sizes[d.crew_id]
        a, forced = _choose(d, size, cap)
        for rid in (a.rest_resource, a.water_resource):
            if rid is not None:
                cap[rid] -= size
                walk_pm += size * coverage.walk(snap.graph, zones[d.crew_id], res[rid].zone_id)
        prior = prev_actions.get(d.crew_id)
        if prior is not None and (prior.action, prior.rest_resource) != (a.action, a.rest_resource):
            changes += 1
            if a.rest_resource and prior.rest_resource != a.rest_resource:
                a = a.model_copy(update={"reason_codes": [*a.reason_codes, "REASSIGNED"]})
        if a.rest_resource is None:
            weighted += size * pol.coverage_priority_by_level[str(d.effective_level)]
        if forced or (d.effective_level >= 3 and a.rest_resource is None):
            insufficient = True
        work_pf += size * (a.work_fraction or 0.0)
        actions.append(a)
    actions.sort(key=lambda a: a.crew_id)
    sid = snapshot_id(snap)
    body = canonical_json({"snapshot_id": sid, "actions": [a.model_dump() for a in actions]})
    return Plan(
        plan_id="p-" + hashlib.sha256(body.encode()).hexdigest()[:8],
        snapshot_id=sid,
        policy_version=pol.version,
        status="protection_insufficient" if insufficient else "feasible",
        actions=actions,
        objective={
            "unprotected_weighted_persons": weighted,
            "walk_person_minutes": round(walk_pm, 3),
            "changes": float(changes),
            "work_person_fraction": round(work_pf, 3),
        },
    )

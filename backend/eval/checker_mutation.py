"""Checker plan-mutation testing (doc 06 section 5). SYNTH-TEST.

From each approved plan on 500 generated snapshots, apply mutation operators. An oracle
(kernel membership of every action + capacity/type) classifies equivalent mutants, which are
excluded. Kill rate = rejected / non-equivalent. This measures rule coverage, not independence.
"""

from __future__ import annotations

import copy
import json
import sys
from collections import defaultdict
from collections.abc import Callable
from pathlib import Path
from typing import Any

from hypothesis import HealthCheck, given, settings

import amanshift_checker as chk
from amanshift.engine import kernel, planner, risk
from amanshift.engine.models import PlanAction, Snapshot
from amanshift.policy.loader import load_policy
from tests.property.strategies import snapshots

OUT = Path(__file__).resolve().parents[2] / "eval" / "out"
N_SNAPSHOTS = 500
POL = load_policy()
Plan = dict[str, Any]
Mutator = Callable[[Snapshot, kernel.SiteDecision, Plan], list[Plan]]
SAFETY_RULES = {"raise_fraction": "C2", "rel_instead_of_ral": "C2", "ignore_midday": "C3",
                "assign_down_resource": "C4", "exceed_capacity": "C4", "exceed_walk": "C4",
                "drop_stop_to_work": "C6", "ignore_escalation": "C10"}


def collect_snapshots() -> list[Snapshot]:
    out: list[Snapshot] = []

    @settings(max_examples=N_SNAPSHOTS, derandomize=True, deadline=None, database=None,
              suppress_health_check=list(HealthCheck))
    @given(snapshots())
    def grab(s: Snapshot) -> None:
        out.append(s)

    grab()
    return out


def _each(plan: Plan, pred: Callable[[dict[str, Any]], bool],
          change: Callable[[dict[str, Any]], bool]) -> list[Plan]:
    muts = []
    for i, a in enumerate(plan["actions"]):
        if pred(a):
            m = copy.deepcopy(plan)
            if change(m["actions"][i]) is not False:
                muts.append(m)
    return muts


def _work(a: dict[str, Any], f: float, rest: str | None, water: str | None) -> None:
    a.update(action="work", work_fraction=f, rest_resource=rest, water_resource=water,
             defer_until=None, clinical_escalation=False)


def m_raise(s: Snapshot, d: kernel.SiteDecision, p: Plan) -> list[Plan]:
    fr = sorted(POL.work_fractions)
    def up(a: dict[str, Any]) -> bool:
        i = fr.index(a["work_fraction"])
        if i + 1 >= len(fr):
            return False
        a["work_fraction"] = fr[i + 1]
        return True
    return _each(p, lambda a: a["action"] == "work", up)


def m_down(s: Snapshot, d: kernel.SiteDecision, p: Plan) -> list[Plan]:
    bad = [r.resource_id for r in s.resources if r.state != "up" and r.type != "water"]
    if not bad:
        return []
    return _each(p, lambda a: True, lambda a: a.update(rest_resource=bad[0]) or True)


def m_capacity(s: Snapshot, d: kernel.SiteDecision, p: Plan) -> list[Plan]:
    rests = [r for r in s.resources if r.type != "water"]
    if not rests:
        return []
    smallest = min(rests, key=lambda r: (r.capacity, r.resource_id)).resource_id
    m = copy.deepcopy(p)
    for a in m["actions"]:
        a["rest_resource"] = smallest
    return [m]


def m_walk(s: Snapshot, d: kernel.SiteDecision, p: Plan) -> list[Plan]:
    from amanshift.engine.coverage import walk
    zone = {c.crew_id: c.zone_id for c in s.crews}
    def far(a: dict[str, Any]) -> bool:
        for r in s.resources:
            if r.type != "water" and walk(s.graph, zone[a["crew_id"]], r.zone_id) > POL.max_walk_min[r.type]:
                a["rest_resource"] = r.resource_id
                return True
        return False
    return _each(p, lambda a: True, far)


def m_remove(s: Snapshot, d: kernel.SiteDecision, p: Plan) -> list[Plan]:
    if not p["actions"]:
        return []
    m = copy.deepcopy(p)
    m["actions"].pop()
    return [m]


def m_duplicate(s: Snapshot, d: kernel.SiteDecision, p: Plan) -> list[Plan]:
    if not p["actions"]:
        return []
    m = copy.deepcopy(p)
    m["actions"].append(copy.deepcopy(m["actions"][0]))
    return [m]


def m_stop_to_work(s: Snapshot, d: kernel.SiteDecision, p: Plan) -> list[Plan]:
    def go(a: dict[str, Any]) -> bool:
        cd = d.crews[a["crew_id"]]
        _work(a, 1.0, cd.rest_edges[0] if cd.rest_edges else None,
              cd.water_edges[0] if cd.water_edges else None)
        return True
    return _each(p, lambda a: d.crews[a["crew_id"]].effective_level >= 4, go)


def m_midday(s: Snapshot, d: kernel.SiteDecision, p: Plan) -> list[Plan]:
    crews = {c.crew_id: c for c in s.crews}
    def go(a: dict[str, Any]) -> bool:
        cd = d.crews[a["crew_id"]]
        _work(a, 0.25, cd.rest_edges[0] if cd.rest_edges else None,
              cd.water_edges[0] if cd.water_edges else None)
        return True
    return _each(p, lambda a: risk.midday_active(s.eval_time, crews[a["crew_id"]].exposure, POL), go)


def m_escalation(s: Snapshot, d: kernel.SiteDecision, p: Plan) -> list[Plan]:
    return _each(p, lambda a: d.crews[a["crew_id"]].escalated,
                 lambda a: a.update(clinical_escalation=False) or True)


def m_snapshot(s: Snapshot, d: kernel.SiteDecision, p: Plan) -> list[Plan]:
    m = copy.deepcopy(p)
    m["snapshot_id"] = "sha256:" + "0" * 64
    return [m]


def m_rel_ral(s: Snapshot, d: kernel.SiteDecision, p: Plan) -> list[Plan]:
    """For non-acclimatized crews, take the largest fraction the REL (not RAL) would allow."""
    crews = {c.crew_id: c for c in s.crews}
    muts = []
    for i, a in enumerate(p["actions"]):
        c = crews[a["crew_id"]]
        if c.acclimatization == "acclimatized" or a["action"] != "work":
            continue
        fake = s.model_copy(update={"crews": [x.model_copy(update={"acclimatization": "acclimatized"})
                                              if x.crew_id == c.crew_id else x for x in s.crews]})
        cd = kernel.decide(fake, POL, with_defer=False).crews[c.crew_id]
        opts = [o for o in cd.work_options() if o[1] == a["rest_resource"] and o[2] == a["water_resource"]]
        if opts and max(o[0] for o in opts) > a["work_fraction"]:
            m = copy.deepcopy(p)
            m["actions"][i]["work_fraction"] = max(o[0] for o in opts)
            muts.append(m)
    return muts


OPERATORS: dict[str, Mutator] = {
    "raise_fraction": m_raise, "assign_down_resource": m_down, "exceed_capacity": m_capacity,
    "exceed_walk": m_walk, "remove_crew": m_remove, "duplicate_crew": m_duplicate,
    "drop_stop_to_work": m_stop_to_work, "ignore_midday": m_midday, "ignore_escalation": m_escalation,
    "mismatch_snapshot": m_snapshot, "rel_instead_of_ral": m_rel_ral,
}


def oracle_valid(s: Snapshot, d: kernel.SiteDecision, p: Plan, sid: str) -> bool:
    """True if the mutant is still a valid plan (equivalent mutant)."""
    if p["snapshot_id"] != sid:
        return False
    ids = [a["crew_id"] for a in p["actions"]]
    if sorted(ids) != sorted(c.crew_id for c in s.crews):
        return False
    res = {r.resource_id: r for r in s.resources}
    sizes = {c.crew_id: c.size for c in s.crews}
    load: dict[str, int] = defaultdict(int)
    for a in p["actions"]:
        if not d.crews[a["crew_id"]].allows(PlanAction(**a)):
            return False
        for slot in ("rest_resource", "water_resource"):
            rid = a[slot]
            if rid is None:
                continue
            if rid not in res or (res[rid].type == "water") != (slot == "water_resource"):
                return False
            load[rid] += sizes[a["crew_id"]]
    return all(n <= res[rid].capacity for rid, n in load.items())


def main() -> int:
    stats: dict[str, dict[str, Any]] = {k: {"generated": 0, "equivalent": 0, "killed": 0, "survivors": []}
                                        for k in OPERATORS}
    snaps = collect_snapshots()
    approved_base = 0
    for s in snaps:
        dec = kernel.decide(s, POL)
        plan = planner.plan(dec, POL).model_dump(mode="json")
        snap_json = s.model_dump(mode="json")
        if chk.check(snap_json, plan)["verdict"] != "approved":
            continue
        approved_base += 1
        for name, op in OPERATORS.items():
            for m in op(s, dec, plan):
                st = stats[name]
                st["generated"] += 1
                if oracle_valid(s, dec, m, plan["snapshot_id"]):
                    st["equivalent"] += 1
                    continue
                if chk.check(snap_json, m)["verdict"] != "approved":
                    st["killed"] += 1
                elif len(st["survivors"]) < 5:
                    st["survivors"].append({"snapshot_id": plan["snapshot_id"][:19], "mutant": m["actions"]})
    total_ne = sum(v["generated"] - v["equivalent"] for v in stats.values())
    total_k = sum(v["killed"] for v in stats.values())
    for name, v in stats.items():
        ne = v["generated"] - v["equivalent"]
        v["non_equivalent"] = ne
        v["kill_rate"] = round(v["killed"] / ne, 4) if ne else None
        v["safety_rule"] = SAFETY_RULES.get(name)
    safety_survivors = sum(v["non_equivalent"] - v["killed"] for k, v in stats.items() if k in SAFETY_RULES)
    report = {"data_type": "SYNTH-TEST", "snapshots": len(snaps), "approved_base_plans": approved_base,
              "operators": stats, "non_equivalent_total": total_ne, "killed_total": total_k,
              "kill_rate_total": round(total_k / total_ne, 4) if total_ne else None,
              "safety_critical_survivors": safety_survivors,
              "note": "Measures rule coverage; independence evidence is T-CHK-DIFF and hand cases."}
    OUT.mkdir(parents=True, exist_ok=True)
    (OUT / "checker_mutation.json").write_text(json.dumps(report, indent=2) + "\n")
    print(json.dumps({k: report[k] for k in ("approved_base_plans", "non_equivalent_total",
                                              "kill_rate_total", "safety_critical_survivors")}))
    return 0 if safety_survivors == 0 else 1


if __name__ == "__main__":
    sys.exit(main())

"""Planner benchmark (doc 06 section 6). SYNTH-TEST: 200 sites per tier, 1-2 resource failures.

Compares the AmanShift greedy planner (level-priority order) with a naive greedy (crew-id order)
and no-replan (keep the pre-failure plan). Metric: priority-weighted unprotected persons.
"""

from __future__ import annotations

import json
import random
import statistics
import sys
import time
from pathlib import Path
from typing import Any

import amanshift_checker as chk
from amanshift.engine import kernel, planner
from amanshift.engine.models import Snapshot
from amanshift.policy.loader import load_policy
from tests.helpers import crew, day_forecast, resource, snapshot

OUT = Path(__file__).resolve().parents[2] / "eval" / "out"
TIERS = ((4, 3), (8, 6), (12, 10))
SITES_PER_TIER = 200
SEED = 20261119
ZONES = ["Z1", "Z2", "Z3"]
POL = load_policy()


def random_site(rng: random.Random, n_crews: int, n_res: int) -> Snapshot:
    crews = [crew(f"C{i + 1}", zone=rng.choice(ZONES), size=rng.randint(2, 12),
                  workload=rng.choice(["light", "moderate", "heavy"]),
                  acclimatization=rng.choice(["acclimatized", "acclimatized", "unacclimatized"]),
                  exposure=rng.choice(["direct_sun", "shaded_outdoor"])) for i in range(n_crews)]
    types = ["shade", "water"] + [rng.choice(["shade", "cooled_rest", "water"]) for _ in range(n_res - 2)]
    res = [resource(f"R{i + 1}", t, zone=rng.choice(ZONES), capacity=rng.randint(6, 24))
           for i, t in enumerate(types)]
    walk = {"Z1|Z2": rng.randint(2, 8), "Z2|Z3": rng.randint(2, 8), "Z1|Z3": rng.randint(4, 14)}
    sun = round(rng.uniform(24.0, 33.0), 1)
    return snapshot(crews, res, day_forecast(ZONES, sun, sun - rng.uniform(1.0, 4.0)), walk=walk)


def fail_resources(rng: random.Random, s: Snapshot) -> Snapshot:
    k = rng.randint(1, 2)
    down = set(rng.sample([r.resource_id for r in s.resources], k))
    return s.model_copy(update={"resources": [r.model_copy(update={"state": "down"})
                                              if r.resource_id in down else r for r in s.resources]})


def unprotected(p: dict[str, Any], s: Snapshot, d: kernel.SiteDecision) -> float:
    sizes = {c.crew_id: c.size for c in s.crews}
    down = {r.resource_id for r in s.resources if r.state != "up"}
    total = 0.0
    for a in p["actions"]:
        if a["rest_resource"] is None or a["rest_resource"] in down:
            total += sizes[a["crew_id"]] * POL.coverage_priority_by_level[str(d.crews[a["crew_id"]].effective_level)]
    return total


def main() -> int:
    rng = random.Random(SEED)
    tiers = []
    for n_c, n_r in TIERS:
        rows: dict[str, dict[str, list[float]]] = {
            k: {"unprotected": [], "stopped": [], "violations": [], "ms": []}
            for k in ("amanshift_greedy", "naive_greedy", "no_replan")}
        for _ in range(SITES_PER_TIER):
            s0 = random_site(rng, n_c, n_r)
            before = planner.plan(kernel.decide(s0, POL), POL)
            s1 = fail_resources(rng, s0)
            sj = s1.model_dump(mode="json")
            t = time.perf_counter()
            d1 = kernel.decide(s1, POL)
            cands = {"amanshift_greedy": planner.plan(d1, POL).model_dump(mode="json")}
            ms_main = (time.perf_counter() - t) * 1000
            cands["naive_greedy"] = planner.plan(d1, POL, by_priority=False).model_dump(mode="json")
            stale = before.model_dump(mode="json")
            stale["snapshot_id"] = planner.snapshot_id(s1)
            cands["no_replan"] = stale
            for k, p in cands.items():
                v = chk.check(sj, p)
                rows[k]["unprotected"].append(unprotected(p, s1, d1))
                rows[k]["stopped"].append(sum(a["action"] == "stop" for a in p["actions"]))
                rows[k]["violations"].append(len(v["violations"]))
                rows[k]["ms"].append(ms_main if k == "amanshift_greedy" else 0.0)
        summary = {}
        for k, r in rows.items():
            entry = {"mean_priority_weighted_unprotected": round(statistics.mean(r["unprotected"]), 3),
                     "mean_crews_stopped": round(statistics.mean(r["stopped"]), 3),
                     "sites_with_checker_violations": int(sum(1 for x in r["violations"] if x)),
                     "total_checker_violations": int(sum(r["violations"]))}
            if k == "amanshift_greedy":
                ms = sorted(r["ms"])
                entry["runtime_ms_p50"] = round(ms[len(ms) // 2], 2)
                entry["runtime_ms_p95"] = round(ms[int(len(ms) * 0.95)], 2)
            summary[k] = entry
        wins = sum(a <= b for a, b in zip(rows["amanshift_greedy"]["unprotected"],
                                          rows["naive_greedy"]["unprotected"], strict=True))
        summary["amanshift_le_naive_sites"] = wins
        tiers.append({"crews": n_c, "resources": n_r, "sites": SITES_PER_TIER, **summary})
    report = {"data_type": "SYNTH-TEST", "seed": SEED, "tiers": tiers,
              "note": "runtime = kernel decide + plan (incl. defer search), single core; MILP planner is P1 "
                      "and not built"}
    OUT.mkdir(parents=True, exist_ok=True)
    (OUT / "planner_bench.json").write_text(json.dumps(report, indent=2) + "\n")
    print(json.dumps(tiers, indent=1)[:1500])
    bad = sum(t["amanshift_greedy"]["total_checker_violations"] for t in tiers)
    return 0 if bad == 0 else 1


if __name__ == "__main__":
    sys.exit(main())

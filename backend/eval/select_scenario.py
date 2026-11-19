"""Scenario-day selection rule (doc 09 section 4, amendment A1). No hand cherry-picking.

First 2026 day from 1 Jul with complete data where, at 10:30 GST, Demo Site A shows >= 3 distinct
effective levels, >= 1 level-3 crew covered only via R2, and >= 1 level-1/2 crew.
Fallback: two distinct levels (recorded in STATUS if used).
"""

from __future__ import annotations

import json
import sys
from datetime import date, timedelta

from amanshift import scenario as sc
from amanshift.engine import kernel, planner
from amanshift.policy.loader import load_policy

START = date(2026, 7, 1)
END = date(2026, 9, 30)
JUDGE_HH, JUDGE_MM = 10, 30
HOURS_REQUIRED = 24


def evaluate(day: date) -> dict[str, object] | None:
    pol = load_policy()
    if len(sc.day_estimates(day, pol.timezone_offset_h)) < HOURS_REQUIRED:
        return None
    t = sc.local_time(day, JUDGE_HH, JUDGE_MM, pol)
    snap = sc.build_snapshot(sc.initial_state(day, t), pol)
    dec = kernel.decide(snap, pol)
    plan = planner.plan(dec, pol)
    rest_of = {a.crew_id: a.rest_resource for a in plan.actions}
    levels = {c: d.effective_level for c, d in dec.crews.items()}
    r2_only = [c for c, d in dec.crews.items()
               if d.effective_level == 3 and d.rest_edges == ("R2",) and rest_of[c] == "R2"]
    return {"date": day.isoformat(), "levels": levels, "distinct": len(set(levels.values())),
            "level3_only_via_R2": r2_only, "low_level_crews": [c for c, v in levels.items() if v <= 2],
            "plan_status": plan.status}


def main() -> int:
    tried: list[dict[str, object]] = []
    chosen = None
    for rule in ("strict", "relaxed"):
        day = START
        while day <= END and chosen is None:
            r = evaluate(day)
            if r is not None:
                tried.append(r) if rule == "strict" else None
                strict = (r["distinct"] >= 3 and r["level3_only_via_R2"]  # type: ignore[operator]
                          and r["low_level_crews"])
                relaxed = r["distinct"] >= 2  # type: ignore[operator]
                if (rule == "strict" and strict) or (rule == "relaxed" and relaxed):
                    chosen = {**r, "rule": rule}
            day += timedelta(days=1)
        if chosen:
            break
    out = {"scenario_id": "s-auh-1", "site": "demo-site-a", "judging_time_local": "10:30",
           "replay_window_local": ["06:00", "18:00"], "selection": chosen,
           "days_scanned": len(tried), "rule_text": __doc__}
    sc.SCENARIO_FILE.write_text(json.dumps(out, indent=2, default=str) + "\n")
    print(json.dumps(chosen, indent=1))
    return 0 if chosen else 1


if __name__ == "__main__":
    sys.exit(main())

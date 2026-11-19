"""Cost of safety (doc 06 section 7). SIM-SITE + HIST-FCST, 2026 holdout season.

Permitted work person-hours on Demo Site A (sum over crews of size x max permitted fraction, each
hourly tick 06:30-17:30 GST) under full information vs degraded information.
"""

from __future__ import annotations

import json
import sys
from dataclasses import replace
from datetime import date, timedelta
from pathlib import Path

from amanshift import scenario as sc
from amanshift.engine import kernel, risk
from amanshift.policy.loader import load_policy

OUT = Path(__file__).resolve().parents[2] / "eval" / "out"
SEASON = (date(2026, 6, 1), date(2026, 9, 30))
TICK_HOURS = range(6, 18)
POL = load_policy()


def work_hours(state: sc.SiteState, mode: str) -> float:
    st = state
    if mode == "stale_forecast":
        st = replace(st, forecast_backdate=timedelta(hours=4))
    elif mode == "forecast_missing":
        st = replace(st, forecast_lost=True)
    snap = sc.build_snapshot(st, POL)
    if mode == "forecast_missing":
        snap = snap.model_copy(update={"env": [e for e in snap.env if e.provenance.kind == "measured"]})
    if mode in ("offline_gt_1h", "offline_gt_3h"):
        # client shows max(planned, worst case); worst case = lost forecast + unconfirmed resources
        return 0.0 if _worst_all_stop(st) else _sum(kernel.decide(snap, POL, with_defer=False), snap)
    return _sum(kernel.decide(snap, POL, with_defer=False), snap)


def _worst_all_stop(st: sc.SiteState) -> bool:
    w = replace(st, forecast_lost=True, resource_state={k: "unconfirmed" for k in st.resource_state})
    dec = kernel.decide(sc.build_snapshot(w, POL), POL, with_defer=False)
    return all(d.effective_level >= 4 for d in dec.crews.values())


def _sum(dec: kernel.SiteDecision, snap: object) -> float:
    sizes = {c.crew_id: c.size for c in snap.crews}  # type: ignore[attr-defined]
    return sum(sizes[cid] * d.f_cap for cid, d in dec.crews.items())


def main() -> int:
    modes = ("full_information", "stale_forecast", "forecast_missing", "offline_gt_1h", "offline_gt_3h")
    totals = {m: 0.0 for m in modes}
    days = 0
    nominal = midday = 0.0
    crews = sc.site_config()["crews"]
    day = SEASON[0]
    while day <= SEASON[1]:
        if len(sc.day_estimates(day, POL.timezone_offset_h)) == 24:
            days += 1
            for h in TICK_HOURS:
                t = sc.local_time(day, h, 30, POL)
                st = sc.initial_state(day, t)
                for c in crews:
                    nominal += c["size"]
                    if risk.midday_active(t, c["exposure"], POL):
                        midday += c["size"]
                for m in modes:
                    totals[m] += work_hours(st, m)
        day += timedelta(days=1)
    base = totals["full_information"]
    report = {"data_types": ["SIM-SITE", "HIST-FCST"], "season": [d.isoformat() for d in SEASON],
              "days": days, "ticks_per_day": len(TICK_HOURS),
              "permitted_work_person_hours": {m: round(v, 1) for m, v in totals.items()},
              "nominal_person_hours": round(nominal, 1),
              "midday_break_person_hours": round(midday, 1),
              "permitted_share_of_nominal_pct": {m: round(100 * v / nominal, 1) if nominal else None
                                                  for m, v in totals.items()},
              "midday_break_share_of_nominal_pct": round(100 * midday / nominal, 1) if nominal else None,
              "reduction_vs_full_pct": {m: round(100 * (1 - v / base), 1) if base else None
                                        for m, v in totals.items()},
              "note": "Nominal = every worker on Demo Site A at every hourly tick 06:30-17:30 GST on "
                      "season days with data. Permitted = sum of crew size x maximum permitted work "
                      "fraction (NIOSH REL/RAL 1-h TWA, ADOSH TWL caps, midday break, resources). "
                      "Offline modes follow the client rule (worst case = forecast lost + all "
                      "resources unconfirmed)."}
    OUT.mkdir(parents=True, exist_ok=True)
    (OUT / "cost_of_safety.json").write_text(json.dumps(report, indent=2) + "\n")
    print(json.dumps(report, indent=1))
    return 0


if __name__ == "__main__":
    sys.exit(main())

"""Offline pack and worker cards (doc 03 section 12, doc 02 section 6, amendment A5).

The pack holds, per crew and 15-min step, the planned level and the server-computed worst case
(forecast lost + all resources unconfirmed). The client only ever takes maxima of these.
"""

from __future__ import annotations

from dataclasses import replace
from datetime import UTC, datetime, timedelta
from typing import Any

from amanshift import scenario as sc
from amanshift.api import session as ss
from amanshift.api.views import display_level, hhmm
from amanshift.engine import kernel
from amanshift.policy.loader import Policy

PACK_HOURS = 12
MINUTES_PER_HOUR = 60


def _levels(state: sc.SiteState, t: datetime, pol: Policy, worst: bool) -> dict[str, int]:
    shift = t - state.eval_time
    st = replace(state, eval_time=t,
                 confirmed_at={k: v + shift for k, v in state.confirmed_at.items()})
    if worst:
        st = replace(st, forecast_lost=True,
                     resource_state={k: "unconfirmed" for k in st.resource_state})
    dec = kernel.decide(sc.build_snapshot(st, pol), pol, with_defer=False)
    return {cid: d.effective_level for cid, d in dec.crews.items()}


def build_pack(s: ss.Session, pol: Policy) -> dict[str, Any]:
    snap, dec = s.evaluate(pol)
    acts = {a.crew_id: a.model_dump(mode="json") for a in s.approved.actions} if s.approved else {}
    now_levels = {cid: display_level(d, acts.get(cid)) for cid, d in dec.crews.items()}
    steps: list[dict[str, Any]] = []
    n = PACK_HOURS * MINUTES_PER_HOUR // pol.tick_min
    for i in range(n):
        t = s.state.eval_time + timedelta(minutes=pol.tick_min * i)
        planned = _levels(s.state, t, pol, worst=False)
        if i == 0:
            planned = {c: max(v, now_levels[c]) for c, v in planned.items()}
        worst = _levels(s.state, t, pol, worst=True)
        steps.append({"offset_min": pol.tick_min * i, "time_local": hhmm(t, pol),
                      "planned": planned,
                      "worst_case": {c: max(worst[c], planned[c]) for c in planned}})
    issued = datetime.now(UTC).replace(microsecond=0)
    confirmations = [v for k, v in s.state.confirmed_at.items()
                     if s.state.resource_state.get(k) == "up"]
    conf_left = min(((c + timedelta(minutes=pol.resource_confirmation_ttl_min)) - s.state.eval_time
                     for c in confirmations), default=timedelta(0))
    return {
        "pack_issued_at": issued.isoformat(),
        "scenario_time_local": hhmm(s.state.eval_time, pol),
        "stale_after_min": pol.offline_stale_after_min,
        "expires_after_min": pol.offline_expiry_min,
        "confirmations_expire_after_min": max(0, round(conf_left.total_seconds() / 60)),
        "tick_min": pol.tick_min, "steps": steps, "cards": cards(s, pol)["cards"],
        "resources": {k: v for k, v in s.state.resource_state.items()},
        "policy_version": pol.version,
    }


def cards(s: ss.Session, pol: Policy) -> dict[str, Any]:
    snap, dec = s.evaluate(pol)
    plan = s.approved
    acts = {a.crew_id: a for a in plan.actions} if plan else {}
    out = []
    for cid, d in dec.crews.items():
        a = acts.get(cid)
        if a is not None and not d.allows(a):
            a = None  # approved action no longer permitted: card falls back to STOP (tighten only)
        lvl = display_level(d, a.model_dump(mode="json") if a else None)
        if a is None and not d.escalated:
            lvl = 4
        if d.escalated:
            key = "escalation"
        elif lvl == 4:
            key = "stop"
        elif lvl == 3:
            key = "work_rest"
        elif lvl == 2:
            key = "increased"
        else:
            key = "standard"
        f = a.work_fraction if key == "work_rest" and a and a.action == "work" else None
        work_min = round(f * MINUTES_PER_HOUR) if f is not None else None
        out.append({"crew_id": cid, "level": lvl, "key": key, "work_min": work_min,
                    "rest_min": MINUTES_PER_HOUR - work_min if work_min is not None else None,
                    "rest": a.rest_resource if a else (d.rest_edges[0] if d.rest_edges else None),
                    "water": a.water_resource if a else None,
                    "updated_local": hhmm(snap.eval_time, pol), "degraded": not d.risk.all_fresh,
                    "provenance": "estimated WBGT (forecast-derived)"})
    out.sort(key=lambda c: (-c["level"], c["crew_id"]))
    return {"cards": out, "plan_id": plan.plan_id if plan else None,
            "emergency_number": "999 (UAE ambulance)", "pending_native_review": True}

"""Serialize engine results for the UI. Every number carries provenance; no person data exists."""

from __future__ import annotations

from datetime import datetime, timedelta
from typing import Any

from amanshift import scenario as sc
from amanshift.engine import coverage, kernel, risk
from amanshift.engine.models import Plan, PlanAction, Snapshot, snapshot_id
from amanshift.policy.loader import Policy

LEVEL_NAMES = {1: "STANDARD", 2: "INCREASED CARE", 3: "WORK / REST", 4: "STOP"}


def hhmm(t: datetime, pol: Policy) -> str:
    return risk.local(t, pol).strftime("%H:%M")


def display_level(d: kernel.CrewDecision, action: dict[str, Any] | None) -> int:
    """Plan-implied level: a crew stopped for lack of protection capacity is shown as STOP."""
    if action and action["action"] == "stop":
        return 4
    return d.effective_level


def forecast_info(snap: Snapshot, pol: Policy) -> dict[str, Any]:
    fc = [e for e in snap.env if e.provenance.kind == "forecast"]
    if not fc:
        return {"tier": "never", "source": "climatology"}
    p = fc[0].provenance
    tier = max(risk.forecast_tier(e, snap.eval_time, pol) for e in fc)
    return {"source": p.source, "kind": "forecast", "issued_at": p.issued_at, "retrieved_at": p.retrieved_at,
            "age_min": round((snap.eval_time - p.retrieved_at).total_seconds() / 60),
            "tier": ["fresh", "stale", "lost"][tier], "label": "estimated WBGT (forecast-derived)"}


def crew_view(snap: Snapshot, d: kernel.CrewDecision, action: dict[str, Any] | None,
              pol: Policy) -> dict[str, Any]:
    c = next(x for x in snap.crews if x.crew_id == d.crew_id)
    r = d.risk
    acc = c.acclimatization == "acclimatized"
    degraded = "FORECAST_DEGRADED" in r.reasons or not r.all_fresh
    return {
        "crew_id": c.crew_id, "size": c.size, "workload": c.workload, "ppe": c.ppe,
        "acclimatization": c.acclimatization, "exposure": c.exposure, "zone_id": c.zone_id,
        "level": d.effective_level, "display_level": display_level(d, action),
        "level_name": LEVEL_NAMES[display_level(d, action)], "raw_level": r.raw_level,
        "degraded": degraded, "escalated": d.escalated,
        "trace": {
            "estimated_wbgt_c": round(r.u_work, 2),
            "estimated_wbgt_kind": "sun" if c.exposure == "direct_sun" else "shade",
            "clothing_adjustment_c": pol.clothing_adjustment_c[c.ppe],
            "effective_wbgt_c": round(r.w_work, 2),
            "metabolic_w": pol.metabolic_w[c.workload], "limit_kind": "REL" if acc else "RAL",
            "limit_full_work_c": round(r.limit_full, 2), "ral_c": round(r.ral_full, 2),
            "forecast_margin_c": pol.forecast_margin_c,
            "f_max": r.f_max, "f_cap_effective": d.f_cap, "twl_zone": r.twl_zone, "twl_cap": r.twl_cap,
        },
        "floors": r.floors, "reasons": r.reasons,
        "rest_edges": list(d.rest_edges), "water_edges": list(d.water_edges),
        "work_options": [{"f": f, "rest": rr, "water": w} for f, rr, w in d.work_options()],
        "defer_earliest": hhmm(datetime.fromisoformat(d.defer_earliest.replace("Z", "+00:00")), pol)
        if d.defer_earliest else None,
        "action": action,
        "action_valid": action is not None and d.allows(PlanAction(**action)),
    }


def coverage_view(snap: Snapshot, dec: kernel.SiteDecision, plan: Plan | None,
                  pol: Policy) -> dict[str, Any]:
    """Only actions still permitted under the current snapshot count as coverage."""
    assigned = set()
    covered_people = 0
    covered = []
    if plan:
        for a in plan.actions:
            if not dec.crews[a.crew_id].allows(a):
                continue
            for rid in (a.rest_resource, a.water_resource):
                if rid:
                    assigned.add((a.crew_id, rid))
            if a.rest_resource and a.water_resource or a.action == "stop" and a.rest_resource:
                covered.append(a.crew_id)
    sizes = {c.crew_id: c.size for c in snap.crews}
    covered_people = sum(sizes[c] for c in covered)
    edges = []
    for cid, d in dec.crews.items():
        for rid in (*d.rest_edges, *d.water_edges):
            edges.append({"crew": cid, "resource": rid,
                          "status": "assigned" if (cid, rid) in assigned else "available"})
    for cid, rid in coverage.lost_edges(snap, pol):
        edges.append({"crew": cid, "resource": rid, "status": "lost"})
    load: dict[str, int] = {}
    for cid, rid in assigned:
        load[rid] = load.get(rid, 0) + sizes[cid]
    resources = []
    for r in snap.resources:
        age = None if r.last_confirmed_at is None else round(
            (snap.eval_time - r.last_confirmed_at).total_seconds() / 60)
        resources.append({"resource_id": r.resource_id, "type": r.type, "zone_id": r.zone_id,
                          "capacity": r.capacity, "state": r.state, "confirmed_age_min": age,
                          "trusted": coverage.trusted_up(r, snap, pol), "load": load.get(r.resource_id, 0)})
    return {"covered_crews": sorted(covered), "total_crews": len(snap.crews),
            "covered_persons": covered_people, "total_persons": sum(sizes.values()),
            "edges": sorted(edges, key=lambda e: (e["crew"], e["resource"])), "resources": resources,
            "zones": snap.graph.zones, "walk_min": snap.graph.walk_min}


def timeline(state: sc.SiteState, snap: Snapshot, pol: Policy) -> dict[str, Any]:
    est = sc.day_estimates(state.day, pol.timezone_offset_h)
    hours = []
    start, end = pol.work_hours_local.start, pol.work_hours_local.end
    for row in est.itertuples():
        lh = risk.local(row.time_utc.to_pydatetime(), pol).hour
        if not start <= lh <= end:
            continue
        t = row.time_utc.to_pydatetime() + timedelta(minutes=30)
        hs = sc.build_snapshot(sc.at(state, t), pol)
        dec = kernel.decide(hs, pol, with_defer=False)
        hours.append({"hour": lh, "wbgt_sun_est": round(float(row.wbgt_sun_c), 2),
                      "wbgt_shade_est": round(float(row.wbgt_shade_c), 2),
                      "site_max_level": max((d.effective_level for d in dec.crews.values()), default=1)})
    meters = [{"zone": e.zone_id, "location": e.meter_location, "wbgt": e.wbgt_sun_c or e.wbgt_shade_c,
               "twl": e.twl_wm2, "at": hhmm(e.provenance.valid_at, pol)}
              for e in snap.env if e.provenance.kind == "measured"]
    mb = pol.midday_break
    return {"hours": hours, "midday_break": {"start": mb.start, "end": mb.end,
                                             "from": mb.from_mmdd, "to": mb.to_mmdd},
            "now": hhmm(snap.eval_time, pol), "meters": meters,
            "provenance": {"source": "open-meteo-previous-runs", "kind": "forecast",
                           "label": "estimated WBGT (HIST-FCST)"}}


def state_view(state: sc.SiteState, snap: Snapshot, dec: kernel.SiteDecision, plan: Plan | None,
               pol: Policy) -> dict[str, Any]:
    acts = {a.crew_id: a.model_dump(mode="json") for a in plan.actions} if plan else {}
    crews = [crew_view(snap, d, acts.get(cid), pol) for cid, d in dec.crews.items()]
    crews.sort(key=lambda c: (-c["display_level"], c["crew_id"]))
    counts = {str(k): sum(1 for c in crews if c["display_level"] == k) for k in (1, 2, 3, 4)}
    return {
        "site": {"site_id": snap.site_id, "label": sc.site_config()["label"], "synthetic": True,
                 "display": sc.site_config().get("display", {})},
        "scenario_date": state.day.isoformat(), "eval_time": snap.eval_time,
        "eval_time_local": hhmm(snap.eval_time, pol), "connectivity": snap.connectivity,
        "policy_version": pol.version, "snapshot_id": snapshot_id(snap),
        "forecast": forecast_info(snap, pol), "level_counts": counts, "crews": crews,
        "coverage": coverage_view(snap, dec, plan, pol),
    }

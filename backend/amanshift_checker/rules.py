"""Declarative rule predicates C1-C6, C8, C10-C12 (doc 05 section 8). Each returns violations."""

from __future__ import annotations

import hashlib
import json
from collections import defaultdict
from collections.abc import Callable
from typing import Any

from amanshift_checker.site import REST_KINDS, SiteView, ts

Violation = dict[str, Any]
CITE = {
    "C1": "doc05 §6/§8 C1: one action per crew",
    "C2": "NIOSH 2016-106 REL/RAL 1-h TWA (policy niosh, metabolic_w, clothing_adjustment_c); "
          "ADOSH TWL caps (policy twl_caps)",
    "C3": "UAE MoHRE midday break (policy midday_break)",
    "C4": "doc05 §4 coverage: resource up, confirmed within TTL, walk limit, capacity",
    "C5": "ADPHC guidance: rest area below full work, water for all work "
          "(policy require_rest_resource_below_full_work, require_water_resource_for_work)",
    "C6": "doc05 §3/§7: level 4 permits only stop/defer/escalation",
    "C8": "doc03 §10: plan bound to snapshot hash and policy version",
    "C10": "doc07 §9: escalated crew must stop with clinical_escalation",
    "C11": "doc07 G3: plan schema (action enum, fractions from policy, no extra fields)",
    "C12": "doc05 §5: defer only to t >= t* where level <= 3",
}
PLAN_KEYS = {"plan_id", "snapshot_id", "policy_version", "status", "actions", "objective"}
ACTION_KEYS = {"crew_id", "action", "work_fraction", "rest_resource", "water_resource",
               "defer_until", "clinical_escalation", "reason_codes"}


def v(rule: str, crew: str | None, msg: str) -> Violation:
    return {"rule": rule, "crew_id": crew, "message": msg, "citation": CITE[rule]}


def canonical_hash(snap: dict[str, Any]) -> str:
    body = json.dumps(snap, sort_keys=True, separators=(",", ":"), ensure_ascii=True)
    return "sha256:" + hashlib.sha256(body.encode()).hexdigest()


def c11_schema(plan: dict[str, Any], sv: SiteView) -> list[Violation]:
    out: list[Violation] = []
    if set(plan) != PLAN_KEYS:
        out.append(v("C11", None, f"plan keys {sorted(set(plan) ^ PLAN_KEYS)} invalid"))
    for a in plan.get("actions", []) if isinstance(plan.get("actions"), list) else []:
        cid = a.get("crew_id") if isinstance(a, dict) else None
        if not isinstance(a, dict) or set(a) != ACTION_KEYS:
            out.append(v("C11", cid, "action fields invalid"))
            continue
        if a["action"] not in ("work", "stop", "defer"):
            out.append(v("C11", cid, f"unknown action {a['action']!r}"))
        if not isinstance(a["clinical_escalation"], bool):
            out.append(v("C11", cid, "clinical_escalation must be boolean"))
        f = a["work_fraction"]
        if a["action"] == "work" and f not in sv.p.fractions:
            out.append(v("C11", cid, f"work fraction {f!r} not in policy list"))
        if a["action"] != "work" and f is not None:
            out.append(v("C11", cid, "work fraction only allowed on work"))
        if a["action"] == "defer" and not isinstance(a["defer_until"], str):
            out.append(v("C11", cid, "defer requires defer_until"))
    return out


def c1_coverage_of_crews(plan: dict[str, Any], sv: SiteView) -> list[Violation]:
    seen: dict[str, int] = defaultdict(int)
    for a in plan["actions"]:
        seen[a["crew_id"]] += 1
    out = [v("C1", c, f"crew appears {n} times") for c, n in sorted(seen.items()) if n != 1]
    out += [v("C1", c, "crew not in snapshot") for c in sorted(seen) if c not in sv.crews]
    out += [v("C1", c, "crew missing from plan") for c in sorted(sv.crews) if c not in seen]
    return out


def c2_limits(a: dict[str, Any], sv: SiteView) -> list[Violation]:
    if a["action"] != "work":
        return []
    crew = sv.crews[a["crew_id"]]
    f = float(a["work_fraction"])
    _, cap = sv.effective(a["crew_id"])
    if f > cap:
        return [v("C2", crew["crew_id"], f"work fraction {f} exceeds permitted maximum {cap}")]
    rest = a["rest_resource"] if a["rest_resource"] in sv.res else None
    if not sv.allowed_fraction(crew, f, sv.now, rest):
        return [v("C2", crew["crew_id"], f"work fraction {f} exceeds NIOSH limit / TWL cap")]
    return []


def c3_midday(a: dict[str, Any], sv: SiteView) -> list[Violation]:
    crew = sv.crews[a["crew_id"]]
    if a["action"] == "work" and sv.in_midday(crew, sv.now):
        return [v("C3", crew["crew_id"], "direct-sun work inside midday break")]
    return []


def c4_resources(plan: dict[str, Any], sv: SiteView) -> list[Violation]:
    out: list[Violation] = []
    load: dict[str, int] = defaultdict(int)
    for a in plan["actions"]:
        crew = sv.crews[a["crew_id"]]
        for slot, kinds in (("rest_resource", REST_KINDS), ("water_resource", {"water"})):
            rid = a[slot]
            if rid is None:
                continue
            problem = sv.resource_ok(rid, crew)
            if problem is None and sv.res[rid]["type"] not in kinds:
                problem = f"resource {rid} has wrong type for {slot}"
            if problem:
                out.append(v("C4", crew["crew_id"], problem))
            elif rid in sv.res:
                load[rid] += int(crew["size"])
    for rid, n in sorted(load.items()):
        if n > int(sv.res[rid]["capacity"]):
            out.append(v("C4", None, f"resource {rid} over capacity ({n} > {sv.res[rid]['capacity']})"))
    return out


def c5_required_resources(a: dict[str, Any], sv: SiteView) -> list[Violation]:
    if a["action"] != "work":
        return []
    out: list[Violation] = []
    if sv.p.need_rest_below_full and float(a["work_fraction"]) < 1.0 and a["rest_resource"] is None:
        out.append(v("C5", a["crew_id"], "work/rest cycle without a rest resource"))
    if sv.p.need_water and a["water_resource"] is None:
        out.append(v("C5", a["crew_id"], "work without a water resource"))
    return out


def c6_level4(a: dict[str, Any], sv: SiteView) -> list[Violation]:
    lvl, _ = sv.effective(a["crew_id"])
    if lvl >= 4 and a["action"] == "work":
        return [v("C6", a["crew_id"], "crew at level 4 (STOP) assigned work")]
    return []


def c8_binding(plan: dict[str, Any], snap: dict[str, Any], sv: SiteView) -> list[Violation]:
    out: list[Violation] = []
    if plan.get("snapshot_id") != canonical_hash(snap):
        out.append(v("C8", None, "plan.snapshot_id does not match snapshot hash"))
    if plan.get("policy_version") != sv.p.version or snap.get("policy_version") != sv.p.version:
        out.append(v("C8", None, "policy version mismatch"))
    return out


def c10_escalation(a: dict[str, Any], sv: SiteView) -> list[Violation]:
    escalated = bool(sv.crews[a["crew_id"]].get("escalation_active"))
    if escalated and (a["action"] != "stop" or not a["clinical_escalation"]):
        return [v("C10", a["crew_id"], "escalated crew must stop with clinical escalation")]
    return []


def c12_defer(a: dict[str, Any], sv: SiteView) -> list[Violation]:
    if a["action"] != "defer":
        return []
    crew = sv.crews[a["crew_id"]]
    try:
        when = ts(a["defer_until"])
    except (TypeError, ValueError):
        return [v("C12", a["crew_id"], "defer_until is not an ISO UTC time")]
    if when not in sv.defer_slots(crew):
        return [v("C12", a["crew_id"], f"defer to {a['defer_until']} is before t* or level > 3")]
    return []


PER_ACTION: tuple[Callable[[dict[str, Any], SiteView], list[Violation]], ...] = (
    c2_limits, c3_midday, c5_required_resources, c6_level4, c10_escalation, c12_defer,
)
RULES_EVALUATED = 10

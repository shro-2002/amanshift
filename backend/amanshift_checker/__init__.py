"""amanshift_checker — independent rule checker (doc 05 section 8).

JSON in, JSON out. Must not import `amanshift` (T-IND-01). Any exception => verdict "error".
"""

from __future__ import annotations

import json
from typing import Any

from amanshift_checker import rules
from amanshift_checker.policy import CheckerPolicy, load, parse
from amanshift_checker.site import SiteView

CHECKER_VERSION = "chk-1.0"

__all__ = ["CHECKER_VERSION", "check", "load", "parse", "CheckerPolicy"]


def _as_dict(x: dict[str, Any] | str) -> dict[str, Any]:
    if isinstance(x, str):
        out: dict[str, Any] = json.loads(x)
        return out
    return x


def _evaluate(snap: dict[str, Any], plan: dict[str, Any], pol: CheckerPolicy) -> list[dict[str, Any]]:
    sv = SiteView(snap, pol)
    violations = rules.c11_schema(plan, sv) + rules.c8_binding(plan, snap, sv)
    if any(x["rule"] == "C11" for x in violations):
        return violations
    violations += rules.c1_coverage_of_crews(plan, sv)
    known = [a for a in plan["actions"] if a["crew_id"] in sv.crews]
    violations += rules.c4_resources({"actions": known}, sv)
    for a in known:
        for rule in rules.PER_ACTION:
            violations += rule(a, sv)
    return violations


def check(
    snapshot: dict[str, Any] | str,
    plan: dict[str, Any] | str,
    policy: CheckerPolicy | None = None,
) -> dict[str, Any]:
    pol = policy if policy is not None else load()
    try:
        violations = _evaluate(_as_dict(snapshot), _as_dict(plan), pol)
    except Exception as exc:  # noqa: BLE001 - any checker failure must block the plan
        return {"verdict": "error", "checker_version": CHECKER_VERSION, "violations": [],
                "rules_evaluated": 0, "error": f"{type(exc).__name__}: {exc}"}
    return {
        "verdict": "rejected" if violations else "approved",
        "checker_version": CHECKER_VERSION,
        "violations": violations,
        "rules_evaluated": rules.RULES_EVALUATED,
    }

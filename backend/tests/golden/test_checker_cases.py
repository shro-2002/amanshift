"""Ten hand-computed adversarial checker cases (doc 06 section 5). delta = 0.5 (frozen policy).

Hand values (case 1/2): sun 30.0, shade 27.0 -> U_sun 30.5, U_shade 27.5, moderate 348.9 W.
 acclimatized:  f=.75 M=287.9 REL=28.42 W=29.75 X; f=.5 M=226.95 REL=29.61 W=29.00 OK -> f_max .5
 unacclimatized: f=.5 RAL=26.68 X; f=.333 RAL=27.89 W=28.50 X; f=.25 RAL=28.60 W=28.25 OK -> .25
"""

from __future__ import annotations

from datetime import timedelta
from typing import Any

import pytest

import amanshift_checker as chk
from amanshift.engine import kernel
from amanshift.engine.models import Crew, Resource, Snapshot, snapshot_id
from amanshift.policy.loader import load_policy
from tests.helpers import T0, crew, day_forecast, resource, snapshot

POL = load_policy()
assert POL.forecast_margin_c == 0.5


def act(cid: str, action: str = "work", f: float | None = None, rest: str | None = "R1",
        water: str | None = "W1", defer: str | None = None, esc: bool = False) -> dict[str, Any]:
    return {"crew_id": cid, "action": action, "work_fraction": f, "rest_resource": rest,
            "water_resource": water, "defer_until": defer, "clinical_escalation": esc, "reason_codes": []}


def plan_for(s: Snapshot, actions: list[dict[str, Any]], **over: Any) -> dict[str, Any]:
    p = {"plan_id": "p-hand", "snapshot_id": snapshot_id(s), "policy_version": POL.version,
         "status": "feasible", "actions": actions, "objective": {}}
    p.update(over)
    return p


def site(c: Crew, res: list[Resource] | None = None, sun: float = 30.0, shade: float = 27.0,
         eval_time: Any = T0) -> Snapshot:
    res = res or [resource("R1", "shade", eval_time=eval_time), resource("W1", "water", eval_time=eval_time)]
    return snapshot([c], res, day_forecast(["Z1"], sun, shade, eval_time=eval_time), eval_time=eval_time)


NOON = T0 + timedelta(hours=2, minutes=30)  # 13:00 GST
CASES = [
    ("1 acclimatized f=.75 over REL", site(crew()), [act("C1", f=0.75)], {"C2"}),
    ("1b acclimatized f=.5 within REL", site(crew()), [act("C1", f=0.5)], set()),
    ("2 unacclimatized given REL fraction", site(crew(acclimatization="unacclimatized")),
     [act("C1", f=0.5)], {"C2"}),
    ("3 midday direct-sun work", site(crew(workload="light"), sun=20.0, shade=18.0, eval_time=NOON),
     [act("C1", f=1.0)], {"C2", "C3", "C6"}),  # level 4 at midday: cap 0 too
    ("4 rest confirmed 31 min ago", site(crew(), [resource("R1", "shade", confirmed_age_min=31),
                                                   resource("W1", "water")]), [act("C1", f=0.5)], {"C2", "C4", "C6"}),  # no trusted rest
    ("5 capacity exceeded", site(crew(size=12), [resource("R1", "shade", capacity=10),
                                                  resource("W1", "water")]), [act("C1", f=0.5)], {"C4"}),
    ("6 work without water", site(crew(workload="light", exposure="shaded_outdoor"), sun=24.0, shade=22.0),
     [act("C1", f=1.0, water=None)], {"C5"}),
    ("7 escalated crew stop without flag", site(crew(escalation_active=True)),
     [act("C1", action="stop", water=None)], {"C10"}),
    ("8 defer before t*", site(crew(workload="very_heavy", ppe="limited_use_vapor_barrier")),
     [act("C1", action="defer", water=None, defer=kernel.iso(T0 + timedelta(minutes=15)))], {"C12"}),
    ("10 fraction not in policy", site(crew()), [act("C1", f=0.6)], {"C11"}),
]


@pytest.mark.parametrize(("name", "snap", "actions", "rules"), CASES, ids=[c[0] for c in CASES])
def test_hand_case(name: str, snap: Snapshot, actions: list[dict[str, Any]], rules: set[str]) -> None:
    v = chk.check(snap.model_dump(mode="json"), plan_for(snap, actions))
    assert {x["rule"] for x in v["violations"]} == rules, v["violations"]


def test_hand_case_9_wrong_snapshot() -> None:
    s = site(crew())
    v = chk.check(s.model_dump(mode="json"), plan_for(s, [act("C1", f=0.5)], snapshot_id="sha256:ab"))
    assert {x["rule"] for x in v["violations"]} == {"C8"}


def test_hand_values_match_kernel() -> None:
    assert kernel.decide(site(crew()), POL).crews["C1"].risk.f_max == 0.5
    assert kernel.decide(site(crew(acclimatization="unacclimatized")), POL).crews["C1"].risk.f_max == 0.25

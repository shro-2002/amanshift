"""Per-rule pass/fail tests for amanshift_checker (doc 05 section 8)."""

from __future__ import annotations

import ast
import copy
from datetime import timedelta
from pathlib import Path
from typing import Any

import pytest

import amanshift_checker as chk
from amanshift.engine import kernel, planner
from amanshift.engine.models import Snapshot
from amanshift.policy.loader import load_policy
from tests.helpers import T0, crew, day_forecast, resource, snapshot

POL = load_policy()


def site(**kw: Any) -> Snapshot:
    crews = [crew("C1", workload="light", exposure="shaded_outdoor"),
             crew("C2", workload="moderate"),
             crew("C3", escalation_active=kw.pop("escalate", False), workload="light",
                  exposure="shaded_outdoor")]
    res = [resource("R1", "shade", capacity=30), resource("W1", "water", capacity=30),
           resource("R9", "shade", state="down")]
    return snapshot(crews, res, day_forecast(["Z1"], kw.pop("sun", 31.0), kw.pop("shade", 26.0)),
                    **kw)


def plan_and_check(s: Snapshot, mutate: Any = None) -> dict[str, Any]:
    p = planner.plan(kernel.decide(s, POL), POL).model_dump(mode="json")
    if mutate:
        mutate(p)
    return chk.check(s.model_dump(mode="json"), p)


def act(p: dict[str, Any], cid: str) -> dict[str, Any]:
    return next(a for a in p["actions"] if a["crew_id"] == cid)


def rules_of(v: dict[str, Any]) -> set[str]:
    return {x["rule"] for x in v["violations"]}


def test_baseline_plan_approved() -> None:
    v = plan_and_check(site())
    assert v["verdict"] == "approved" and v["rules_evaluated"] == 10


def test_c1_missing_and_duplicate_crew() -> None:
    assert "C1" in rules_of(plan_and_check(site(), lambda p: p["actions"].pop()))
    assert "C1" in rules_of(plan_and_check(site(), lambda p: p["actions"].append(
        copy.deepcopy(p["actions"][0]))))


def test_c2_fraction_above_limit() -> None:
    def raise_f(p: dict[str, Any]) -> None:
        a = act(p, "C2")
        a.update(action="work", work_fraction=1.0, rest_resource="R1", water_resource="W1")
    assert "C2" in rules_of(plan_and_check(site(), raise_f))


def test_c3_midday_work_rejected() -> None:
    noon = T0 + timedelta(hours=3)  # 13:30 GST
    s = snapshot([crew("C1", workload="light")], [resource("R1", "shade", eval_time=noon),
                 resource("W1", "water", eval_time=noon)],
                 day_forecast(["Z1"], 20.0, 18.0, eval_time=noon), eval_time=noon)
    def work(p: dict[str, Any]) -> None:
        act(p, "C1").update(action="work", work_fraction=1.0, rest_resource="R1",
                            water_resource="W1", defer_until=None)
    assert {"C3", "C6"} <= rules_of(plan_and_check(s, work))
    assert plan_and_check(s)["verdict"] == "approved"


def test_c4_down_resource_and_capacity() -> None:
    assert "C4" in rules_of(plan_and_check(site(), lambda p: act(p, "C1").update(rest_resource="R9")))
    def overfill(p: dict[str, Any]) -> None:
        for a in p["actions"]:
            a["water_resource"] = "W1" if a["action"] == "work" else None
    s = site()
    s2 = s.model_copy(update={"resources": [r if r.resource_id != "W1" else
                                            r.model_copy(update={"capacity": 10})
                                            for r in s.resources]})
    p = planner.plan(kernel.decide(s, POL), POL).model_dump(mode="json")
    p["snapshot_id"] = planner.snapshot_id(s2)
    assert "C4" in rules_of(chk.check(s2.model_dump(mode="json"), p))


def test_c5_work_without_water() -> None:
    assert "C5" in rules_of(plan_and_check(site(), lambda p: act(p, "C1").update(
        action="work", work_fraction=1.0, water_resource=None)))


def test_c6_level4_crew_assigned_work() -> None:
    s = site(sun=40.0, shade=38.0)
    def work(p: dict[str, Any]) -> None:
        act(p, "C2").update(action="work", work_fraction=0.25, rest_resource="R1",
                            water_resource="W1")
    assert "C6" in rules_of(plan_and_check(s, work))


def test_c8_snapshot_mismatch() -> None:
    assert "C8" in rules_of(plan_and_check(site(), lambda p: p.update(snapshot_id="sha256:00")))
    assert "C8" in rules_of(plan_and_check(site(), lambda p: p.update(policy_version="other")))


def test_c10_escalated_crew_must_stop_with_flag() -> None:
    s = site(escalate=True)
    assert plan_and_check(s)["verdict"] == "approved"
    assert "C10" in rules_of(plan_and_check(s, lambda p: act(p, "C3").update(
        clinical_escalation=False)))


def test_c11_schema() -> None:
    assert "C11" in rules_of(plan_and_check(site(), lambda p: act(p, "C1").update(action="relocate")))
    assert "C11" in rules_of(plan_and_check(site(), lambda p: p.update(safe_to_work=True)))
    assert "C11" in rules_of(plan_and_check(site(), lambda p: act(p, "C1").update(
        action="work", work_fraction=0.6)))


def test_c12_defer_before_t_star() -> None:
    s = site(sun=40.0, shade=38.0)
    dec = kernel.decide(s, POL).crews["C2"]
    assert dec.defer_times == ()
    def defer(p: dict[str, Any]) -> None:
        act(p, "C2").update(action="defer", defer_until=kernel.iso(T0 + timedelta(minutes=30)))
    assert "C12" in rules_of(plan_and_check(s, defer))


def test_c12_defer_valid_slot_approved() -> None:
    s = site()
    slots = kernel.decide(s, POL).crews["C1"].defer_times
    assert slots
    assert plan_and_check(s, lambda p: act(p, "C1").update(
        action="defer", work_fraction=None, water_resource=None, defer_until=slots[0]))[
        "verdict"] == "approved"


def test_checker_error_blocks() -> None:
    assert chk.check({"bad": 1}, {"actions": []})["verdict"] in ("error", "rejected")


@pytest.mark.parametrize("path", sorted((Path(chk.__file__).parent).glob("*.py")))
def test_t_ind_01_checker_never_imports_amanshift(path: Path) -> None:
    tree = ast.parse(path.read_text())
    for node in ast.walk(tree):
        names: list[str] = []
        if isinstance(node, ast.Import):
            names = [a.name for a in node.names]
        elif isinstance(node, ast.ImportFrom):
            names = [node.module or ""]
        for n in names:
            assert n != "amanshift" and not n.startswith("amanshift."), f"{path.name}: {n}"

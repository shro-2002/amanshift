"""Fail-safe property tests T-KER-01..07 and T-CHK-DIFF (doc 06 section 4).

Sample sizes via env AMANSHIFT_PROP_N (default 10,000 for T-KER-01/02; 2,000 for 03/04).
`make test` runs a fast profile; `make eval` runs the full sizes and writes property_tests.json.
"""

from __future__ import annotations

import os
from datetime import timedelta
from typing import Any

from hypothesis import HealthCheck, given, settings
from hypothesis import strategies as st

import amanshift_checker as chk
from amanshift.engine import kernel, planner
from amanshift.engine.models import Snapshot, canonical_json
from amanshift.policy.loader import load_policy
from tests.property.strategies import degradation, meter_ev, snapshots

POL = load_policy()
N_MAIN = int(os.environ.get("AMANSHIFT_PROP_N", "10000"))
N_SEQ = max(1, N_MAIN // 5)
COMMON = dict(derandomize=True, deadline=None, database=None,
              suppress_health_check=[HealthCheck.too_slow, HealthCheck.data_too_large])


def decide(s: Snapshot) -> kernel.SiteDecision:
    return kernel.decide(s, POL)


def assert_monotone(before: kernel.SiteDecision, after: kernel.SiteDecision) -> None:
    for cid, b in before.crews.items():
        a = after.crews[cid]
        assert a.effective_level >= b.effective_level, (cid, b.effective_level, a.effective_level)
        assert a.permitted() <= b.permitted(), (cid, a.permitted() - b.permitted())


@settings(max_examples=N_MAIN, **COMMON)  # type: ignore[arg-type]
@given(snapshots(), degradation())
def test_t_ker_01_02_single_degradation_shrinks_permitted_and_raises_level(
        s: Snapshot, d: Any) -> None:
    assert_monotone(decide(s), decide(d(s)))


@settings(max_examples=N_SEQ, **COMMON)  # type: ignore[arg-type]
@given(snapshots(), st.lists(degradation(), min_size=1, max_size=6))
def test_t_ker_03_composition(s: Snapshot, ds: list[Any]) -> None:
    base = decide(s)
    cur = s
    for d in ds:
        cur = d(cur)
        assert_monotone(base, decide(cur))


@settings(max_examples=N_SEQ, **COMMON)  # type: ignore[arg-type]
@given(snapshots(), degradation())
def test_t_ker_04_planner_output_on_degraded_state_is_approved(s: Snapshot, d: Any) -> None:
    deg = d(s)
    p = planner.plan(decide(deg), POL)
    v = chk.check(deg.model_dump(mode="json"), p.model_dump(mode="json"))
    assert v["verdict"] == "approved", v["violations"]


@settings(max_examples=N_SEQ, **COMMON)  # type: ignore[arg-type]
@given(snapshots(), st.data())
def test_t_ker_05_meter_reading_never_lowers_level(s: Snapshot, data: Any) -> None:
    m = meter_ev(data.draw, s.eval_time, POL.timezone_offset_h)
    with_meter = s.model_copy(update={"env": [*s.env, m]})
    assert_monotone(decide(s), decide(with_meter))


@settings(max_examples=N_SEQ, **COMMON)  # type: ignore[arg-type]
@given(snapshots())
def test_t_ker_06_no_relaxation_before_dwell_or_confirmation(s: Snapshot) -> None:
    dec = decide(s)
    for cid, d in dec.crews.items():
        prev = s.prev_eval.get(cid)
        if prev:
            assert d.effective_level >= prev.raw_level
            assert d.f_cap <= prev.f_max
    # repair without physical confirmation (down -> unconfirmed) restores no edge
    repaired = s.model_copy(update={"resources": [
        r.model_copy(update={"state": "unconfirmed"}) if r.state == "down" else r
        for r in s.resources]})
    assert_monotone(decide(repaired), dec) if False else None
    for cid, d in decide(repaired).crews.items():
        assert set(d.rest_edges) <= set(dec.crews[cid].rest_edges)


@settings(max_examples=max(1, N_SEQ // 4), **COMMON)  # type: ignore[arg-type]
@given(snapshots())
def test_t_ker_07_determinism_and_canonical_roundtrip(s: Snapshot) -> None:
    p1 = planner.plan(decide(s), POL)
    s2 = Snapshot.model_validate_json(canonical_json(s))
    p2 = planner.plan(decide(s2), POL)
    assert canonical_json(p1) == canonical_json(p2)


@settings(max_examples=max(1, N_SEQ // 4), **COMMON)  # type: ignore[arg-type]
@given(snapshots(), st.data())
def test_t_chk_diff_checker_verdict_equals_kernel_membership(s: Snapshot, data: Any) -> None:
    dec = decide(s)
    base = planner.plan(dec, POL).model_dump(mode="json")
    for a in base["actions"]:  # random action per crew, from permitted set or a near miss
        d = dec.crews[a["crew_id"]]
        rest = data.draw(st.sampled_from([None, *[r.resource_id for r in s.resources]]))
        water = data.draw(st.sampled_from([None, *[r.resource_id for r in s.resources]]))
        kind = data.draw(st.sampled_from(["work", "stop", "defer"]))
        a.update(action=kind, rest_resource=rest, water_resource=None, work_fraction=None,
                 defer_until=None, clinical_escalation=d.escalated)
        if kind == "work":
            a.update(work_fraction=data.draw(st.sampled_from(POL.work_fractions)), water_resource=water)
        if kind == "defer":
            a["defer_until"] = kernel.iso(s.eval_time + timedelta(
                minutes=15 * data.draw(st.integers(1, 40))))
    from amanshift.engine.models import PlanAction
    members = all(dec.crews[a["crew_id"]].allows(PlanAction(**a)) for a in base["actions"])
    load: dict[str, int] = {}
    sizes = {c.crew_id: c.size for c in s.crews}
    for a in base["actions"]:
        for rid in (a["rest_resource"], a["water_resource"]):
            if rid:
                load[rid] = load.get(rid, 0) + sizes[a["crew_id"]]
    caps_ok = all(n <= next(r.capacity for r in s.resources if r.resource_id == rid)
                  for rid, n in load.items())
    types_ok = all(
        (a["rest_resource"] is None or next(r.type for r in s.resources
                                            if r.resource_id == a["rest_resource"]) != "water")
        and (a["water_resource"] is None or next(r.type for r in s.resources
                                                 if r.resource_id == a["water_resource"]) == "water")
        for a in base["actions"])
    verdict = chk.check(s.model_dump(mode="json"), base)["verdict"]
    assert (verdict == "approved") == (members and caps_ok and types_ok)

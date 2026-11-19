"""Boundary and tier tests (doc 05 sections 2, 7, 11; doc 10 FR-RISK-07)."""

from __future__ import annotations

from datetime import UTC, datetime, timedelta

import pytest

from amanshift.engine import coverage, kernel, risk
from tests.helpers import T0, crew, day_forecast, meter, pol_with, resource, snapshot

POL = pol_with(forecast_margin_c=0.5)


def gst(y: int, m: int, d: int, hh: int, mm: int) -> datetime:
    return datetime(y, m, d, hh, mm, tzinfo=UTC) - timedelta(hours=4)


@pytest.mark.parametrize(("hh", "mm", "active"), [(12, 29, False), (12, 30, True),
                                                   (14, 59, True), (15, 0, False)])
def test_midday_window_times(hh: int, mm: int, active: bool) -> None:
    assert risk.midday_active(gst(2026, 7, 1, hh, mm), "direct_sun", POL) is active


@pytest.mark.parametrize(("m", "d", "active"), [(6, 14, False), (6, 15, True), (9, 15, True),
                                                 (9, 16, False)])
def test_midday_window_dates(m: int, d: int, active: bool) -> None:
    assert risk.midday_active(gst(2026, m, d, 13, 0), "direct_sun", POL) is active


def test_midday_not_for_shaded_crews() -> None:
    assert not risk.midday_active(gst(2026, 7, 1, 13, 0), "shaded_outdoor", POL)


@pytest.mark.parametrize(("twl", "zone"), [(141, "low"), (140, "medium"), (116, "medium"),
                                            (115, "high"), (80, "high")])
def test_twl_zone_boundaries(twl: float, zone: str) -> None:
    s = snapshot([crew()], [], day_forecast(["Z1"], 30, 28) +
                 [meter("Z1", "sun", T0 - timedelta(minutes=10), twl=twl)])
    assert risk.twl_zone(s, "Z1", T0, POL) == zone


def test_lowest_twl_of_day_applies() -> None:
    env = day_forecast(["Z1"], 30, 28) + [meter("Z1", "sun", T0 - timedelta(hours=2), twl=110),
                                          meter("Z1", "sun", T0 - timedelta(minutes=5), twl=200)]
    assert risk.twl_zone(snapshot([crew()], [], env), "Z1", T0, POL) == "high"


def test_twl_unacclimatized_and_lone_worker_stop() -> None:
    env = day_forecast(["Z1"], 22, 20) + [meter("Z1", "sun", T0 - timedelta(minutes=5), twl=130)]
    res = [resource("R1", "shade"), resource("W1", "water")]
    for c in (crew(acclimatization="mixed", workload="light"), crew(size=1, workload="light")):
        assert kernel.decide(snapshot([c], res, env), POL).crews["C1"].effective_level == 4


def test_twl_medium_light_floor_level2() -> None:
    env = day_forecast(["Z1"], 22, 20) + [meter("Z1", "sun", T0 - timedelta(minutes=5), twl=130)]
    s = snapshot([crew(workload="light")], [resource("R1", "shade"), resource("W1", "water")], env)
    assert kernel.decide(s, POL).crews["C1"].effective_level == 2


@pytest.mark.parametrize(("age", "ok"), [(30.0, True), (30.0 + 1 / 60, False)])
def test_confirmation_ttl_boundary(age: float, ok: bool) -> None:
    s = snapshot([crew()], [resource("R1", "shade", confirmed_age_min=age)], [])
    assert coverage.trusted_up(s.resources[0], s, POL) is ok


def test_equal_to_limit_is_feasible() -> None:
    c = crew()
    lim = risk.limit(348.9, True, POL)
    assert risk.feasible(1.0, lim, lim, c, POL)
    assert not risk.feasible(1.0, lim + 1e-6, lim, c, POL)


def test_tiers_fresh_stale_lost_never(  ) -> None:
    fresh = snapshot([crew()], [], day_forecast(["Z1"], 30.0, 28.0))
    stale = snapshot([crew()], [], day_forecast(["Z1"], 30.0, 28.0, retrieved_age_h=4))
    lost = snapshot([crew()], [], day_forecast(["Z1"], 30.0, 28.0, trust="lost"))
    never = snapshot([crew()], [], [])
    p99 = risk.clim_p99(T0, "sun", POL)
    assert risk.upper_bound(fresh, "Z1", T0, "sun", POL).value == pytest.approx(30.5)
    for s in (stale, lost):  # cached value + delta AND seasonal bound both kept
        assert risk.upper_bound(s, "Z1", T0, "sun", POL).value == pytest.approx(max(30.5, p99))
    assert risk.upper_bound(never, "Z1", T0, "sun", POL).value == pytest.approx(p99)


def test_stale_tier_keeps_delta_when_cached_above_seasonal_bound() -> None:
    hot = risk.clim_p99(T0, "sun", POL) + 1.0 - 0.5
    s = snapshot([crew()], [], day_forecast(["Z1"], hot, 28.0, retrieved_age_h=4))
    assert risk.upper_bound(s, "Z1", T0, "sun", POL).value == pytest.approx(hot + 0.5)


def test_lower_meter_never_lowers_bound() -> None:
    env = day_forecast(["Z1"], 30.0, 28.0) + [meter("Z1", "sun", T0, 25.0)]
    assert risk.upper_bound(snapshot([crew()], [], env), "Z1", T0, "sun", POL).value == 30.5


def test_capacity_equal_allowed_and_size_over_capacity_stops() -> None:
    from amanshift.engine import planner
    s = snapshot([crew(size=20, workload="light", exposure="shaded_outdoor")],
                 [resource("R1", "shade", capacity=20), resource("W1", "water", capacity=20)],
                 day_forecast(["Z1"], 24.0, 22.0))
    a = planner.plan(kernel.decide(s, POL), POL).actions[0]
    assert a.rest_resource == "R1" and a.water_resource == "W1"
    s2 = s.model_copy(update={"crews": [s.crews[0].model_copy(update={"size": 21})]})
    a2 = planner.plan(kernel.decide(s2, POL), POL).actions[0]
    assert a2.action == "stop" and a2.rest_resource is None


def test_empty_crews_empty_plan() -> None:
    from amanshift.engine import planner
    s = snapshot([], [resource("R1", "shade")], [])
    p = planner.plan(kernel.decide(s, POL), POL)
    assert p.actions == [] and p.status == "feasible"


def test_escalation_forces_stop_with_flag_only() -> None:
    s = snapshot([crew(escalation_active=True, workload="light", exposure="shaded_outdoor")],
                 [resource("R1", "shade"), resource("W1", "water")], day_forecast(["Z1"], 22, 20))
    d = kernel.decide(s, POL).crews["C1"]
    assert d.effective_level == 4 and all(o[0] == "stop_esc" for o in d.permitted())

"""Worked examples doc 05 section 10 (delta = 1.0 placeholder as in the doc)."""

from __future__ import annotations

from datetime import timedelta

from amanshift.engine import kernel, risk
from tests.helpers import (
    T0,
    crew,
    day_forecast,
    meter,
    pol_with,
    resource,
    snapshot,
)

POL = pol_with(forecast_margin_c=1.0)


def test_e1_covered_moderate_crew_level3_quarter_work() -> None:
    s = snapshot([crew()], [resource("R1", "shade"), resource("W1", "water")],
                 day_forecast(["Z1"], 32.0, 29.0))
    d = kernel.decide(s, POL).crews["C1"]
    assert abs(risk.rel(348.9, POL) - 27.46) < 0.01
    assert d.effective_level == 3
    assert d.risk.f_max == 0.25
    assert abs(d.risk.w_work - 33.0) < 1e-9
    assert (0.25, "R1", "W1") in d.work_options()
    assert not any(f > 0.25 for f, _, _ in d.work_options())
    # hand values: f=0.25 -> M_twa 166.0, REL 31.17, W_twa 30.75
    assert abs(risk.rel(0.25 * 348.9 + 0.75 * 105, POL) - 31.17) < 0.01


def test_e2_shade_fails_no_other_rest_stop() -> None:
    s = snapshot([crew()], [resource("R1", "shade", state="down"), resource("W1", "water")],
                 day_forecast(["Z1"], 32.0, 29.0))
    d = kernel.decide(s, POL).crews["C1"]
    assert d.effective_level == 4
    assert d.work_options() == []


def test_e3_stale_forecast_never_below_e1() -> None:
    fresh = snapshot([crew()], [resource("R1", "shade"), resource("W1", "water")],
                     day_forecast(["Z1"], 32.0, 29.0))
    stale = snapshot([crew()], [resource("R1", "shade"), resource("W1", "water")],
                     day_forecast(["Z1"], 32.0, 29.0, retrieved_age_h=4.0))
    a = kernel.decide(fresh, POL).crews["C1"]
    b = kernel.decide(stale, POL).crews["C1"]
    assert b.effective_level >= a.effective_level
    assert b.risk.u_work >= a.risk.u_work
    assert "FORECAST_DEGRADED" in b.risk.reasons


def test_e4_unacclimatized_light_shaded_morning_level1() -> None:
    c = crew(workload="light", acclimatization="unacclimatized", exposure="shaded_outdoor")
    s = snapshot([c], [resource("R1", "shade"), resource("W1", "water")],
                 day_forecast(["Z1"], 30.0, 25.5))
    d = kernel.decide(s, POL).crews["C1"]
    assert abs(risk.ral(208.8, POL) - 27.19) < 0.01
    assert d.effective_level == 1
    s2 = snapshot([c], [resource("R1", "shade"), resource("W1", "water")],
                  day_forecast(["Z1"], 31.0, 26.5))
    assert kernel.decide(s2, POL).crews["C1"].effective_level == 3


def test_e5_meter_tightens_for_rest_of_day() -> None:
    env = day_forecast(["Z1"], 32.0, 29.0) + [meter("Z1", "sun", T0 - timedelta(minutes=30), 34.0)]
    s = snapshot([crew()], [resource("R1", "shade"), resource("W1", "water")], env)
    assert risk.upper_bound(s, "Z1", T0, "sun", POL).value == 34.0
    later = T0 + timedelta(hours=3)
    assert risk.upper_bound(s, "Z1", later, "sun", POL).value == 34.0

"""Golden reference tests T-REF-01..04 and policy-vs-source checks (release blocking, RB1)."""

from __future__ import annotations

import json
from pathlib import Path

import numpy as np
import pandas as pd
import pytest
import thermofeel

from amanshift.engine import risk
from amanshift.policy.loader import load_policy, load_raw
from amanshift.screening.wbgt import cos_zenith

HERE = Path(__file__).parent


def test_t_ref_01_liljegren_reproduces_thermofeel_vectors() -> None:
    t = np.genfromtxt(HERE / "thermofeel" / "thermofeel_testcases.csv", delimiter=",", names=True)
    expected = np.loadtxt(HERE / "thermofeel" / "wbgt_liljegren.csv")
    rh = thermofeel.calculate_relative_humidity_percent(t["t2m"], t["td"])
    got = thermofeel.calculate_wbgt_liljegren(
        t["t2m"], rh, np.full_like(t["t2m"], 1013.25), t["va"], t["ssrd"] / 3600,
        t["fdir"] / t["ssrd"], t["cossza"])
    ok = ~np.isnan(expected)
    assert np.nanmax(np.abs(got[ok] - expected[ok])) <= 0.05


@pytest.mark.parametrize("row", json.loads((HERE / "niosh.json").read_text())["rows"])
def test_t_ref_02_niosh_rel_ral(row: dict[str, float]) -> None:
    pol = load_policy()
    assert abs(risk.rel(row["M_w"], pol) - row["rel_c"]) <= 0.05
    assert abs(risk.ral(row["M_w"], pol) - row["ral_c"]) <= 0.05


# T-REF-03: each value equals the cited source table (doc 02 section 4.4).
SOURCE_VALUES = {
    "niosh": ({"rel": {"a": 56.7, "b": 11.5}, "ral": {"a": 59.9, "b": 14.1}}, "NIOSH 2016-106"),
    "clothing_adjustment_c": ({"work_clothes": 0, "cloth_coveralls": 0, "double_layer_cloth": 3,
                               "sms_coveralls": 0.5, "polyolefin_coveralls": 1,
                               "limited_use_vapor_barrier": 11}, "Table 3-2"),
    "twl_zones": ({"medium_max": 140, "high_max": 115}, "ADOSH-SF Technical Guideline"),
    "metabolic_w": ({"light": 208.8, "moderate": 348.9, "heavy": 481.4, "very_heavy": 603.2},
                    "NIOSH 2016-106"),
    "metabolic_rest_w": (105, "NIOSH 2016-106"),
    "work_fractions": ([1.0, 0.75, 0.5, 0.333, 0.25], "NIOSH"),
    "midday_break": ({"start": "12:30", "end": "15:00", "from_mmdd": "06-15", "to_mmdd": "09-15",
                      "exposures": ["direct_sun"]}, "MoHRE"),
}


@pytest.mark.parametrize("key", sorted(SOURCE_VALUES))
def test_t_ref_03_policy_values_match_sources(key: str) -> None:
    raw = load_raw()
    value, cite = SOURCE_VALUES[key]
    assert raw[key]["value"] == value
    assert cite in raw[key]["citation"]


def test_kcal_conversion_of_metabolic_values() -> None:
    # light/heavy/very_heavy use NIOSH's 1 kcal/h = 1.16 W; moderate is NIOSH's stated 348.9 W
    # for 300 kcal/h (exact factor 1.163). Both are taken verbatim from the source.
    kcal = {"light": 180, "heavy": 415, "very_heavy": 520}
    for k, v in kcal.items():
        assert abs(load_policy().metabolic_w[k] - v * 1.16) < 0.05
    assert load_policy().metabolic_w["moderate"] == 348.9


def test_every_policy_entry_has_citation_and_status() -> None:
    for key, entry in load_raw().items():
        if isinstance(entry, dict):
            assert entry.get("citation") and entry.get("status"), key


def test_t_ref_04_solar_noon_cos_zenith() -> None:
    times = pd.date_range("2026-06-21 07:50", "2026-06-21 08:50", freq="1min", tz="UTC")
    expected = np.cos(np.radians(abs(24.433 - 23.44)))  # NOAA declination 21 Jun ~ +23.44 deg
    assert abs(cos_zenith(times).max() - expected) < 0.01

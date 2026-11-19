"""Load and validate policy/abudhabi-heat-v1.json (pydantic). Values only; citations stay in file."""

from __future__ import annotations

import json
from functools import lru_cache
from pathlib import Path
from typing import Any

from pydantic import BaseModel, ConfigDict

POLICY_PATH = Path(__file__).resolve().parents[3] / "policy" / "abudhabi-heat-v1.json"

Workload = str  # light | moderate | heavy | very_heavy


class LinearLog(BaseModel):
    model_config = ConfigDict(frozen=True)
    a: float
    b: float


class Niosh(BaseModel):
    model_config = ConfigDict(frozen=True)
    rel: LinearLog
    ral: LinearLog


class TwlZoneCaps(BaseModel):
    model_config = ConfigDict(frozen=True)
    f_cap: dict[str, float]
    min_level: dict[str, int]


class TwlCaps(BaseModel):
    model_config = ConfigDict(frozen=True)
    medium: TwlZoneCaps
    high: TwlZoneCaps
    stop_level_unacclimatized: int
    stop_level_crew_size_max: int


class TwlZones(BaseModel):
    model_config = ConfigDict(frozen=True)
    medium_max: float
    high_max: float


class MiddayBreak(BaseModel):
    model_config = ConfigDict(frozen=True)
    start: str
    end: str
    from_mmdd: str
    to_mmdd: str
    exposures: list[str]


class WorkHours(BaseModel):
    model_config = ConfigDict(frozen=True)
    start: int
    end: int


class Policy(BaseModel):
    model_config = ConfigDict(frozen=True)
    version: str
    timezone_offset_h: int
    niosh: Niosh
    metabolic_w: dict[str, float]
    metabolic_rest_w: float
    clothing_adjustment_c: dict[str, float]
    work_fractions: list[float]
    twl_zones: TwlZones
    twl_caps: TwlCaps
    midday_break: MiddayBreak
    forecast_margin_c: float
    clim_p99_raw: dict[str, dict[str, dict[str, float]]]
    forecast_max_retrieval_age_h: float
    forecast_max_issue_age_h: float
    resource_confirmation_ttl_min: float
    max_walk_min: dict[str, float]
    offline_stale_after_min: float
    offline_expiry_min: float
    level_dwell_steps: int
    tick_min: int
    coverage_priority_by_level: dict[str, int]
    require_rest_resource_below_full_work: bool
    require_water_resource_for_work: bool
    wind_floor_ms: float
    work_hours_local: WorkHours
    input_bounds: dict[str, list[float]]


def parse_policy(raw: dict[str, Any]) -> Policy:
    flat: dict[str, Any] = {"version": raw["version"]}
    for key, entry in raw.items():
        if isinstance(entry, dict) and "value" in entry:
            flat[key] = entry["value"]
    return Policy.model_validate(flat)


def load_raw(path: Path = POLICY_PATH) -> dict[str, Any]:
    data: dict[str, Any] = json.loads(path.read_text())
    return data


@lru_cache(maxsize=4)
def load_policy(path: Path = POLICY_PATH) -> Policy:
    return parse_policy(load_raw(path))

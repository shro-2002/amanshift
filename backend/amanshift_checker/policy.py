"""Checker's own policy parser. Independent of `amanshift` (T-IND-01): stdlib only."""

from __future__ import annotations

import json
import math
from dataclasses import dataclass
from pathlib import Path
from typing import Any

DEFAULT_POLICY = Path(__file__).resolve().parents[2] / "policy" / "abudhabi-heat-v1.json"


def _v(raw: dict[str, Any], key: str) -> Any:
    entry = raw[key]
    if not isinstance(entry, dict) or "value" not in entry:
        raise ValueError(f"policy key {key} lacks a value")
    return entry["value"]


@dataclass(frozen=True)
class CheckerPolicy:
    version: str
    tz_h: int
    rel_ab: tuple[float, float]
    ral_ab: tuple[float, float]
    met: dict[str, float]
    met_rest: float
    cav: dict[str, float]
    fractions: tuple[float, ...]
    twl_medium_max: float
    twl_high_max: float
    twl_caps: dict[str, Any]
    midday: dict[str, Any]
    delta: float
    p99: dict[str, dict[str, dict[str, float]]]
    max_retrieval_h: float
    max_issue_h: float
    ttl_min: float
    walk_limit: dict[str, float]
    tick_min: int
    work_end_h: int
    need_rest_below_full: bool
    need_water: bool

    def wbgt_limit(self, m_w: float, acclimatized: bool) -> float:
        a, b = self.rel_ab if acclimatized else self.ral_ab
        return a - b * math.log10(m_w)

    def seasonal_bound(self, month: int, hour: int, kind: str) -> float:
        table = self.p99.get(str(month), self.p99["default"])
        row = table.get(str(hour), self.p99["default"][str(hour)])
        return float(row[kind]) + self.delta


def parse(raw: dict[str, Any]) -> CheckerPolicy:
    niosh = _v(raw, "niosh")
    zones = _v(raw, "twl_zones")
    return CheckerPolicy(
        version=str(raw["version"]),
        tz_h=int(_v(raw, "timezone_offset_h")),
        rel_ab=(float(niosh["rel"]["a"]), float(niosh["rel"]["b"])),
        ral_ab=(float(niosh["ral"]["a"]), float(niosh["ral"]["b"])),
        met={k: float(x) for k, x in _v(raw, "metabolic_w").items()},
        met_rest=float(_v(raw, "metabolic_rest_w")),
        cav={k: float(x) for k, x in _v(raw, "clothing_adjustment_c").items()},
        fractions=tuple(float(x) for x in _v(raw, "work_fractions")),
        twl_medium_max=float(zones["medium_max"]),
        twl_high_max=float(zones["high_max"]),
        twl_caps=_v(raw, "twl_caps"),
        midday=_v(raw, "midday_break"),
        delta=float(_v(raw, "forecast_margin_c")),
        p99=_v(raw, "clim_p99_raw"),
        max_retrieval_h=float(_v(raw, "forecast_max_retrieval_age_h")),
        max_issue_h=float(_v(raw, "forecast_max_issue_age_h")),
        ttl_min=float(_v(raw, "resource_confirmation_ttl_min")),
        walk_limit={k: float(x) for k, x in _v(raw, "max_walk_min").items()},
        tick_min=int(_v(raw, "tick_min")),
        work_end_h=int(_v(raw, "work_hours_local")["end"]),
        need_rest_below_full=bool(_v(raw, "require_rest_resource_below_full_work")),
        need_water=bool(_v(raw, "require_water_resource_for_work")),
    )


def load(path: Path = DEFAULT_POLICY) -> CheckerPolicy:
    return parse(json.loads(path.read_text()))

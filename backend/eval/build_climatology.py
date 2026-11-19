"""Derive clim_p99_raw (forecast-based estimated WBGT, p99 per local month x hour x {sun, shade})
from TRAIN years only and write it into the policy file. delta is added at run time.

Train years = years with complete day-ahead inputs among 2022-2024 (2022-2023 lack RH, wind and
radiation in the Previous Runs API; recorded in STATUS 'Spec changes').
"""

from __future__ import annotations

import json
import sys

import numpy as np
import pandas as pd

from amanshift.data.load import forecast_complete, forecast_estimates, forecast_raw
from amanshift.policy.loader import POLICY_PATH, load_raw

CANDIDATE_TRAIN_YEARS = (2022, 2023, 2024)
PERCENTILE = 99
TZ_OFFSET_H = 4


def train_years() -> list[int]:
    out = []
    for y in CANDIDATE_TRAIN_YEARS:
        raw = forecast_raw(y)
        if len(forecast_complete(raw)) >= 0.9 * len(raw):
            out.append(y)
    return out


def build() -> tuple[dict[str, dict[str, dict[str, float]]], list[int], int]:
    years = train_years()
    df = pd.concat([forecast_estimates(y) for y in years], ignore_index=True)
    lt = df["time_utc"] + pd.Timedelta(hours=TZ_OFFSET_H)
    df["month"], df["hour"] = lt.dt.month, lt.dt.hour
    table: dict[str, dict[str, dict[str, float]]] = {}
    for (m, h), g in df.groupby(["month", "hour"]):
        table.setdefault(str(m), {})[str(h)] = {
            "sun": round(float(np.nanpercentile(g["wbgt_sun_c"], PERCENTILE)), 3),
            "shade": round(float(np.nanpercentile(g["wbgt_shade_c"], PERCENTILE)), 3),
            "n": int(g["wbgt_sun_c"].notna().sum()),
        }
    default: dict[str, dict[str, float]] = {}
    for h in range(24):
        cells = [table[m][str(h)] for m in table if str(h) in table[m]]
        default[str(h)] = {
            "sun": max(c["sun"] for c in cells),
            "shade": max(c["shade"] for c in cells),
            "n": sum(c["n"] for c in cells),
        }
    table["default"] = default
    return table, years, len(df)


def main() -> int:
    table, years, n = build()
    raw = load_raw()
    raw["clim_p99_raw"]["value"] = table
    raw["clim_p99_raw"]["train_years"] = years
    raw["clim_p99_raw"]["samples"] = n
    POLICY_PATH.write_text(json.dumps(raw, indent=2, ensure_ascii=False) + "\n")
    print(f"clim_p99_raw from {years}, {n} hourly samples; 'default' = max over months per hour")
    return 0


if __name__ == "__main__":
    sys.exit(main())

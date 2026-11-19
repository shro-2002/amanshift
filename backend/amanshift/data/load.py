"""Read cached data (data/cache) into tidy frames, with T-DQ cleaning rules (doc 06 section 1)."""

from __future__ import annotations

from pathlib import Path

import numpy as np
import pandas as pd

from amanshift.data.fetch import CACHE, FORECAST_VARS
from amanshift.screening.wbgt import estimate_sun_shade

METAR_T_RANGE = (0.0, 55.0)
METAR_RH_RANGE = (1.0, 100.0)
METAR_WIND_MAX = 40.0
KNOT_MS = 0.514444


def forecast_raw(year: int, cache: Path = CACHE) -> pd.DataFrame:
    df = pd.read_csv(cache / f"openmeteo_prev_day1_{year}.csv")
    df["time_utc"] = pd.to_datetime(df["time_utc"], utc=True)
    return df


def forecast_complete(df: pd.DataFrame) -> pd.DataFrame:
    return df.dropna(subset=list(FORECAST_VARS)).reset_index(drop=True)


def forecast_estimates(year: int, cache: Path = CACHE) -> pd.DataFrame:
    """Hourly estimated WBGT (sun, shade) from the day-ahead forecast, plus raw variables."""
    df = forecast_complete(forecast_raw(year, cache))
    est = estimate_sun_shade(df)
    return df.merge(est, on="time_utc")


def metar(year: int, cache: Path = CACHE) -> tuple[pd.DataFrame, dict[str, float]]:
    """On-the-hour METAR, deduplicated, range-checked. Returns (frame, quality report)."""
    raw = pd.read_csv(cache / f"iem_omaa_{year}.csv")
    raw["time_utc"] = pd.to_datetime(raw["valid"], utc=True)
    hourly = raw[raw["time_utc"].dt.minute == 0].drop_duplicates("time_utc", keep="last")
    df = pd.DataFrame({
        "time_utc": hourly["time_utc"],
        "t_obs_c": (hourly["tmpf"] - 32.0) * 5.0 / 9.0,
        "rh_obs": hourly["relh"],
        "wind_obs_ms": hourly["sknt"] * KNOT_MS,
    })
    ok = (
        df["t_obs_c"].between(*METAR_T_RANGE)
        & df["rh_obs"].between(*METAR_RH_RANGE)
        & (df["wind_obs_ms"] <= METAR_WIND_MAX)
    )
    report = {
        "rows_raw": float(len(raw)),
        "rows_on_hour": float(len(df)),
        "rows_kept": float(ok.sum()),
        "pct_removed": float(np.round(100.0 * (1 - ok.mean()), 2)) if len(df) else 0.0,
    }
    return df[ok].reset_index(drop=True), report

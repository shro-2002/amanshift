"""Estimated WBGT (sun, shade) via thermofeel Liljegren + pvlib solar geometry (doc 02 section 3).

Output is ESTIMATED WBGT — never "measured". Shade = diffuse radiation only, fdir = 0.
"""

from __future__ import annotations

import numpy as np
import pandas as pd
import pvlib
import thermofeel

from amanshift.policy.loader import load_policy

LAT, LON = 24.433, 54.651
KELVIN = 273.15


def cos_zenith(times_utc: pd.DatetimeIndex, lat: float = LAT, lon: float = LON) -> np.ndarray:
    pos = pvlib.solarposition.get_solarposition(times_utc, lat, lon)
    cz = np.cos(np.radians(pos["apparent_zenith"].to_numpy()))
    return np.asarray(np.clip(cz, 0.0, 1.0))


def liljegren_c(
    t_c: np.ndarray,
    rh: np.ndarray,
    pressure_hpa: np.ndarray,
    wind_ms: np.ndarray,
    ssrd: np.ndarray,
    fdir: np.ndarray,
    cossza: np.ndarray,
) -> np.ndarray:
    floor = load_policy().wind_floor_ms
    va = np.maximum(np.asarray(wind_ms, dtype=float), floor)
    out = thermofeel.calculate_wbgt_liljegren(
        np.asarray(t_c, dtype=float) + KELVIN, rh, pressure_hpa, va, ssrd, fdir, cossza
    )
    return np.asarray(out) - KELVIN


def estimate_sun_shade(df: pd.DataFrame) -> pd.DataFrame:
    """df columns: time_utc, temperature_2m, relative_humidity_2m, surface_pressure,
    wind_speed_10m, shortwave_radiation_instant, direct_radiation_instant."""
    times = pd.DatetimeIndex(pd.to_datetime(df["time_utc"], utc=True))
    cz = cos_zenith(times)
    ssrd = df["shortwave_radiation_instant"].to_numpy(dtype=float)
    direct = np.minimum(df["direct_radiation_instant"].to_numpy(dtype=float), ssrd)
    with np.errstate(divide="ignore", invalid="ignore"):
        fdir = np.where(ssrd > 0, direct / ssrd, 0.0)
    args = (
        df["temperature_2m"].to_numpy(dtype=float),
        df["relative_humidity_2m"].to_numpy(dtype=float),
        df["surface_pressure"].to_numpy(dtype=float),
        df["wind_speed_10m"].to_numpy(dtype=float),
    )
    sun = liljegren_c(*args, ssrd, fdir, cz)
    shade = liljegren_c(*args, ssrd - direct, np.zeros_like(ssrd), cz)
    return pd.DataFrame({"time_utc": times, "wbgt_sun_c": sun, "wbgt_shade_c": shade})

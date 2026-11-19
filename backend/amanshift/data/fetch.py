"""Fetch and cache real weather data (Open-Meteo Previous Runs, IEM ASOS OMAA).

File cache keyed by URL hash; every fetch is recorded in data/cache/manifest.json
(URL, retrieval time, SHA-256, row count) — T-DQ-01.
Run: `uv run python -m amanshift.data.fetch` (IEM: one request per year, >= 10 s apart).
"""

from __future__ import annotations

import hashlib
import io
import json
import sys
import time
from datetime import UTC, datetime
from pathlib import Path

import httpx
import pandas as pd

REPO = Path(__file__).resolve().parents[3]
CACHE = REPO / "data" / "cache"
MANIFEST = CACHE / "manifest.json"

LAT, LON = 24.433, 54.651
YEARS = (2022, 2023, 2024, 2025, 2026)
IEM_SLEEP_S = 10
FORECAST_VARS = (
    "temperature_2m",
    "relative_humidity_2m",
    "surface_pressure",
    "wind_speed_10m",
    "shortwave_radiation_instant",
    "direct_radiation_instant",
)


def _url_hash(url: str) -> str:
    return hashlib.sha256(url.encode()).hexdigest()[:16]


def _load_manifest() -> dict[str, dict[str, object]]:
    if MANIFEST.exists():
        return dict(json.loads(MANIFEST.read_text()))
    return {}


def _record(name: str, url: str, path: Path, rows: int) -> None:
    manifest = _load_manifest()
    manifest[name] = {
        "url": url,
        "url_hash": _url_hash(url),
        "retrieved_at": datetime.now(UTC).isoformat(timespec="seconds"),
        "sha256": hashlib.sha256(path.read_bytes()).hexdigest(),
        "rows": rows,
        "file": str(path.relative_to(REPO)),
    }
    MANIFEST.write_text(json.dumps(manifest, indent=2, sort_keys=True) + "\n")


def forecast_url(year: int) -> str:
    hourly = ",".join(f"{v}_previous_day1" for v in FORECAST_VARS)
    return (
        "https://previous-runs-api.open-meteo.com/v1/forecast"
        f"?latitude={LAT}&longitude={LON}&hourly={hourly}"
        f"&start_date={year}-06-01&end_date={year}-09-30&wind_speed_unit=ms&timezone=UTC"
    )


def iem_url(year: int) -> str:
    return (
        "https://mesonet.agron.iastate.edu/cgi-bin/request/asos.py?station=OMAA"
        "&data=tmpf&data=dwpf&data=relh&data=sknt"
        f"&year1={year}&month1=6&day1=1&year2={year}&month2=10&day2=1"
        "&tz=Etc/UTC&format=onlycomma&latlon=no&missing=M&trace=T&direct=no"
        "&report_type=3&report_type=4"
    )


def fetch_forecast(year: int, client: httpx.Client) -> Path:
    path = CACHE / f"openmeteo_prev_day1_{year}.csv"
    if path.exists():
        return path
    url = forecast_url(year)
    resp = client.get(url, timeout=60)
    resp.raise_for_status()
    hourly = resp.json()["hourly"]
    df = pd.DataFrame(hourly).rename(
        columns={f"{v}_previous_day1": v for v in FORECAST_VARS} | {"time": "time_utc"}
    )
    df.to_csv(path, index=False)
    _record(path.stem, url, path, len(df))
    return path


def fetch_iem(year: int, client: httpx.Client) -> Path:
    path = CACHE / f"iem_omaa_{year}.csv"
    if path.exists():
        return path
    url = iem_url(year)
    resp = client.get(url, timeout=120)
    resp.raise_for_status()
    df = pd.read_csv(io.StringIO(resp.text), na_values=["M"])
    df.to_csv(path, index=False)
    _record(path.stem, url, path, len(df))
    time.sleep(IEM_SLEEP_S)
    return path


def main() -> int:
    CACHE.mkdir(parents=True, exist_ok=True)
    with httpx.Client(headers={"User-Agent": "amanshift-research/1.0"}) as client:
        for year in YEARS:
            print("forecast", year, fetch_forecast(year, client))
            print("iem", year, fetch_iem(year, client))
    return 0


if __name__ == "__main__":
    sys.exit(main())

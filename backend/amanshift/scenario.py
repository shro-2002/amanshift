"""Demo Site A (SIM-SITE, synthetic) + snapshot builder from real cached weather (HIST-FCST)."""

from __future__ import annotations

import json
from dataclasses import dataclass, field, replace
from datetime import UTC, date, datetime, timedelta
from functools import lru_cache
from pathlib import Path
from typing import Any

import pandas as pd

from amanshift.data.load import forecast_estimates
from amanshift.engine.models import (
    Crew,
    EnvEvidence,
    PrevEval,
    Provenance,
    Resource,
    SiteGraph,
    Snapshot,
)
from amanshift.policy.loader import Policy

REPO = Path(__file__).resolve().parents[2]
SITE_FILE = REPO / "data" / "scenarios" / "demo-site-a.json"
SCENARIO_FILE = REPO / "data" / "scenarios" / "s-auh-1.json"
FORECAST_ISSUE_HOUR_UTC = 12  # previous_day1 treated as the D-1 12:00 UTC run (documented)
SIMULATED_RETRIEVAL_AGE = timedelta(minutes=30)


@lru_cache(maxsize=1)
def site_config() -> dict[str, Any]:
    data: dict[str, Any] = json.loads(SITE_FILE.read_text())
    return data


@lru_cache(maxsize=8)
def day_estimates(day: date, offset_h: int) -> pd.DataFrame:
    """Hourly estimates covering the local day `day`."""
    df = forecast_estimates(day.year)
    start = datetime(day.year, day.month, day.day, tzinfo=UTC) - timedelta(hours=offset_h)
    mask = (df["time_utc"] >= start) & (df["time_utc"] < start + timedelta(hours=24))
    return df[mask].reset_index(drop=True)


@dataclass(frozen=True)
class SiteState:
    """Mutable-by-copy demo state: resource states, failures, meters, escalations."""

    day: date
    eval_time: datetime
    resource_state: dict[str, str] = field(default_factory=dict)
    confirmed_at: dict[str, datetime] = field(default_factory=dict)
    forecast_backdate: timedelta = timedelta(0)
    forecast_lost: bool = False
    meters: tuple[EnvEvidence, ...] = ()
    escalated: frozenset[str] = frozenset()
    connectivity: str = "online"


def initial_state(day: date, eval_time: datetime) -> SiteState:
    cfg = site_config()
    ids = [r["resource_id"] for r in cfg["resources"]]
    confirm = eval_time - timedelta(minutes=5)
    return SiteState(
        day=day,
        eval_time=eval_time,
        resource_state={rid: "up" for rid in ids},
        confirmed_at={rid: confirm for rid in ids},
    )


def forecast_evidence(state: SiteState, zones: list[str], pol: Policy) -> list[EnvEvidence]:
    est = day_estimates(state.day, pol.timezone_offset_h)
    issued = datetime(state.day.year, state.day.month, state.day.day, tzinfo=UTC) - timedelta(
        days=1
    ) + timedelta(hours=FORECAST_ISSUE_HOUR_UTC)
    retrieved = state.eval_time - SIMULATED_RETRIEVAL_AGE - state.forecast_backdate
    out: list[EnvEvidence] = []
    for row in est.itertuples():
        valid = row.time_utc.to_pydatetime()
        prov = Provenance(
            source="open-meteo-previous-runs",
            kind="forecast",
            issued_at=issued - state.forecast_backdate,
            valid_at=valid,
            retrieved_at=retrieved,
        )
        for z in zones:
            out.append(
                EnvEvidence(
                    zone_id=z,
                    wbgt_sun_c=float(row.wbgt_sun_c),
                    wbgt_shade_c=float(row.wbgt_shade_c),
                    trust="lost" if state.forecast_lost else "fresh",
                    provenance=prov,
                )
            )
    return out


def build_snapshot(
    state: SiteState, pol: Policy, prev_eval: dict[str, PrevEval] | None = None
) -> Snapshot:
    cfg = site_config()
    crews = [
        Crew(**{**c, "escalation_active": c["crew_id"] in state.escalated}) for c in cfg["crews"]
    ]
    resources = [
        Resource(
            **r,
            state=state.resource_state.get(r["resource_id"], "unknown"),  # type: ignore[arg-type]
            last_confirmed_at=state.confirmed_at.get(r["resource_id"]),
        )
        for r in cfg["resources"]
    ]
    graph = SiteGraph(zones=cfg["zones"], walk_min=cfg["walk_min"])
    env = forecast_evidence(state, cfg["zones"], pol) + list(state.meters)
    return Snapshot(
        site_id=cfg["site_id"],
        eval_time=state.eval_time,
        policy_version=pol.version,
        env=env,
        crews=crews,
        resources=resources,
        graph=graph,
        connectivity=state.connectivity,  # type: ignore[arg-type]
        prev_eval=prev_eval or {},
    )


def at(state: SiteState, eval_time: datetime) -> SiteState:
    return replace(state, eval_time=eval_time)


def local_time(day: date, hh: int, mm: int, pol: Policy) -> datetime:
    return datetime(day.year, day.month, day.day, hh, mm, tzinfo=UTC) - timedelta(
        hours=pol.timezone_offset_h
    )

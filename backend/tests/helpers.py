"""Synthetic snapshot builders for tests (SYNTH-TEST)."""

from __future__ import annotations

from datetime import UTC, datetime, timedelta
from typing import Any

from amanshift.engine.models import Crew, EnvEvidence, Provenance, Resource, SiteGraph, Snapshot
from amanshift.policy.loader import Policy, load_policy

T0 = datetime(2026, 8, 10, 6, 30, tzinfo=UTC)  # 10:30 GST


def pol_with(**upd: Any) -> Policy:
    return load_policy().model_copy(update=upd)


def forecast(zone: str, sun: float, shade: float, valid: datetime, eval_time: datetime = T0,
             trust: str = "fresh", retrieved_age_h: float = 0.5, issued_age_h: float = 18.0,
             ) -> EnvEvidence:
    return EnvEvidence(
        zone_id=zone, wbgt_sun_c=sun, wbgt_shade_c=shade, trust=trust,  # type: ignore[arg-type]
        provenance=Provenance(
            source="open-meteo-previous-runs", kind="forecast",
            issued_at=eval_time - timedelta(hours=issued_age_h), valid_at=valid,
            retrieved_at=eval_time - timedelta(hours=retrieved_age_h)))


def meter(zone: str, location: str, valid: datetime, wbgt: float | None = None,
          twl: float | None = None, eval_time: datetime = T0) -> EnvEvidence:
    return EnvEvidence(
        zone_id=zone, meter_location=location if wbgt is not None else None,  # type: ignore[arg-type]
        wbgt_sun_c=wbgt if location == "sun" else None,
        wbgt_shade_c=wbgt if location == "shade" else None, twl_wm2=twl,
        provenance=Provenance(source="onsite-meter", kind="measured", valid_at=valid,
                              retrieved_at=eval_time))


def day_forecast(zones: list[str], sun: float, shade: float, eval_time: datetime = T0,
                 hours: int = 14, **kw: Any) -> list[EnvEvidence]:
    start = eval_time.replace(minute=0, second=0) - timedelta(hours=2)
    return [forecast(z, sun, shade, start + timedelta(hours=h), eval_time, **kw)
            for z in zones for h in range(hours)]


def crew(cid: str = "C1", zone: str = "Z1", **kw: Any) -> Crew:
    base: dict[str, Any] = dict(size=8, workload="moderate", ppe="work_clothes",
                                acclimatization="acclimatized", exposure="direct_sun")
    base.update(kw)
    return Crew(crew_id=cid, zone_id=zone, **base)


def resource(rid: str, rtype: str, zone: str = "Z1", capacity: int = 20, state: str = "up",
             confirmed_age_min: float = 5, eval_time: datetime = T0) -> Resource:
    return Resource(resource_id=rid, type=rtype, zone_id=zone, capacity=capacity,  # type: ignore[arg-type]
                    state=state,  # type: ignore[arg-type]
                    last_confirmed_at=eval_time - timedelta(minutes=confirmed_age_min))


def snapshot(crews: list[Crew], resources: list[Resource], env: list[EnvEvidence],
             eval_time: datetime = T0, walk: dict[str, float] | None = None,
             pol: Policy | None = None, **kw: Any) -> Snapshot:
    p = pol or load_policy()
    zones = sorted({c.zone_id for c in crews} | {r.zone_id for r in resources} | {"Z1"})
    return Snapshot(site_id="test-site", eval_time=eval_time, policy_version=p.version, env=env,
                    crews=crews, resources=resources,
                    graph=SiteGraph(zones=zones, walk_min=walk or {}), **kw)


def simple_site(sun: float = 32.0, shade: float = 29.0, **crew_kw: Any) -> Snapshot:
    return snapshot([crew(**crew_kw)], [resource("R1", "shade"), resource("W1", "water")],
                    day_forecast(["Z1"], sun, shade))

"""Domain entities (doc 03 section 5). No person identities, biometrics or worker locations."""

from __future__ import annotations

import hashlib
import json
from datetime import UTC, datetime
from typing import Any, Literal

from pydantic import BaseModel, ConfigDict, Field, field_serializer, field_validator

ID_PATTERN = r"^[A-Za-z0-9 _-]{1,24}$"
FLOAT_DP = 3

Workload = Literal["light", "moderate", "heavy", "very_heavy"]
Ppe = Literal[
    "work_clothes",
    "cloth_coveralls",
    "double_layer_cloth",
    "sms_coveralls",
    "polyolefin_coveralls",
    "limited_use_vapor_barrier",
]
Acclimatization = Literal["acclimatized", "unacclimatized", "mixed"]
Exposure = Literal["direct_sun", "shaded_outdoor", "indoor_unconditioned"]
ResourceType = Literal["shade", "cooled_rest", "water"]
ResourceState = Literal["up", "unconfirmed", "unknown", "down"]
Trust = Literal["fresh", "stale", "lost"]
ActionKind = Literal["work", "stop", "defer"]


def _round(v: float | None) -> float | None:
    return None if v is None else round(float(v), FLOAT_DP)


def _utc(v: datetime | None) -> datetime | None:
    if v is None:
        return None
    if v.tzinfo is None:
        v = v.replace(tzinfo=UTC)
    return v.astimezone(UTC).replace(microsecond=0)


class Frozen(BaseModel):
    model_config = ConfigDict(frozen=True, extra="forbid")


class Provenance(Frozen):
    source: Literal[
        "open-meteo-forecast",
        "open-meteo-previous-runs",
        "iem-metar",
        "onsite-meter",
        "climatology",
        "manual",
    ]
    kind: Literal["measured", "forecast", "derived", "fallback"]
    issued_at: datetime | None = None
    valid_at: datetime
    retrieved_at: datetime
    url_hash: str | None = None

    _norm = field_validator("issued_at", "valid_at", "retrieved_at")(_utc)

    @field_serializer("issued_at", "valid_at", "retrieved_at")
    def _ser(self, v: datetime | None) -> str | None:
        return None if v is None else v.strftime("%Y-%m-%dT%H:%M:%SZ")


class EnvEvidence(Frozen):
    zone_id: str = Field(pattern=ID_PATTERN)
    meter_location: Literal["sun", "shade"] | None = None
    wbgt_sun_c: float | None = Field(default=None, ge=-10, le=50)
    wbgt_shade_c: float | None = Field(default=None, ge=-10, le=50)
    twl_wm2: float | None = Field(default=None, ge=0, le=400)
    trust: Trust = "fresh"  # explicit downgrade marker; timestamps may lower it further
    provenance: Provenance

    _r = field_validator("wbgt_sun_c", "wbgt_shade_c", "twl_wm2")(_round)


class Crew(Frozen):
    crew_id: str = Field(pattern=ID_PATTERN)
    size: int = Field(ge=1, le=30)
    workload: Workload
    ppe: Ppe
    acclimatization: Acclimatization
    exposure: Exposure
    zone_id: str = Field(pattern=ID_PATTERN)
    escalation_active: bool = False


class Resource(Frozen):
    resource_id: str = Field(pattern=ID_PATTERN)
    type: ResourceType
    zone_id: str = Field(pattern=ID_PATTERN)
    capacity: int = Field(ge=0, le=200)
    state: ResourceState
    last_confirmed_at: datetime | None = None
    last_heartbeat_at: datetime | None = None

    _norm = field_validator("last_confirmed_at", "last_heartbeat_at")(_utc)

    @field_serializer("last_confirmed_at", "last_heartbeat_at")
    def _ser(self, v: datetime | None) -> str | None:
        return None if v is None else v.strftime("%Y-%m-%dT%H:%M:%SZ")


class SiteGraph(Frozen):
    zones: list[str]
    walk_min: dict[str, float]  # key "Z1|Z2" (sorted pair); same zone = 0; missing = unreachable

    @field_validator("walk_min")
    @classmethod
    def _check(cls, v: dict[str, float]) -> dict[str, float]:
        out: dict[str, float] = {}
        for k, m in v.items():
            if not 0 <= m <= 60:
                raise ValueError("walk_min out of range 0..60")
            a, b = sorted(k.split("|"))
            out[f"{a}|{b}"] = round(float(m), FLOAT_DP)
        return out


class PrevEval(Frozen):
    raw_level: int = Field(ge=1, le=4)
    f_max: float = Field(ge=0, le=1)
    all_fresh: bool


class Snapshot(Frozen):
    site_id: str = Field(pattern=ID_PATTERN)
    eval_time: datetime
    policy_version: str
    env: list[EnvEvidence]  # forecast evidence for the local day (per zone-hour) + meter readings
    crews: list[Crew]
    resources: list[Resource]
    graph: SiteGraph
    connectivity: Literal["online", "degraded", "offline"] = "online"
    prev_eval: dict[str, PrevEval] = Field(default_factory=dict)

    _norm = field_validator("eval_time")(_utc)

    @field_serializer("eval_time")
    def _ser(self, v: datetime) -> str:
        return v.strftime("%Y-%m-%dT%H:%M:%SZ")


def canonical_json(obj: Any) -> str:
    """Sorted keys, compact, floats already rounded to 3 dp by the models."""
    if isinstance(obj, BaseModel):
        obj = obj.model_dump(mode="json")
    return json.dumps(obj, sort_keys=True, separators=(",", ":"), ensure_ascii=True)


def snapshot_id(snap: Snapshot) -> str:
    return "sha256:" + hashlib.sha256(canonical_json(snap).encode()).hexdigest()


class PlanAction(Frozen):
    crew_id: str
    action: ActionKind
    work_fraction: float | None = None
    rest_resource: str | None = None
    water_resource: str | None = None
    defer_until: str | None = None  # ISO UTC
    clinical_escalation: bool = False
    reason_codes: list[str] = Field(default_factory=list)


class Plan(Frozen):
    plan_id: str
    snapshot_id: str
    policy_version: str
    status: Literal["feasible", "protection_insufficient"]
    actions: list[PlanAction]
    objective: dict[str, float]

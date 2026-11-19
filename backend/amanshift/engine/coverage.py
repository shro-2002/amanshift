"""Protection Coverage Graph (doc 05 section 4). Only trusted-up resources create edges."""

from __future__ import annotations

import math
from dataclasses import dataclass

from amanshift.engine.models import Crew, Resource, SiteGraph, Snapshot
from amanshift.policy.loader import Policy

REST_TYPES = ("shade", "cooled_rest")


def walk(graph: SiteGraph, a: str, b: str) -> float:
    if a == b:
        return 0.0
    x, y = sorted((a, b))
    return graph.walk_min.get(f"{x}|{y}", math.inf)


def trusted_up(r: Resource, snap: Snapshot, pol: Policy) -> bool:
    if r.state != "up" or r.last_confirmed_at is None:
        return False
    age_min = (snap.eval_time - r.last_confirmed_at).total_seconds() / 60
    return age_min <= pol.resource_confirmation_ttl_min


@dataclass(frozen=True)
class Edges:
    rest: dict[str, tuple[str, ...]]  # crew -> rest resource ids, sorted by (walk, id)
    water: dict[str, tuple[str, ...]]


def edges(snap: Snapshot, pol: Policy) -> Edges:
    rest: dict[str, tuple[str, ...]] = {}
    water: dict[str, tuple[str, ...]] = {}
    ups = [r for r in snap.resources if trusted_up(r, snap, pol)]
    for c in snap.crews:
        reach = [
            r for r in ups if walk(snap.graph, c.zone_id, r.zone_id) <= pol.max_walk_min[r.type]
        ]
        reach.sort(key=lambda r: (walk(snap.graph, c.zone_id, r.zone_id), r.resource_id))
        rest[c.crew_id] = tuple(r.resource_id for r in reach if r.type in REST_TYPES)
        water[c.crew_id] = tuple(r.resource_id for r in reach if r.type == "water")
    return Edges(rest, water)


def lost_edges(snap: Snapshot, pol: Policy) -> list[tuple[str, str]]:
    """Edges that would exist if every resource were trusted-up (for 'dashed red' display)."""
    out: list[tuple[str, str]] = []
    for c in snap.crews:
        for r in snap.resources:
            if trusted_up(r, snap, pol):
                continue
            if walk(snap.graph, c.zone_id, r.zone_id) <= pol.max_walk_min[r.type]:
                out.append((c.crew_id, r.resource_id))
    return sorted(out)


def crew_index(snap: Snapshot) -> dict[str, Crew]:
    return {c.crew_id: c for c in snap.crews}


def resource_index(snap: Snapshot) -> dict[str, Resource]:
    return {r.resource_id: r for r in snap.resources}

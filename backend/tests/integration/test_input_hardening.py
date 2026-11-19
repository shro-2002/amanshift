"""Regression tests for the 2026-11-19 review findings: malformed or manipulated inputs must be
rejected with 4xx and must never relax protection (doc 07 T-SEC-01, AGENTS.md invariant)."""

from __future__ import annotations

from typing import Any

import pytest
from fastapi.testclient import TestClient

from amanshift.api.app import app

SITE = "/api/v1/sites/demo-site-a"


@pytest.fixture()
def c() -> TestClient:
    client = TestClient(app, raise_server_exceptions=False)
    assert client.post("/api/v1/scenarios/s-auh-1/load").status_code == 200
    return client


def levels(c: TestClient) -> tuple[dict[str, int], str]:
    d = c.get(f"{SITE}/state").json()["data"]
    return {x["crew_id"]: x["display_level"] for x in d["crews"]}, d["eval_time"]


BAD_FAILURES: list[dict[str, Any]] = [
    {"type": "time_advance", "value": {"steps": -16}},  # clock rollback
    {"type": "time_advance", "value": {"steps": 0}},
    {"type": "time_advance", "value": {"steps": 10**12}},  # overflow
    {"type": "time_advance", "value": {"steps": 9}},  # > 2 h per request
    {"type": "time_advance", "value": {"steps": "3"}},  # wrong type
    {"type": "time_advance", "value": {"steps": 1.5}},
    {"type": "time_advance", "value": {"steps": 1, "minutes": -60}},  # extra key
    {"type": "meter_reading", "value": {"zone": "Z2", "wbgt": "abc"}},
    {"type": "meter_reading", "value": {"zone": "Z2", "wbgt": 99}},
    {"type": "meter_reading", "value": {"zone": "Z2", "twl": -5}},
    {"type": "meter_reading", "value": {"zone": "Z2"}},  # no reading
    {"type": "meter_reading", "value": {"zone": "Z9", "wbgt": 34}},  # unknown zone
    {"type": "meter_reading", "value": {"zone": "Z2", "location": "roof", "wbgt": 34}},
    {"type": "resource_down"},  # missing target
    {"type": "resource_down", "target": "R9"},  # unknown resource
    {"type": "resource_repaired", "target": "W9"},
    {"type": "forecast_stale", "value": {"backdate_h": -4}},  # value not accepted
    {"type": "restore_all", "extra": True},
]


@pytest.mark.parametrize("body", BAD_FAILURES)
def test_malformed_failure_is_rejected_with_422_and_changes_nothing(
        c: TestClient, body: dict[str, Any]) -> None:
    before = levels(c)
    r = c.post(f"{SITE}/failures", json=body)
    assert r.status_code == 422, (body, r.status_code, r.text[:200])
    assert r.json()["error"]["code"] == "VALIDATION_ERROR"
    assert levels(c) == before


def test_clock_cannot_run_backwards_to_relax_a_stop(c: TestClient) -> None:
    c.post(f"{SITE}/failures", json={"type": "resource_down", "target": "R2"})
    lv, t = levels(c)
    assert lv["C2"] == 4
    assert c.post(f"{SITE}/failures", json={"type": "time_advance", "value": {"steps": -16}}
                  ).status_code == 422
    assert levels(c) == (lv, t)


def test_clock_cannot_pass_the_end_of_the_work_day(c: TestClient) -> None:
    for _ in range(3):  # 10:30 -> 16:30 local in 2 h hops
        assert c.post(f"{SITE}/failures", json={"type": "time_advance", "value": {"steps": 8}}
                      ).status_code == 200
    r = c.post(f"{SITE}/failures", json={"type": "time_advance", "value": {"steps": 8}})
    assert r.status_code == 422


def test_forward_time_advance_still_works(c: TestClient) -> None:
    _, t0 = levels(c)
    r = c.post(f"{SITE}/failures", json={"type": "time_advance", "value": {"steps": 1}})
    assert r.status_code == 200 and r.json()["data"]["eval_time"] != t0


def test_valid_meter_reading_accepted_and_only_tightens(c: TestClient) -> None:
    before, _ = levels(c)
    r = c.post(f"{SITE}/failures",
               json={"type": "meter_reading", "value": {"zone": "Z2", "location": "sun", "wbgt": 34.5}})
    assert r.status_code == 200
    after, _ = levels(c)
    assert all(after[k] >= before[k] for k in before)


@pytest.mark.parametrize("path", [
    "/api/v1/sites/other-site/state",
    "/api/v1/sites/demo-site-a/resources/R2;--/confirm",
])
def test_unknown_site_or_bad_resource_id_is_4xx(c: TestClient, path: str) -> None:
    r = c.post(path) if path.endswith("confirm") else c.get(path)
    assert 400 <= r.status_code < 500


def test_sessions_are_isolated_between_browsers() -> None:
    judge_a = TestClient(app)
    judge_b = TestClient(app)
    judge_a.post("/api/v1/scenarios/s-auh-1/load")
    judge_b.post("/api/v1/scenarios/s-auh-1/load")
    judge_a.post(f"{SITE}/failures", json={"type": "resource_down", "target": "R2"})
    b_state = judge_b.get(f"{SITE}/state").json()["data"]
    r2 = next(r for r in b_state["coverage"]["resources"] if r["resource_id"] == "R2")
    assert r2["state"] == "up"


def test_unexpected_errors_return_enveloped_500_without_trace() -> None:
    import asyncio

    from amanshift.api.app import _unexpected

    r = asyncio.run(_unexpected(None, RuntimeError("secret internals")))  # type: ignore[arg-type]
    assert r.status_code == 500
    assert b"INTERNAL_ERROR" in r.body and b"secret" not in r.body


def test_security_headers_present(c: TestClient) -> None:
    r = c.get("/api/v1/health")
    assert r.headers["X-Content-Type-Options"] == "nosniff"
    assert r.headers["X-Frame-Options"] == "DENY"

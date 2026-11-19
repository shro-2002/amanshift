"""API integration: judging moment steps 1-4 (IC2), T-SEC-01/02/04/06, governance notice."""

from __future__ import annotations

import pytest
from fastapi.testclient import TestClient

from amanshift.api.app import LOG, app

SITE = "/api/v1/sites/demo-site-a"


@pytest.fixture()
def c() -> TestClient:
    client = TestClient(app)
    assert client.post("/api/v1/scenarios/s-auh-1/load").status_code == 200
    return client


def data(r):  # type: ignore[no-untyped-def]
    assert r.status_code == 200, r.text
    return r.json()["data"]


def test_judging_moment_steps_1_to_4(c: TestClient) -> None:
    d = data(c.get(f"{SITE}/state"))
    assert len({x["display_level"] for x in d["crews"]}) >= 3
    assert d["plan"]["checker"]["verdict"] == "approved" and d["plan"]["approved"]
    before = {x["crew_id"]: x["level"] for x in d["crews"]}
    d = data(c.post(f"{SITE}/failures", json={"type": "resource_down", "target": "R2"}))
    uncovered = {x["crew_id"] for x in d["crews"] if not x["rest_edges"]}
    assert {"C2", "C5"} <= uncovered
    assert all(x["level"] >= before[x["crew_id"]] for x in d["crews"])  # monotone
    assert any(e["status"] == "lost" and e["resource"] == "R2" for e in d["coverage"]["edges"])
    d = data(c.post(f"{SITE}/plans"))
    assert d["plan"]["checker"]["verdict"] == "approved"
    assert d["plan"]["checker"]["rules_evaluated"] == 10
    stopped = {a["crew_id"] for a in d["plan"]["actions"] if a["action"] == "stop"}
    assert {"C2", "C5"} <= stopped
    d = data(c.post(f"{SITE}/plans/check", json={"template": "keep_previous"}))
    v = d["unsafe_check"]["checker"]
    assert v["verdict"] == "rejected" and "C4" in {x["rule"] for x in v["violations"]}
    assert all(x["citation"] for x in v["violations"])


def test_degradations_never_lower_levels(c: TestClient) -> None:
    base = {x["crew_id"]: x["level"] for x in data(c.get(f"{SITE}/state"))["crews"]}
    for f in ({"type": "forecast_stale"}, {"type": "forecast_lost"}, {"type": "network_offline"},
              {"type": "meter_reading", "value": {"zone": "Z2", "location": "sun", "wbgt": 20.0}}):
        cur = {x["crew_id"]: x["level"] for x in data(c.post(f"{SITE}/failures", json=f))["crews"]}
        assert all(cur[k] >= base[k] for k in base), f
        base = cur


def test_restore_requires_confirmation_and_dwell(c: TestClient) -> None:
    data(c.post(f"{SITE}/failures", json={"type": "resource_down", "target": "R2"}))
    d = data(c.post(f"{SITE}/failures", json={"type": "restore_all"}))
    assert next(r for r in d["coverage"]["resources"] if r["resource_id"] == "R2")["state"] == "unconfirmed"
    assert not next(x for x in d["crews"] if x["crew_id"] == "C2")["rest_edges"]
    d = data(c.post(f"{SITE}/resources/R2/confirm"))
    c2 = next(x for x in d["crews"] if x["crew_id"] == "C2")
    assert c2["rest_edges"] == ["R2"] and c2["level"] == 4  # dwell: worst seen this tick holds
    for _ in range(2):
        d = data(c.post(f"{SITE}/failures", json={"type": "time_advance", "value": {"steps": 1}}))
        data(c.post(f"{SITE}/resources/R2/confirm"))
    d = data(c.get(f"{SITE}/state"))
    assert next(x for x in d["crews"] if x["crew_id"] == "C2")["level"] <= 4


def test_single_resource_repair_needs_confirmation(c: TestClient) -> None:
    data(c.post(f"{SITE}/failures", json={"type": "resource_down", "target": "R2"}))
    assert c.post(f"{SITE}/resources/R2/confirm").status_code == 409  # down cannot jump to up
    d = data(c.post(f"{SITE}/failures", json={"type": "resource_repaired", "target": "R2"}))
    r2 = next(r for r in d["coverage"]["resources"] if r["resource_id"] == "R2")
    assert r2["state"] == "unconfirmed" and not r2["trusted"]
    assert not next(x for x in d["crews"] if x["crew_id"] == "C2")["rest_edges"]
    d = data(c.post(f"{SITE}/resources/R2/confirm"))
    assert next(x for x in d["crews"] if x["crew_id"] == "C2")["rest_edges"] == ["R2"]


def test_t_sec_01_validation(c: TestClient) -> None:
    assert c.post(f"{SITE}/failures", json={"type": "drop_table"}).status_code == 422
    assert c.post(f"{SITE}/failures", json={"type": "resource_down", "target": "R2;--"}).status_code == 422
    assert c.post(f"{SITE}/escalations", json={"crew_id": "<script>", "confirm": True}).status_code == 422


def test_t_sec_02_worker_cannot_read_state(c: TestClient) -> None:
    assert c.get(f"{SITE}/state", headers={"X-Role": "worker"}).status_code == 403
    assert c.get(f"{SITE}/cards", headers={"X-Role": "worker"}).status_code == 200


def test_t_sec_04_hash_chain_verifies(c: TestClient) -> None:
    data(c.post(f"{SITE}/failures", json={"type": "resource_down", "target": "R1"}))
    d = data(c.post(f"{SITE}/plans"))
    assert d["chain_ok"] is True


def test_t_sec_06_unapproved_plan_cannot_be_applied(c: TestClient) -> None:
    r = c.post(f"{SITE}/plans/p-deadbeef/approve")
    assert r.status_code == 409


def test_escalation_two_step_and_medic_close(c: TestClient) -> None:
    assert c.post(f"{SITE}/escalations", json={"crew_id": "C4"}).status_code == 422  # no confirm
    d = data(c.post(f"{SITE}/escalations", json={"crew_id": "C4", "confirm": True}))
    assert next(x for x in d["crews"] if x["crew_id"] == "C4")["level"] == 4
    assert c.post(f"{SITE}/escalations", json={"crew_id": "C4", "close": True, "confirm": True}
                  ).status_code == 403
    assert c.post(f"{SITE}/escalations", json={"crew_id": "C4", "close": True, "confirm": True},
                  headers={"X-Role": "medic"}).status_code == 200


def test_governance_notice_and_no_banned_fields(c: TestClient) -> None:
    r = c.get(f"{SITE}/state")
    assert "not diagnosis or work authorization" in r.json()["meta"]["notice"]
    body = r.text.lower()
    for banned in ("safe_to_work", "cleared", "authorized", "measured wbgt"):
        assert banned not in body


def test_offline_pack_worst_case_never_below_planned(c: TestClient) -> None:
    pack = data(c.get(f"{SITE}/offline-pack"))
    for step in pack["steps"]:
        assert all(step["worst_case"][k] >= v for k, v in step["planned"].items())
    assert pack["stale_after_min"] == 60 and pack["expires_after_min"] == 180


def test_log_payload_purge_keeps_chain() -> None:
    from datetime import UTC, datetime, timedelta

    from amanshift.store.log import EventLog
    log = EventLog()
    t = datetime(2026, 7, 1, tzinfo=UTC)
    log.append("s", "symptom_escalation", {"crew_id": "C1"}, t, "C1")
    log.append("s", "plan_approved", {"plan_id": "p"}, t)
    assert log.purge_payloads(datetime.now(UTC) + timedelta(days=31)) == 1
    assert log.verify("s")
    log._db.execute("UPDATE events SET payload_sha256 = 'x' WHERE kind = 'plan_approved'")
    assert not log.verify("s")
    assert LOG is not None


def test_session_store_is_bounded() -> None:
    from amanshift.api import session as ss
    from amanshift.api.app import POL
    store = ss.Sessions()
    log = LOG
    for i in range(ss.MAX_SESSIONS + 5):
        store.reset(f"{i:032x}", POL, log)
    assert len(store) == ss.MAX_SESSIONS

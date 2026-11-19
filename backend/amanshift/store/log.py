"""Append-only, hash-chained SQLite event log (doc 03 section 6, amendment A11).

The chain covers payload digests, so purging payload rows (e.g. escalations after 30 days) keeps
the chain verifiable. Parameterised SQL only.
"""

from __future__ import annotations

import hashlib
import json
import sqlite3
import threading
import uuid
from datetime import UTC, datetime, timedelta
from pathlib import Path
from typing import Any

KINDS = (
    "snapshot", "plan_proposed", "checker_verdict", "plan_approved", "override", "resource_state",
    "failure_injected", "symptom_escalation", "alert_issued", "alert_acknowledged", "offline_sync",
)
GENESIS = "0" * 64
PURGE_KINDS = ("symptom_escalation",)
PURGE_AFTER = timedelta(days=30)

SCHEMA = f"""
CREATE TABLE IF NOT EXISTS events (
  event_id TEXT PRIMARY KEY, site_id TEXT NOT NULL, occurred_at TEXT NOT NULL,
  recorded_at TEXT NOT NULL,
  kind TEXT NOT NULL CHECK (kind IN ({",".join(repr(k) for k in KINDS)})),
  crew_id TEXT, payload_sha256 TEXT NOT NULL, prev_hash TEXT NOT NULL, hash TEXT NOT NULL);
CREATE TABLE IF NOT EXISTS payloads (
  event_id TEXT PRIMARY KEY REFERENCES events(event_id), payload_json TEXT NOT NULL);
CREATE INDEX IF NOT EXISTS idx_events_site_time ON events(site_id, occurred_at);
"""


def _digest(*parts: str) -> str:
    return hashlib.sha256("|".join(parts).encode()).hexdigest()


class EventLog:
    def __init__(self, path: Path | str = ":memory:") -> None:
        self._db = sqlite3.connect(str(path), check_same_thread=False)
        self._db.executescript(SCHEMA)
        self._lock = threading.Lock()

    def append(self, site_id: str, kind: str, payload: dict[str, Any], occurred_at: datetime,
               crew_id: str | None = None) -> dict[str, str]:
        if kind not in KINDS:
            raise ValueError(f"unknown event kind {kind}")
        body = json.dumps(payload, sort_keys=True, separators=(",", ":"), default=str)
        psha = hashlib.sha256(body.encode()).hexdigest()
        with self._lock:
            row = self._db.execute(
                "SELECT hash FROM events WHERE site_id = ? ORDER BY rowid DESC LIMIT 1", (site_id,)
            ).fetchone()
            prev = row[0] if row else GENESIS
            eid = str(uuid.uuid4())
            occ = occurred_at.astimezone(UTC).isoformat(timespec="seconds")
            rec = datetime.now(UTC).isoformat(timespec="seconds")
            h = _digest(prev, eid, site_id, occ, kind, crew_id or "", psha)
            self._db.execute("INSERT INTO events VALUES (?,?,?,?,?,?,?,?,?)",
                             (eid, site_id, occ, rec, kind, crew_id, psha, prev, h))
            self._db.execute("INSERT INTO payloads VALUES (?,?)", (eid, body))
            self._db.commit()
        return {"event_id": eid, "hash": h}

    def events(self, site_id: str, limit: int = 50) -> list[dict[str, Any]]:
        rows = self._db.execute(
            "SELECT e.event_id, e.occurred_at, e.kind, e.crew_id, e.hash, p.payload_json "
            "FROM events e LEFT JOIN payloads p ON p.event_id = e.event_id "
            "WHERE e.site_id = ? ORDER BY e.rowid DESC LIMIT ?", (site_id, limit)).fetchall()
        return [{"event_id": r[0], "occurred_at": r[1], "kind": r[2], "crew_id": r[3],
                 "hash": r[4][:12], "payload": json.loads(r[5]) if r[5] else None} for r in rows]

    def verify(self, site_id: str) -> bool:
        prev = GENESIS
        for eid, occ, kind, crew, psha, p_hash, h in self._db.execute(
                "SELECT event_id, occurred_at, kind, crew_id, payload_sha256, prev_hash, hash "
                "FROM events WHERE site_id = ? ORDER BY rowid", (site_id,)):
            if p_hash != prev or h != _digest(prev, eid, site_id, occ, kind, crew or "", psha):
                return False
            prev = h
        return True

    def purge_payloads(self, now: datetime) -> int:
        cutoff = (now - PURGE_AFTER).astimezone(UTC).isoformat(timespec="seconds")
        with self._lock:
            cur = self._db.execute(
                "DELETE FROM payloads WHERE event_id IN (SELECT event_id FROM events "
                f"WHERE kind IN ({','.join('?' * len(PURGE_KINDS))}) AND recorded_at < ?)",
                (*PURGE_KINDS, cutoff))
            self._db.commit()
        return cur.rowcount

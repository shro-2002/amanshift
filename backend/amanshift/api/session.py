"""Per-browser-session demo state (doc 03 section 15): cookie-keyed, LRU 200, reset by load."""

from __future__ import annotations

import json
import threading
from collections import OrderedDict
from dataclasses import dataclass, field, replace
from datetime import date, datetime, timedelta
from typing import Any

from amanshift import scenario as sc
from amanshift.engine import kernel, planner
from amanshift.engine.models import EnvEvidence, Plan, PrevEval, Provenance, Snapshot
from amanshift.policy.loader import Policy
from amanshift.store.log import EventLog

MAX_SESSIONS = 200
STALE_BACKDATE = timedelta(hours=4)


def scenario_meta() -> dict[str, Any]:
    data: dict[str, Any] = json.loads(sc.SCENARIO_FILE.read_text())
    return data


def worst(a: PrevEval | None, b: PrevEval | None) -> PrevEval | None:
    if a is None or b is None:
        return a or b
    return PrevEval(raw_level=max(a.raw_level, b.raw_level), f_max=min(a.f_max, b.f_max),
                    all_fresh=a.all_fresh and b.all_fresh)


@dataclass
class Session:
    sid: str
    state: sc.SiteState
    history: dict[datetime, dict[str, PrevEval]] = field(default_factory=dict)
    proposed: Plan | None = None
    proposed_check: dict[str, Any] | None = None
    approved: Plan | None = None
    unsafe_check: dict[str, Any] | None = None
    log_lines: list[dict[str, Any]] = field(default_factory=list)

    @property
    def site_key(self) -> str:
        return f"demo-site-a/{self.sid[:8]}"

    # ---- evaluation
    def prev_eval(self, pol: Policy) -> dict[str, PrevEval]:
        """Worst raw evaluation at the previous tick and earlier at this tick (dwell, A4)."""
        t = self.state.eval_time
        prior = self.history.get(t - timedelta(minutes=pol.tick_min), {})
        here = self.history.get(t, {})
        out: dict[str, PrevEval] = {}
        for cid in set(prior) | set(here):
            w = worst(prior.get(cid), here.get(cid))
            if w is not None:
                out[cid] = w
        return out

    def evaluate(self, pol: Policy) -> tuple[Snapshot, kernel.SiteDecision]:
        snap = sc.build_snapshot(self.state, pol, self.prev_eval(pol))
        dec = kernel.decide(snap, pol)
        cur = kernel.prev_eval_of(dec)
        here = self.history.setdefault(self.state.eval_time, {})
        for cid, pe in cur.items():
            here[cid] = worst(here.get(cid), pe) or pe
        return snap, dec

    def note(self, text: str, kind: str = "info") -> None:
        self.log_lines.append({"at": self.state.eval_time.isoformat(), "text": text, "kind": kind})
        self.log_lines = self.log_lines[-30:]


class Sessions:
    def __init__(self) -> None:
        self._items: OrderedDict[str, Session] = OrderedDict()
        self._lock = threading.Lock()

    def _store(self, s: Session) -> Session:
        self._items[s.sid] = s
        self._items.move_to_end(s.sid)
        while len(self._items) > MAX_SESSIONS:
            self._items.popitem(last=False)
        return s

    def get(self, sid: str, pol: Policy, log: EventLog) -> Session:
        with self._lock:
            if sid in self._items:
                self._items.move_to_end(sid)
                return self._items[sid]
            return self._store(new_session(sid, pol, log))

    def reset(self, sid: str, pol: Policy, log: EventLog) -> Session:
        with self._lock:
            return self._store(new_session(sid, pol, log))

    def __len__(self) -> int:
        return len(self._items)


def scenario_start(pol: Policy) -> tuple[date, datetime]:
    meta = scenario_meta()
    day = date.fromisoformat(meta["selection"]["date"])
    hh, mm = (int(x) for x in meta["judging_time_local"].split(":"))
    return day, sc.local_time(day, hh, mm, pol)


def new_session(sid: str, pol: Policy, log: EventLog) -> Session:
    day, t0 = scenario_start(pol)
    s = Session(sid=sid, state=sc.initial_state(day, t0))
    # previous tick evaluated under the same initial conditions (scenario setup)
    s.state = sc.at(s.state, t0 - timedelta(minutes=pol.tick_min))
    s.evaluate(pol)
    s.state = sc.at(s.state, t0)
    snap, dec = s.evaluate(pol)
    plan = planner.plan(dec, pol)
    import amanshift_checker as chk

    verdict = chk.check(snap.model_dump(mode="json"), plan.model_dump(mode="json"))
    s.proposed, s.proposed_check = plan, verdict
    if verdict["verdict"] == "approved":
        s.approved = plan
        log.append(s.site_key, "plan_approved", {"plan_id": plan.plan_id, "by": "scenario setup"},
                   t0)
    s.note(f"Scenario loaded: {day.isoformat()} at 10:30 GST; initial plan {plan.plan_id} "
           f"{verdict['verdict']}")
    return s


# ---- state transitions (each creates a new snapshot on next evaluation)

def inject(s: Session, ftype: str, target: str | None, value: dict[str, Any], pol: Policy) -> str:
    st = s.state
    if ftype == "resource_down" and target in st.resource_state:
        s.state = replace(st, resource_state={**st.resource_state, target: "down"})
        return f"{target} reported DOWN (simulated failure)"
    if ftype == "forecast_stale":
        s.state = replace(st, forecast_backdate=STALE_BACKDATE)
        return "Forecast feed stale: last retrieval 4 h 30 min ago (simulated)"
    if ftype == "forecast_lost":
        s.state = replace(st, forecast_lost=True)
        return "Forecast feed lost (simulated); cached values kept, seasonal bound added"
    if ftype == "network_offline":
        s.state = replace(st, connectivity="offline")
        return "Client network offline (simulated)"
    if ftype == "meter_reading":
        ev = EnvEvidence(
            zone_id=str(value.get("zone", target or "Z2")),
            meter_location=value.get("location", "sun"),
            wbgt_sun_c=value.get("wbgt") if value.get("location", "sun") == "sun" else None,
            wbgt_shade_c=value.get("wbgt") if value.get("location") == "shade" else None,
            twl_wm2=value.get("twl"),
            provenance=Provenance(source="onsite-meter", kind="measured", valid_at=st.eval_time,
                                  retrieved_at=st.eval_time))
        s.state = replace(st, meters=(*st.meters, ev))
        return f"Meter entry {ev.zone_id}: WBGT {value.get('wbgt')} TWL {value.get('twl')}"
    if ftype == "restore_all":
        states = {k: ("unconfirmed" if v == "down" else v) for k, v in st.resource_state.items()}
        s.state = replace(st, resource_state=states, forecast_backdate=timedelta(0),
                          forecast_lost=False, connectivity="online")
        return "Restore: feed fresh, network online; repaired resources need physical confirmation"
    if ftype == "time_advance":
        steps = int(value.get("steps", 1))
        s.state = replace(st, eval_time=st.eval_time + timedelta(minutes=pol.tick_min * steps))
        return f"Time advanced {pol.tick_min * steps} min"
    raise ValueError(f"unsupported failure type {ftype!r}")


def confirm(s: Session, rid: str) -> str:
    st = s.state
    if rid not in st.resource_state:
        raise KeyError(rid)
    if st.resource_state[rid] == "down":
        raise ValueError("resource is DOWN: report repair first (down -> unconfirmed)")
    s.state = replace(st, resource_state={**st.resource_state, rid: "up"},
                      confirmed_at={**st.confirmed_at, rid: st.eval_time})
    return f"{rid} physically confirmed by supervisor"


def escalate(s: Session, crew_id: str, close: bool, role: str) -> str:
    st = s.state
    if close:
        if role != "medic":
            raise PermissionError("only the medic role can close an escalation")
        s.state = replace(st, escalated=st.escalated - {crew_id})
        return f"Escalation for crew {crew_id} closed by medic; dwell applies"
    s.state = replace(st, escalated=st.escalated | {crew_id})
    return f"Symptom report: crew {crew_id} STOP + clinical escalation"

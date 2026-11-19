"""FastAPI routes (doc 03 section 7). Envelope {data, error, meta}. Decision support only."""

from __future__ import annotations

import json
import os
import secrets
import uuid
from pathlib import Path
from typing import Any, Literal

from fastapi import FastAPI, Request, Response
from fastapi.exceptions import RequestValidationError
from fastapi.responses import FileResponse, JSONResponse
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel, Field

import amanshift_checker as chk
from amanshift.api import offline, views
from amanshift.api import session as ss
from amanshift.engine import planner
from amanshift.engine.models import ID_PATTERN, Plan
from amanshift.policy.loader import load_policy
from amanshift.store.log import EventLog

REPO = Path(__file__).resolve().parents[3]
EVAL_OUT = REPO / "eval" / "out"
WEB_DIST = Path(os.environ.get("AMANSHIFT_WEB_DIST", REPO / "web" / "dist"))
COOKIE = "amanshift_sid"
NOTICE = ("Decision support, not diagnosis or work authorization. No disciplinary or employment use. "
          "Synthetic site, real Abu Dhabi weather.")
SITE = "demo-site-a"

app = FastAPI(title="AmanShift API", version="1.0.0", description=NOTICE)
POL = load_policy()
LOG = EventLog(os.environ.get("AMANSHIFT_DB", ":memory:"))
SESSIONS = ss.Sessions()


def envelope(data: Any, snapshot_id: str | None = None, status: int = 200,
             error: dict[str, Any] | None = None) -> JSONResponse:
    body = {"data": data, "error": error,
            "meta": {"request_id": str(uuid.uuid4()), "policy_version": POL.version,
                     "snapshot_id": snapshot_id, "notice": NOTICE}}
    return JSONResponse(json.loads(json.dumps(body, default=str)), status_code=status)


def fail(status: int, code: str, message: str) -> JSONResponse:
    return envelope(None, status=status, error={"code": code, "message": message, "details": []})


@app.exception_handler(RequestValidationError)
async def _invalid(_: Request, exc: RequestValidationError) -> JSONResponse:
    return envelope(None, status=422, error={"code": "VALIDATION_ERROR", "message": "invalid input",
                                             "details": json.loads(json.dumps(exc.errors(), default=str))})


def valid_sid(sid: str | None) -> bool:
    return bool(sid) and len(sid or "") == 32 and all(ch in "0123456789abcdef" for ch in sid or "")


def sess(request: Request, response: Response) -> ss.Session:
    sid = request.cookies.get(COOKIE)
    if not valid_sid(sid):
        sid = secrets.token_hex(16)
        response.set_cookie(COOKIE, sid, httponly=True, samesite="strict", max_age=86400)
        request.state.new_sid = sid
    return SESSIONS.get(str(sid), POL, LOG)


def role(request: Request) -> str:
    r = request.headers.get("X-Role", "supervisor")
    return r if r in ("supervisor", "worker", "medic") else "worker"


def full_state(s: ss.Session) -> tuple[dict[str, Any], str]:
    snap, dec = s.evaluate(POL)
    plan = s.proposed
    data = views.state_view(s.state, snap, dec, plan, POL)
    current_sid = data["snapshot_id"]
    data["plan"] = None if plan is None else {
        **plan.model_dump(mode="json"), "checker": s.proposed_check,
        "approved": s.approved is not None and s.approved.plan_id == plan.plan_id,
        "stale": plan.snapshot_id != current_sid}
    data["approved_plan_id"] = s.approved.plan_id if s.approved else None
    data["unsafe_check"] = s.unsafe_check
    data["timeline"] = views.timeline(s.state, snap, POL)
    data["log"] = list(reversed(s.log_lines))
    data["chain_ok"] = LOG.verify(s.site_key)
    data["banners"] = banners(data)
    return data, current_sid


def banners(d: dict[str, Any]) -> list[dict[str, str]]:
    out = []
    plan = d.get("plan") or {}
    if plan.get("status") == "protection_insufficient":
        out.append({"kind": "insufficient", "text": "Insufficient protection capacity"})
    uncovered = [c["crew_id"] for c in d["crews"]
                 if c["display_level"] >= 3 and not c["rest_edges"] and not c["escalated"]]
    if uncovered:
        out.append({"kind": "uncovered", "text": "No reachable rest resource: " + ", ".join(uncovered)})
    if d["forecast"]["tier"] != "fresh":
        out.append({"kind": "forecast", "text": "Forecast unavailable or stale — using conservative "
                    "seasonal bound"})
    if (plan.get("checker") or {}).get("verdict") not in (None, "approved"):
        out.append({"kind": "checker", "text": "Checker rejected the proposed plan"})
    if plan.get("stale"):
        out.append({"kind": "replan", "text": "Conditions changed since the last plan — re-plan"})
    return out


def respond(s: ss.Session, request: Request, response: Response) -> JSONResponse:
    data, sid = full_state(s)
    r = envelope(data, sid)
    if getattr(request.state, "new_sid", None):
        r.set_cookie(COOKIE, request.state.new_sid, httponly=True, samesite="strict", max_age=86400)
    return r


# ---------------------------------------------------------------- routes
@app.get("/api/v1/health")
def health() -> JSONResponse:
    return envelope({"status": "ok", "checker_version": chk.CHECKER_VERSION})


@app.get("/api/v1/scenarios")
def scenarios() -> JSONResponse:
    meta = ss.scenario_meta()
    return envelope([{"id": meta["scenario_id"], "date": meta["selection"]["date"],
                      "judging_time_local": meta["judging_time_local"], "site": SITE,
                      "data_types": ["SIM-SITE", "HIST-FCST"], "selection_rule": meta["selection"]["rule"]}])


@app.post("/api/v1/scenarios/{scenario_id}/load")
def load(scenario_id: str, request: Request, response: Response) -> JSONResponse:
    if scenario_id != ss.scenario_meta()["scenario_id"]:
        return fail(404, "NOT_FOUND", "unknown scenario")
    sid = request.cookies.get(COOKIE)
    if not valid_sid(sid):
        sid = secrets.token_hex(16)
        request.state.new_sid = sid
    s = SESSIONS.reset(str(sid), POL, LOG)
    return respond(s, request, response)


@app.get("/api/v1/sites/{site}/state")
def state(site: str, request: Request, response: Response) -> JSONResponse:
    if role(request) == "worker":
        return fail(403, "FORBIDDEN", "worker role can read crew cards only")
    return respond(sess(request, response), request, response)


class FailureIn(BaseModel):
    type: Literal["resource_down", "forecast_stale", "forecast_lost", "network_offline",
                  "meter_reading", "restore_all", "resource_repaired", "time_advance"]
    target: str | None = Field(default=None, pattern=ID_PATTERN)
    value: dict[str, Any] = Field(default_factory=dict)


@app.post("/api/v1/sites/{site}/failures")
def failures(site: str, body: FailureIn, request: Request, response: Response) -> JSONResponse:
    s = sess(request, response)
    if body.type == "meter_reading":
        w, t = body.value.get("wbgt"), body.value.get("twl")
        b = POL.input_bounds
        if (w is not None and not b["wbgt_c"][0] <= float(w) <= b["wbgt_c"][1]) or (
                t is not None and not b["twl_wm2"][0] <= float(t) <= b["twl_wm2"][1]):
            return fail(422, "VALIDATION_ERROR", "meter value out of range")
    try:
        text = ss.inject(s, body.type, body.target, body.value, POL)
    except ValueError as exc:
        return fail(422, "VALIDATION_ERROR", str(exc))
    kind = "resource_state" if body.type == "restore_all" else "failure_injected"
    LOG.append(s.site_key, kind, body.model_dump(), s.state.eval_time)
    s.note(text, "failure")
    return respond(s, request, response)


@app.post("/api/v1/sites/{site}/resources/{rid}/confirm")
def confirm(site: str, rid: str, request: Request, response: Response) -> JSONResponse:
    s = sess(request, response)
    try:
        text = ss.confirm(s, rid)
    except KeyError:
        return fail(404, "NOT_FOUND", "unknown resource")
    except ValueError as exc:
        return fail(409, "CONFLICT", str(exc))
    LOG.append(s.site_key, "resource_state", {"resource": rid, "state": "up", "role": role(request)},
               s.state.eval_time)
    s.note(text)
    return respond(s, request, response)


@app.post("/api/v1/sites/{site}/plans")
def make_plan(site: str, request: Request, response: Response) -> JSONResponse:
    s = sess(request, response)
    snap, dec = s.evaluate(POL)
    p = planner.plan(dec, POL, previous=s.approved)
    verdict = chk.check(snap.model_dump(mode="json"), p.model_dump(mode="json"))
    s.proposed, s.proposed_check, s.unsafe_check = p, verdict, None
    LOG.append(s.site_key, "plan_proposed", {"plan_id": p.plan_id, "status": p.status}, snap.eval_time)
    LOG.append(s.site_key, "checker_verdict", {"plan_id": p.plan_id, "verdict": verdict["verdict"],
                                               "violations": verdict["violations"]}, snap.eval_time)
    s.note(f"Plan {p.plan_id} proposed ({p.status}); checker {verdict['verdict']}")
    return respond(s, request, response)


class CheckIn(BaseModel):
    template: Literal["keep_previous"] | None = None
    plan: dict[str, Any] | None = None


@app.post("/api/v1/sites/{site}/plans/check")
def check_plan(site: str, body: CheckIn, request: Request, response: Response) -> JSONResponse:
    """Check an arbitrary plan. template=keep_previous re-submits the last approved actions
    ("keep working as scheduled") bound to the CURRENT snapshot, so violations are substantive."""
    s = sess(request, response)
    snap, _ = s.evaluate(POL)
    current = views.snapshot_id(snap)
    if body.plan is not None:
        candidate = body.plan
    elif s.approved is not None:
        candidate = {**s.approved.model_dump(mode="json"), "snapshot_id": current,
                     "plan_id": "unsafe-keep-previous"}
    else:
        return fail(409, "CONFLICT", "no previous plan to re-submit")
    verdict = chk.check(snap.model_dump(mode="json"), candidate)
    s.unsafe_check = {"plan": candidate, "checker": verdict}
    LOG.append(s.site_key, "checker_verdict", {"plan_id": candidate.get("plan_id"), "verdict":
                                               verdict["verdict"], "violations": verdict["violations"]},
               snap.eval_time)
    s.note(f"Submitted plan {candidate.get('plan_id')}: checker {verdict['verdict']} "
           f"({len(verdict['violations'])} violations)", "checker")
    return respond(s, request, response)


@app.post("/api/v1/sites/{site}/plans/{plan_id}/approve")
def approve(site: str, plan_id: str, request: Request, response: Response) -> JSONResponse:
    s = sess(request, response)
    if role(request) == "worker":
        return fail(403, "FORBIDDEN", "only supervisors approve plans")
    p: Plan | None = s.proposed
    if p is None or p.plan_id != plan_id or (s.proposed_check or {}).get("verdict") != "approved":
        return fail(409, "NOT_APPROVABLE", "only a plan the checker approved can be applied")
    s.approved = p
    LOG.append(s.site_key, "plan_approved", {"plan_id": plan_id, "role": role(request)}, s.state.eval_time)
    s.note(f"Plan {plan_id} approved by supervisor")
    return respond(s, request, response)


class EscalationIn(BaseModel):
    crew_id: str = Field(pattern=ID_PATTERN)
    close: bool = False
    confirm: Literal[True]


@app.post("/api/v1/sites/{site}/escalations")
def escalation(site: str, body: EscalationIn, request: Request, response: Response) -> JSONResponse:
    s = sess(request, response)
    if body.crew_id not in {c["crew_id"] for c in ss.sc.site_config()["crews"]}:
        return fail(404, "NOT_FOUND", "unknown crew")
    try:
        text = ss.escalate(s, body.crew_id, body.close, role(request))
    except PermissionError as exc:
        return fail(403, "FORBIDDEN", str(exc))
    LOG.append(s.site_key, "symptom_escalation", {"crew_id": body.crew_id, "close": body.close},
               s.state.eval_time, crew_id=body.crew_id)
    s.note(text, "escalation")
    return respond(s, request, response)


@app.get("/api/v1/sites/{site}/offline-pack")
def offline_pack(site: str, request: Request, response: Response) -> JSONResponse:
    s = sess(request, response)
    return envelope(offline.build_pack(s, POL))


@app.get("/api/v1/sites/{site}/cards")
def cards(site: str, request: Request, response: Response) -> JSONResponse:
    s = sess(request, response)
    return envelope(offline.cards(s, POL))


@app.get("/api/v1/evaluation")
def evaluation() -> JSONResponse:
    out = {}
    for f in sorted(EVAL_OUT.glob("*.json")):
        out[f.stem] = json.loads(f.read_text())
    return envelope(out)


@app.get("/api/v1/policy")
def policy() -> JSONResponse:
    raw = json.loads((REPO / "policy" / "abudhabi-heat-v1.json").read_text())
    raw.get("clim_p99_raw", {}).pop("value", None)
    return envelope(raw)


if WEB_DIST.exists():
    app.mount("/assets", StaticFiles(directory=WEB_DIST / "assets"), name="assets")

    @app.get("/{path:path}", include_in_schema=False)
    def spa(path: str) -> FileResponse:
        f = (WEB_DIST / path).resolve()
        if path and f.is_file() and WEB_DIST.resolve() in f.parents:
            return FileResponse(f)
        return FileResponse(WEB_DIST / "index.html")

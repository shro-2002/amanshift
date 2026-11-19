"""Checker's own reading of a canonical snapshot: bounds, edges, limits, levels.

Re-implemented from doc 05 (not imported from the planner side). Declarative lookups over the
snapshot JSON; no optimisation. Comparisons use 9-dp rounding (canonical comparison rule).
"""

from __future__ import annotations

from datetime import datetime, timedelta, timezone
from typing import Any

from amanshift_checker.policy import CheckerPolicy

PREC = 9
REST_KINDS = {"shade", "cooled_rest"}


def ts(s: str) -> datetime:
    return datetime.strptime(s, "%Y-%m-%dT%H:%M:%SZ").replace(tzinfo=timezone.utc)  # noqa: UP017


class SiteView:
    def __init__(self, snap: dict[str, Any], pol: CheckerPolicy) -> None:
        self.s = snap
        self.p = pol
        self.now = ts(snap["eval_time"])
        self.crews = {c["crew_id"]: c for c in snap["crews"]}
        self.res = {r["resource_id"]: r for r in snap["resources"]}
        self.walks: dict[str, float] = snap["graph"]["walk_min"]

    # ---- time helpers
    def loc(self, t: datetime) -> datetime:
        return t + timedelta(hours=self.p.tz_h)

    def same_local_day(self, a: datetime, b: datetime) -> bool:
        return self.loc(a).date() == self.loc(b).date()

    # ---- environment
    def _fresh(self, ev: dict[str, Any]) -> bool:
        if ev.get("trust", "fresh") != "fresh":
            return False
        pv = ev["provenance"]
        got = (self.now - ts(pv["retrieved_at"])).total_seconds() / 3600.0
        if pv.get("issued_at") is None:
            return False
        issued = (self.now - ts(pv["issued_at"])).total_seconds() / 3600.0
        return got <= self.p.max_retrieval_h and issued <= self.p.max_issue_h

    def wbgt_bound(self, zone: str, t: datetime, kind: str) -> float:
        key = "wbgt_sun_c" if kind == "sun" else "wbgt_shade_c"
        hour = t.replace(minute=0, second=0)
        values: list[float] = []
        fresh_flags: list[bool] = []
        for ev in self.s["env"]:
            pv = ev["provenance"]
            if ev["zone_id"] != zone or ev.get(key) is None:
                continue
            if pv["kind"] == "measured":
                if (ev.get("meter_location") == kind and ts(pv["valid_at"]) <= self.now
                        and self.same_local_day(ts(pv["valid_at"]), t)):
                    values.append(float(ev[key]))
                continue
            if ts(pv["valid_at"]).replace(minute=0, second=0) == hour:
                values.append(float(ev[key]) + self.p.delta)
                fresh_flags.append(self._fresh(ev))
        if not fresh_flags or not all(fresh_flags):
            lt = self.loc(t)
            values.append(self.p.seasonal_bound(lt.month, lt.hour, kind))
        return max(values)

    def twl_class(self, zone: str, t: datetime) -> str | None:
        vals = [
            float(ev["twl_wm2"]) for ev in self.s["env"]
            if ev["provenance"]["kind"] == "measured" and ev["zone_id"] == zone
            and ev.get("twl_wm2") is not None and ts(ev["provenance"]["valid_at"]) <= self.now
            and self.same_local_day(ts(ev["provenance"]["valid_at"]), t)
        ]
        if not vals:
            return None
        lowest = min(vals)
        if lowest <= self.p.twl_high_max:
            return "high"
        return "medium" if lowest <= self.p.twl_medium_max else "low"

    def in_midday(self, crew: dict[str, Any], t: datetime) -> bool:
        m = self.p.midday
        if crew["exposure"] not in m["exposures"]:
            return False
        lt = self.loc(t)
        if not (m["from_mmdd"] <= lt.strftime("%m-%d") <= m["to_mmdd"]):
            return False
        return bool(m["start"] <= lt.strftime("%H:%M") < m["end"])

    # ---- resources
    def walk(self, a: str, b: str) -> float:
        if a == b:
            return 0.0
        k = "|".join(sorted((a, b)))
        return float(self.walks[k]) if k in self.walks else float("inf")

    def resource_ok(self, rid: str, crew: dict[str, Any]) -> str | None:
        """None if usable by crew, else a reason."""
        r = self.res.get(rid)
        if r is None:
            return f"resource {rid} does not exist"
        if r["state"] != "up":
            return f"resource {rid} is {r['state'].upper()}"
        if r.get("last_confirmed_at") is None:
            return f"resource {rid} never confirmed"
        age = (self.now - ts(r["last_confirmed_at"])).total_seconds() / 60.0
        if age > self.p.ttl_min:
            return f"resource {rid} confirmation expired ({age:.0f} min)"
        if self.walk(crew["zone_id"], r["zone_id"]) > self.p.walk_limit[r["type"]]:
            return f"resource {rid} beyond walk limit"
        return None

    def usable(self, crew: dict[str, Any], kinds: set[str]) -> list[str]:
        return sorted(rid for rid, r in self.res.items()
                      if r["type"] in kinds and self.resource_ok(rid, crew) is None)

    # ---- limits
    def twa_ok(self, crew: dict[str, Any], f: float, t: datetime, rest_id: str | None) -> bool:
        cav = self.p.cav[crew["ppe"]]
        expo = "sun" if crew["exposure"] == "direct_sun" else "shade"
        w_work = self.wbgt_bound(crew["zone_id"], t, expo) + cav
        if rest_id is None:
            w_rest = w_work
        else:
            w_rest = self.wbgt_bound(self.res[rest_id]["zone_id"], t, "shade") + cav
        m = f * self.p.met[crew["workload"]] + (1.0 - f) * self.p.met_rest
        lim = self.p.wbgt_limit(m, crew["acclimatization"] == "acclimatized")
        return round(w_rest + f * (w_work - w_rest), PREC) <= round(lim, PREC)

    def twl_rules(self, crew: dict[str, Any], t: datetime) -> tuple[float, int]:
        """(fraction cap, minimum level) from ADOSH TWL zone of the crew's zone."""
        cls = self.twl_class(crew["zone_id"], t)
        if cls not in ("medium", "high"):
            return 1.0, 1
        caps = self.p.twl_caps
        cap = float(caps[cls]["f_cap"][crew["workload"]])
        lvl = int(caps[cls]["min_level"][crew["workload"]])
        if crew["acclimatization"] != "acclimatized" or crew["size"] <= caps["stop_level_crew_size_max"]:
            lvl = int(caps["stop_level_unacclimatized"])
        return cap, lvl

    def allowed_fraction(self, crew: dict[str, Any], f: float, t: datetime, rest_id: str | None,
                         ) -> bool:
        cap, _ = self.twl_rules(crew, t)
        if f > cap:
            return False
        if rest_id is None and f < 1.0:
            return False
        return self.twa_ok(crew, f, t, rest_id)

    def best_fraction(self, crew: dict[str, Any], t: datetime) -> float:
        if not self.usable(crew, {"water"}):
            return 0.0
        options = [None, *self.usable(crew, REST_KINDS)]
        ok = [f for f in self.p.fractions for r in options if self.allowed_fraction(crew, f, t, r)]
        return max(ok, default=0.0)

    def raw_level(self, crew: dict[str, Any], t: datetime) -> int:
        f = self.best_fraction(crew, t)
        if f == 0.0:
            lvl = 4
        elif f < 1.0:
            lvl = 3
        else:
            expo = "sun" if crew["exposure"] == "direct_sun" else "shade"
            w = self.wbgt_bound(crew["zone_id"], t, expo) + self.p.cav[crew["ppe"]]
            lvl = 2 if w > self.p.wbgt_limit(self.p.met[crew["workload"]], False) else 1
        if self.in_midday(crew, t) or crew.get("escalation_active"):
            lvl = 4
        return max(lvl, self.twl_rules(crew, t)[1])

    def effective(self, crew_id: str) -> tuple[int, float]:
        crew = self.crews[crew_id]
        lvl, cap = self.raw_level(crew, self.now), self.best_fraction(crew, self.now)
        prev = self.s.get("prev_eval", {}).get(crew_id)
        if prev:
            lvl, cap = max(lvl, int(prev["raw_level"])), min(cap, float(prev["f_max"]))
        return lvl, (0.0 if lvl >= 4 else cap)

    def defer_slots(self, crew: dict[str, Any]) -> set[datetime]:
        step = timedelta(minutes=self.p.tick_min)
        lt = self.loc(self.now)
        t = self.now - timedelta(minutes=lt.minute % self.p.tick_min, seconds=lt.second) + step
        stop_at = self.now + (lt.replace(hour=self.p.work_end_h, minute=0, second=0) - lt)
        out: set[datetime] = set()
        while t <= stop_at:
            if self.raw_level(crew, t) <= 3:
                out.add(t)
            t += step
        return out

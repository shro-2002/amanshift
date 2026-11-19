// Plain-language view of server state (doc 12 §7–§8). Pure functions: no decision logic, no new numbers —
// every count is a sum over fields the server returned.
import type { Action, CrewView, ResourceView, SiteDisplay, SiteState } from "../api/client";

export const REST_TYPES = new Set(["shade", "cooled_rest"]);
const CONFIRM_STALE_MIN = 30; // mirrors policy resource TTL; display hint only, trust comes from the server

export const crewName = (d: SiteDisplay | undefined, id: string) => d?.crews?.[id] ?? `Crew ${id}`;
export const zoneName = (d: SiteDisplay | undefined, id: string) => d?.zones?.[id] ?? `Zone ${id}`;
export const resName = (d: SiteDisplay | undefined, id: string | null | undefined) =>
  id ? d?.resources?.[id] ?? id : "—";

export const TYPE_LABEL: Record<ResourceView["type"], string> = {
  shade: "Shade area", cooled_rest: "Cooled rest cabin", water: "Water station",
};

/** Displayed level never below the server level; offline overrides can only raise it. */
export function levelOf(c: CrewView, override: Record<string, number>): number {
  return Math.max(c.display_level, override[c.crew_id] ?? 0);
}

/** Site-local HH:MM for a UTC ISO time; offset taken from the server's own local rendering of eval_time. */
export function hhmm(iso: string | null | undefined, offMin = 0): string {
  if (!iso) return "";
  const t = Date.parse(iso);
  if (Number.isNaN(t)) return iso;
  const d = new Date(t + offMin * 60000);
  return `${String(d.getUTCHours()).padStart(2, "0")}:${String(d.getUTCMinutes()).padStart(2, "0")}`;
}

export function tzOffsetMin(s: SiteState): number {
  const utc = new Date(Date.parse(s.eval_time));
  const [h, m] = s.eval_time_local.split(":").map(Number);
  let off = h * 60 + m - (utc.getUTCHours() * 60 + utc.getUTCMinutes());
  if (off > 720) off -= 1440;
  if (off < -720) off += 1440;
  return off;
}

/** One sentence a supervisor can act on. Mirrors the plan action; never invents a permission. */
export function actionText(c: CrewView, d: SiteDisplay | undefined, offMin = 0): string {
  if (c.escalated) return "Stop and cool down. Symptom report open — the medic must review.";
  const a = c.action;
  if (!a || !c.action_valid) {
    return c.display_level === 4 ? "Stop work. No current plan protects this crew." : "Waiting for a protection plan.";
  }
  return planActionText(a, d, offMin);
}

/** Plan action in words (limits, never permission). */
export function planActionText(a: Action, d: SiteDisplay | undefined, offMin = 0): string {
  const rest = a.rest_resource ? resName(d, a.rest_resource) : null;
  if (a.action === "stop") return rest ? `Stop work. Rest at ${rest}.` : "Stop work. Go to the nearest shade.";
  if (a.action === "defer") return `Move this task to after ${hhmm(a.defer_until, offMin)}.`;
  const f = a.work_fraction ?? 1;
  if (f >= 1) return "Continue work. A cup of water every 15–20 minutes.";
  const work = Math.round(f * 60);
  return `Work up to ${work} min per hour, rest ${60 - work} min${rest ? ` at ${rest}` : ""}.`;
}

export type Severity = "critical" | "warning" | "info";
export interface Alert {
  id: string; severity: Severity; title: string; detail: string; crews: string[]; persons: number; action: string;
  /** Why intervention is required, in one plain sentence. */
  why?: string;
}

export const persons = (s: SiteState, ids: string[]) =>
  s.crews.filter((c) => ids.includes(c.crew_id)).reduce((n, c) => n + c.size, 0);

/** Crews that lost a rest/water edge to this resource (server "lost" edges). */
export function affectedBy(s: SiteState, rid: string): string[] {
  return [...new Set(s.coverage.edges.filter((e) => e.resource === rid && e.status === "lost").map((e) => e.crew))];
}

const edgesFor = (c: CrewView, r: ResourceView) => (r.type === "water" ? c.water_edges : c.rest_edges);

/** Crews for which this resource is the only reachable option of its kind (rest or water) right now. */
export function soleDependants(s: SiteState, r: ResourceView): string[] {
  return s.crews.filter((c) => { const e = edgesFor(c, r); return e.length === 1 && e[0] === r.resource_id; }).map((c) => c.crew_id);
}

/** Crews that lost this resource and now have no other option of its kind. */
export function strandedBy(s: SiteState, r: ResourceView): string[] {
  return affectedBy(s, r.resource_id).filter((id) => {
    const c = s.crews.find((x) => x.crew_id === id);
    return c ? edgesFor(c, r).length === 0 : false;
  });
}

export function uncovered(s: SiteState): string[] {
  return s.crews.filter((c) => c.rest_edges.length === 0).map((c) => c.crew_id);
}

/** Crews needing supervisor intervention now: stop level, no rest reachable, symptom report, or outdated action. */
export function needIntervention(s: SiteState, override: Record<string, number>): string[] {
  return s.crews.filter((c) => levelOf(c, override) === 4 || c.rest_edges.length === 0 || c.escalated || (c.action && !c.action_valid))
    .map((c) => c.crew_id);
}

export function confirmedRestPlaces(s: SiteState): number {
  return s.coverage.resources.filter((r) => REST_TYPES.has(r.type) && r.trusted).reduce((n, r) => n + r.capacity, 0);
}

export const TONE_CLASS: Record<Severity | "ok", string> = { ok: "ok", critical: "crit", warning: "warn", info: "" };

export function resourceStatus(r: ResourceView): { label: string; tone: Severity | "ok" } {
  if (r.state === "down") return { label: "Unavailable", tone: "critical" };
  if (r.state === "unconfirmed") return { label: "Restored — confirm on site", tone: "warning" };
  if (r.state === "unknown" || !r.trusted) return { label: "Not confirmed", tone: "warning" };
  if (r.confirmed_age_min !== null && r.confirmed_age_min > CONFIRM_STALE_MIN) return { label: "Confirmation due", tone: "warning" };
  return { label: "Available", tone: "ok" };
}

const names = (d: SiteDisplay | undefined, ids: string[]) => ids.map((id) => crewName(d, id)).join(", ");

/** Alerts derived only from state; order = severity, then the order the server reported. */
export function deriveAlerts(s: SiteState, isOffline: boolean): Alert[] {
  const d = s.site.display;
  const out: Alert[] = [];
  for (const c of s.crews.filter((x) => x.escalated)) {
    out.push({ id: `esc-${c.crew_id}`, severity: "critical", title: `Symptom report — ${crewName(d, c.crew_id)}`,
      detail: "The crew is stopped. Cool down, do not leave anyone alone, call the emergency number if symptoms are severe.",
      crews: [c.crew_id], persons: c.size, action: "Medic review required to close.", why: "A symptom report was raised for this crew." });
  }
  const reported = new Set<string>();
  for (const r of s.coverage.resources.filter((x) => x.state === "down")) {
    const lost = affectedBy(s, r.resource_id);
    const kind = r.type === "water" ? "water station" : "rest area";
    const stranded = strandedBy(s, r);
    const others = lost.length - stranded.length;
    stranded.forEach((id) => reported.add(id));
    const p = persons(s, stranded);
    out.push({ id: `down-${r.resource_id}`, severity: "critical", title: `${resName(d, r.resource_id)} unavailable`,
      detail: (stranded.length ? `${p} workers in ${stranded.length} crew${stranded.length > 1 ? "s" : ""} (${names(d, stranded)}) now have no ${kind} within walking limit.`
        : `Every crew that used it still has another reachable ${kind}.`) + (others ? ` ${others} other crew${others > 1 ? "s" : ""} lost an alternative.` : ""),
      crews: stranded.length ? stranded : lost, persons: p,
      why: stranded.length ? `Their heat limit requires rest breaks, and no other confirmed ${kind} is within walking distance.` : undefined,
      action: stranded.length ? "Suspend affected tasks, generate a new protection plan and arrange an alternative before work resumes." : "Generate a new protection plan." });
  }
  const none = uncovered(s).filter((id) => !reported.has(id));
  if (none.length) {
    out.push({ id: "uncovered", severity: "critical", title: `${persons(s, none)} workers have no reachable rest area`,
      detail: `${names(d, none)}: no trusted shade or cooled rest within the walking limit.`,
      crews: none, persons: persons(s, none), action: "Suspend affected tasks until a rest area is available and confirmed.",
      why: "Work in this heat needs a confirmed rest area within walking distance." });
  }
  const stopped = s.crews.filter((c) => c.display_level === 4 && !c.escalated && c.rest_edges.length > 0 && c.action_valid)
    .map((c) => c.crew_id);
  if (stopped.length) {
    out.push({ id: "stopped", severity: "warning", title: `${names(d, stopped)}: stop work required`,
      detail: `${persons(s, stopped)} workers cannot work within the heat limit for their task right now. The plan assigns rest in shade until conditions ease or the task changes.`,
      crews: stopped, persons: persons(s, stopped), action: "Confirm on site that the crew has stopped and is resting in the assigned shade with water.",
      why: "Estimated heat stress exceeds the limit for this task, even with work/rest breaks." });
  }
  if (s.forecast.tier !== "fresh") {
    out.push({ id: "forecast", severity: "warning", title: s.forecast.tier === "lost" ? "Forecast unavailable" : "Forecast out of date",
      detail: "Levels use a conservative seasonal upper bound until a fresh forecast arrives. Protection can only tighten.",
      crews: [], persons: 0, action: "No action needed to stay protected; restore the forecast feed to reduce restrictions." });
  }
  for (const r of s.coverage.resources.filter((x) => x.state === "unconfirmed")) {
    out.push({ id: `unconf-${r.resource_id}`, severity: "warning", title: `${resName(d, r.resource_id)} awaiting confirmation`,
      detail: "Reported restored but not yet checked on site. It is not used for protection until confirmed.",
      crews: [], persons: 0, action: "Physically check it, then confirm on site." });
  }
  if (isOffline) {
    out.push({ id: "offline", severity: "warning", title: "Network offline",
      detail: "Devices show the last plan and tighten to conservative levels as time passes. New failures cannot be seen.",
      crews: [], persons: 0, action: "Check resources in person; reconnect to refresh the plan." });
  }
  if (s.plan && (s.plan.stale || !s.plan.approved)) {
    out.push({ id: "plan", severity: "info", title: s.plan.stale ? "Conditions changed since the last plan" : "Protection plan awaiting review",
      detail: s.plan.stale ? "The current plan was made for earlier conditions." : "A plan has been generated and checked; a supervisor must accept it.",
      crews: [], persons: 0, action: s.plan.stale ? "Generate a new protection plan." : "Review and accept the plan." });
  }
  const rank: Record<Severity, number> = { critical: 0, warning: 1, info: 2 };
  return out.sort((a, b) => rank[a.severity] - rank[b.severity]);
}

/** Policy-check summary in operational language (never "approved to work"). */
export function policyCheck(v: { verdict: string; violations: unknown[]; rules_evaluated: number } | undefined) {
  if (!v) return { ok: false, label: "Not checked" };
  if (v.verdict === "approved") return { ok: true, label: `Policy check passed · ${v.rules_evaluated} safety rules` };
  if (v.verdict === "rejected") return { ok: false, label: `Policy check failed · ${v.violations.length} rule breaches` };
  return { ok: false, label: "Policy check could not run" };
}

const REASONS: Record<string, string> = {
  ABOVE_RAL: "Heat exceeds the limit for unacclimatized workers",
  COVERAGE_FORCED: "Level raised because protection coverage is missing",
  DWELL: "Held at the stricter level for at least one review interval",
  ESCALATION: "Symptom report open",
  FORECAST_DEGRADED: "Forecast unavailable or out of date — conservative bound used",
  METER: "Onsite meter reading applied",
  MIDDAY_BREAK: "Federal midday work break (direct sun)",
  NO_COVERAGE: "No reachable rest area",
  NO_FEASIBLE_WORK: "No work schedule stays within the heat limit",
  NO_REST_CAPACITY: "Rest areas are full",
  NO_WATER: "No reachable water station",
  NO_WATER_CAPACITY: "Water stations are at capacity",
  PROTECTION_INSUFFICIENT: "Not enough protection available for this crew",
  REASSIGNED: "Protection reassigned after a change",
  STANDARD: "Within standard limits",
};

export function reasonText(code: string): string {
  return REASONS[code] ?? code.toLowerCase().replace(/_/g, " ").replace(/^\w/, (m) => m.toUpperCase());
}

const WORK: Record<string, string> = { light: "Light", moderate: "Moderate", heavy: "Heavy", very_heavy: "Very heavy" };
const EXPO: Record<string, string> = { direct_sun: "in direct sun", shaded_outdoor: "in outdoor shade", indoor_unconditioned: "indoors without air conditioning" };

/** "Heavy work in polyolefin coveralls in direct sun" — task context only, no personal data. */
export function taskContext(c: CrewView): string {
  return `${WORK[c.workload] ?? c.workload} work in ${c.ppe.replace(/_/g, " ")} ${EXPO[c.exposure] ?? c.exposure.replace(/_/g, " ")}, ${c.acclimatization}`;
}

/** Replace stable ids (C1, R2, Z3) in server text with operational names; the id stays in brackets. */
export function humanize(text: string, d: SiteDisplay | undefined): string {
  return text.replace(/\b([CRWZ]\d+)\b/g, (id) => {
    const name = d?.crews?.[id] ?? d?.resources?.[id] ?? d?.zones?.[id];
    return name ? `${name} (${id})` : id;
  }).replace(/\bDOWN\b/g, "unavailable");
}

/** A plan is current only while the server says it was made for the present conditions. */
export function isPlanCurrent(s: SiteState): boolean {
  return s.plan !== null && !s.plan.stale;
}

export interface Briefing { tone: "crit" | "warn" | "ok"; headline: string; facts: [string, string][]; next: string }

/** Protection briefing assembled deterministically from server state (doc 13 §4) — no language model. */
export function briefing(s: SiteState, override: Record<string, number>, isOffline: boolean): Briefing {
  const d = s.site.display;
  const alerts = deriveAlerts(s, isOffline);
  const rest = s.coverage.resources.filter((r) => REST_TYPES.has(r.type));
  const trusted = rest.filter((r) => r.trusted).length;
  const protection = `${trusted} of ${rest.length} rest areas confirmed · ${confirmedRestPlaces(s)} places`;
  const planLine = !s.plan ? "No protection plan yet"
    : !isPlanCurrent(s) ? "Previous plan no longer matches conditions — not in effect"
    : s.plan.status === "protection_insufficient" ? "Current plan stops tasks it cannot protect"
    : s.plan.approved ? "Current plan acknowledged" : "Current plan awaiting acknowledgement";
  const top = alerts.find((a) => a.crews.length > 0) ?? alerts[0];
  if (!top) {
    const need = needIntervention(s, override);
    return { tone: "ok", headline: "Every crew has a current protective action",
      facts: [["Crews", `${s.coverage.total_crews} crews, ${s.coverage.total_persons} workers`], ["Protection", protection], ["Plan", planLine]],
      next: need.length ? "Confirm on site that stopped crews are resting in shade." : "Reconfirm shade, cooling and water on site within 30 minutes." };
  }
  const facts: [string, string][] = [];
  if (top.crews.length) facts.push(["Affected", `${names(d, top.crews)} · ${top.persons} workers`]);
  if (top.why) facts.push(["Why", top.why]);
  facts.push(["Protection", protection], ["Plan", planLine]);
  const more = alerts.length - 1;
  return { tone: top.severity === "critical" ? "crit" : "warn",
    headline: top.persons && top.id.startsWith("down-") ? `${top.title} — ${top.persons} workers need alternative protection` : top.title,
    facts: more > 0 ? [...facts, ["Also", `${more} more item${more > 1 ? "s" : ""} in Protection`]] : facts, next: top.action };
}

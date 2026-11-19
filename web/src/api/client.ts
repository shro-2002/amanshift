// Thin API client. The browser holds no decision logic: every level comes from the server
// (or from the offline degrader, which only takes maxima of server-computed levels).

export interface Violation { rule: string; crew_id: string | null; message: string; citation: string }
export interface Verdict { verdict: "approved" | "rejected" | "error"; checker_version: string; violations: Violation[]; rules_evaluated: number }
export interface Action {
  crew_id: string; action: "work" | "stop" | "defer"; work_fraction: number | null; rest_resource: string | null;
  water_resource: string | null; defer_until: string | null; clinical_escalation: boolean; reason_codes: string[];
}
export interface Trace {
  estimated_wbgt_c: number; estimated_wbgt_kind: string; clothing_adjustment_c: number; effective_wbgt_c: number;
  metabolic_w: number; limit_kind: "REL" | "RAL"; limit_full_work_c: number; ral_c: number; forecast_margin_c: number;
  f_max: number; f_cap_effective: number; twl_zone: string | null; twl_cap: number;
}
export interface CrewView {
  crew_id: string; size: number; workload: string; ppe: string; acclimatization: string; exposure: string; zone_id: string;
  level: number; display_level: number; level_name: string; raw_level: number; degraded: boolean; escalated: boolean;
  trace: Trace; floors: string[]; reasons: string[]; rest_edges: string[]; water_edges: string[];
  work_options: { f: number; rest: string | null; water: string }[]; defer_earliest: string | null; action: Action | null; action_valid: boolean;
}
export interface ResourceView {
  resource_id: string; type: "shade" | "cooled_rest" | "water"; zone_id: string; capacity: number; state: string;
  confirmed_age_min: number | null; trusted: boolean; load: number;
}
export interface Coverage {
  covered_crews: string[]; total_crews: number; covered_persons: number; total_persons: number;
  edges: { crew: string; resource: string; status: "assigned" | "available" | "lost" }[];
  resources: ResourceView[]; zones: string[]; walk_min: Record<string, number>;
}
export interface Plan {
  plan_id: string; snapshot_id: string; policy_version: string; status: "feasible" | "protection_insufficient";
  actions: Action[]; objective: Record<string, number>; checker: Verdict; approved: boolean; stale: boolean;
}
export interface Timeline {
  hours: { hour: number; wbgt_sun_est: number; wbgt_shade_est: number; site_max_level: number }[];
  midday_break: { start: string; end: string; from: string; to: string }; now: string;
  meters: { zone: string; location: string | null; wbgt: number | null; twl: number | null; at: string }[];
  provenance: { source: string; kind: string; label: string };
}
export interface SiteState {
  site: { site_id: string; label: string; synthetic: boolean }; scenario_date: string; eval_time: string;
  eval_time_local: string; connectivity: string; policy_version: string; snapshot_id: string;
  forecast: { source: string; kind?: string; issued_at?: string; retrieved_at?: string; age_min?: number; tier: string; label?: string };
  level_counts: Record<string, number>; crews: CrewView[]; coverage: Coverage; plan: Plan | null;
  approved_plan_id: string | null; unsafe_check: { plan: Plan; checker: Verdict } | null; timeline: Timeline;
  log: { at: string; text: string; kind: string }[]; chain_ok: boolean; banners: { kind: string; text: string }[];
}
export interface Card {
  crew_id: string; level: number; key: "standard" | "increased" | "work_rest" | "stop" | "escalation";
  work_min: number | null; rest_min: number | null; rest: string | null; water: string | null;
  updated_local: string; degraded: boolean; provenance: string;
}

export class ApiError extends Error {
  constructor(public code: string, message: string) { super(message); }
}

const SITE = "/api/v1/sites/demo-site-a";

async function call<T>(method: string, path: string, body?: unknown): Promise<T> {
  const res = await fetch(path, {
    method, credentials: "same-origin",
    headers: body === undefined ? {} : { "Content-Type": "application/json" },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  const json = (await res.json()) as { data: T; error: { code: string; message: string } | null };
  if (!res.ok || json.error) throw new ApiError(json.error?.code ?? String(res.status), json.error?.message ?? "request failed");
  return json.data;
}

export const api = {
  load: () => call<SiteState>("POST", "/api/v1/scenarios/s-auh-1/load"),
  state: () => call<SiteState>("GET", `${SITE}/state`),
  inject: (type: string, target?: string, value?: Record<string, unknown>) =>
    call<SiteState>("POST", `${SITE}/failures`, { type, target: target ?? null, value: value ?? {} }),
  confirm: (rid: string) => call<SiteState>("POST", `${SITE}/resources/${rid}/confirm`),
  plan: () => call<SiteState>("POST", `${SITE}/plans`),
  checkUnsafe: () => call<SiteState>("POST", `${SITE}/plans/check`, { template: "keep_previous" }),
  approve: (id: string) => call<SiteState>("POST", `${SITE}/plans/${id}/approve`),
  escalate: (crew_id: string) => call<SiteState>("POST", `${SITE}/escalations`, { crew_id, confirm: true }),
  cards: () => call<{ cards: Card[]; plan_id: string | null; emergency_number: string }>("GET", `${SITE}/cards`),
  pack: () => call<import("../offline/degrader").OfflinePack & { cards: Card[] }>("GET", `${SITE}/offline-pack`),
  evaluation: () => call<Record<string, unknown>>("GET", "/api/v1/evaluation"),
};

import { api } from "../api/client";
import { crewName, humanize, isPlanCurrent, planActionText, policyCheck, tzOffsetMin } from "../site/derive";
import { useSite } from "../site/SiteContext";
import { Icon } from "./Icon";
import { LevelBadge } from "./LevelBadge";

const INSUFFICIENT = new Set(["PROTECTION_INSUFFICIENT", "NO_COVERAGE", "NO_REST_CAPACITY", "NO_WATER", "NO_WATER_CAPACITY"]);

// Protection plan review: plan in words, separately implemented policy check, human acceptance (doc 12 §6).
export function PlanReview({ limit, showList = true }: { limit?: number; showList?: boolean }) {
  const { s, busy, run } = useSite();
  if (!s) return null;
  const d = s.site.display;
  const plan = s.plan;
  const generate = <button className={plan?.stale || !plan ? "btn-primary" : ""} disabled={busy} onClick={() => run("Generate plan", () => api.plan())}><Icon name="refresh" size={16} />Generate protection plan</button>;
  if (!plan) {
    return (
      <section className="card" aria-labelledby="plan-h">
        <header><h2 id="plan-h">Protection plan</h2></header>
        <div className="body"><p className="muted">No plan has been generated for current conditions.</p></div>
        <div className="actions-bar">{generate}</div>
      </section>);
  }
  const current = isPlanCurrent(s);
  const check = current ? policyCheck(plan.checker) : { ok: false, label: "Checked against earlier conditions — not valid now" };
  const off = tzOffsetMin(s);
  const level = Object.fromEntries(s.crews.map((c) => [c.crew_id, c.display_level]));
  const unprotected = plan.actions.filter((a) => a.action === "stop" && a.reason_codes.some((r) => INSUFFICIENT.has(r))).map((a) => a.crew_id);
  const actions = [...plan.actions].sort((a, b) => (level[b.crew_id] ?? 0) - (level[a.crew_id] ?? 0));
  const shown = limit ? actions.slice(0, limit) : actions;
  const status = !current ? { cls: "warn", text: "Previous plan — conditions changed" } : plan.approved ? { cls: "ok", text: "Accepted · in effect" } : { cls: "", text: "Awaiting supervisor review" };
  return (
    <section className="card" aria-labelledby="plan-h">
      <header>
        <h2 id="plan-h">Protection plan</h2>
        <span className="chips"><span className={`pill ${status.cls}`}>{status.text}</span>
          <span className={`check ${check.ok ? "ok" : current ? "no" : "hist"}`}><Icon name={check.ok ? "check" : "x"} size={16} />{check.label}</span></span>
      </header>
      {!current && (
        <div className="body" style={{ paddingBlockEnd: 0 }}>
          <p className="notice crit"><b>This plan was made before the latest change and no longer protects every crew.</b> Its instructions are kept below for the record only. Current actions are shown per crew; generate a new plan.</p>
        </div>)}
      {current && plan.status === "protection_insufficient" && (
        <div className="body" style={{ paddingBlockEnd: 0 }}>
          <p className="notice crit"><b>No adequate protection arrangement exists for {unprotected.map((id) => crewName(d, id)).join(", ") || "some crews"}.</b> The plan stops {unprotected.length === 1 ? "this task" : "these tasks"} until a rest area is available and confirmed on site.</p>
        </div>)}
      {!showList ? null : !current ? (
        <div className="body" style={{ paddingBlock: 0 }}><details className="more"><summary>Previous instructions (historical, not in effect)</summary>
          <ul className="plan-list historical">{actions.map((a) => <li key={a.crew_id}><span><b>{crewName(d, a.crew_id)}</b><br /><s className="small muted">{planActionText(a, d, off)}</s></span></li>)}</ul>
        </details></div>
      ) : <ul className="plan-list">
        {shown.map((a) => (
          <li key={a.crew_id}>
            <span><b>{crewName(d, a.crew_id)}</b><br /><span className="small">{planActionText(a, d, off)}</span></span>
            <LevelBadge level={level[a.crew_id] ?? 1} english />
          </li>))}
      </ul>}
      {current && limit && actions.length > limit && <p className="small muted" style={{ padding: "0 var(--s-5) var(--s-3)" }}>+{actions.length - limit} more crews</p>}
      <div className="body" style={{ paddingBlock: 0 }}>
        <details className="more">
          <summary>Policy check details</summary>
          <p className="small muted">A separately implemented checker — separate code from the planner, reading the same cited policy file — re-evaluates every action before a plan can be accepted. It confirms policy compliance; it is not a regulatory certification or permission to work.</p>
          {plan.checker.violations.length > 0 && (
            <ul className="small" style={{ paddingInlineStart: 18 }}>
              {plan.checker.violations.map((v, i) => <li key={i}>{v.crew_id ? `${crewName(d, v.crew_id)}: ` : ""}{humanize(v.message, d)} <span className="muted">({v.citation})</span></li>)}
            </ul>)}
          <p className="xs muted mono">plan {plan.plan_id} · checker {plan.checker.checker_version} · policy {plan.policy_version}</p>
        </details>
      </div>
      <div className="actions-bar">
        {generate}
        <button className="btn-primary" disabled={busy || plan.approved || !current || !check.ok}
          title={!check.ok ? "Only current plans that pass the policy check can be acknowledged" : undefined}
          onClick={() => run("Acknowledge plan", () => api.approve(plan.plan_id))}><Icon name="check" size={16} />Acknowledge plan</button>
        <span className="xs muted">Acknowledging issues the plan to crews and is recorded. It is not permission to work.</span>
      </div>
    </section>
  );
}

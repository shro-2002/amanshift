import type { Plan, Verdict } from "../api/client";
import { RuleList } from "./RuleList";

interface Props { plan: Plan | null; unsafe: { plan: Plan; checker: Verdict } | null; snapshotId: string; policy: string }

// S8: checker evidence — all 10 active rules listed even when all pass.
export function CheckerPanel({ plan, unsafe, snapshotId, policy }: Props) {
  const v = unsafe?.checker ?? plan?.checker;
  if (!v) return null;
  return (
    <section className="panel" aria-labelledby="chk-h">
      <header>
        <h2 id="chk-h">Checker evidence {unsafe ? "— submitted plan “keep working as scheduled”" : `— plan ${plan?.plan_id}`}</h2>
        <span className={v.verdict === "approved" ? "verdict-ok" : "verdict-no"} role="status">
          {v.verdict === "approved" ? "✓ APPROVED" : "✗ REJECTED"} {v.checker_version} ({v.rules_evaluated - new Set(v.violations.map((x) => x.rule)).size}/{v.rules_evaluated} rules pass)
        </span>
      </header>
      {!unsafe && plan?.stale && <p className="banner info small" role="status">This verdict applies to the snapshot the plan was made for. Conditions have changed since — re-plan to check against the current state.</p>}
      <RuleList verdict={v} />
      <p className="small muted">Snapshot <span className="mono">{snapshotId.slice(0, 19)}…</span> · policy {policy}</p>
      <details className="small"><summary>Why independent?</summary>
        <p>The checker is a separate Python package (<span className="mono">amanshift_checker</span>) with no imports from the planner (an AST test enforces this). It parses the policy file with its own code, recomputes upper bounds, edges, NIOSH limits and levels from the canonical snapshot JSON, and evaluates declarative rules instead of optimising. Residual common-mode risk remains: same developer, same policy file, same specification.</p>
      </details>
    </section>
  );
}

import type { Verdict } from "../api/client";

const RULES: [string, string][] = [
  ["C1", "Every crew appears exactly once"],
  ["C2", "Work fraction within NIOSH REL/RAL 1-h TWA and TWL caps"],
  ["C3", "No direct-sun work in the midday break"],
  ["C4", "Resources up, confirmed within TTL, within walk limit, capacity respected"],
  ["C5", "Rest resource for work/rest; water for all work"],
  ["C6", "Level 4 crews only stop / defer / escalation"],
  ["C8", "Plan bound to snapshot hash and policy version"],
  ["C10", "Escalated crews stop with clinical escalation"],
  ["C11", "Plan schema valid (enum, fractions, no extra fields)"],
  ["C12", "Defer only to t ≥ t* where level ≤ 3"],
];

export function RuleList({ verdict }: { verdict: Verdict }) {
  return (
    <ul className="rules" aria-label="Checker rules">
      {RULES.map(([id, text]) => {
        const v = verdict.violations.filter((x) => x.rule === id);
        return (
          <li key={id}>
            <span aria-label={v.length ? "violated" : "passed"} className={v.length ? "viol" : "cover-ok"}>{v.length ? "✗" : "✓"}</span>
            <span className="mono">{id}</span>
            <span>
              {text}
              {v.map((x, i) => (
                <div key={i} className="viol small">
                  {x.crew_id ? `Crew ${x.crew_id}: ` : ""}{x.message} <span className="muted">— {x.citation}</span>
                </div>
              ))}
            </span>
          </li>
        );
      })}
    </ul>
  );
}

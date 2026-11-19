import type { CrewView } from "../api/client";
import { LevelBadge } from "./LevelBadge";

export function gst(iso: string | null): string {
  if (!iso) return "—";
  return new Date(Date.parse(iso) + 4 * 3600_000).toISOString().slice(11, 16);
}

export function nowText(c: CrewView): string {
  const a = c.action;
  if (c.escalated) return "Stop · medic called";
  if (!a) return "—";
  if (!c.action_valid) return "Stop — plan outdated, re-plan";
  if (a.action === "stop") return a.rest_resource ? `Stop, rest at ${a.rest_resource}` : "Stop";
  if (a.action === "defer") return `Move task after ${gst(a.defer_until)}`;
  const f = a.work_fraction ?? 1;
  if (f >= 1) return `Work, water ${a.water_resource}`;
  const w = Math.round(f * 60);
  return `${w}/${60 - w} min, rest ${a.rest_resource}`;
}

const REASON: Record<string, string> = {
  NO_FEASIBLE_WORK: "above NIOSH limit", COVERAGE_FORCED: "no water/rest reachable", NO_WATER: "no water reachable",
  ABOVE_RAL: "above RAL", FORECAST_DEGRADED: "forecast degraded", METER: "meter reading", DWELL: "dwell (recent stricter level)",
  MIDDAY_BREAK: "midday break", ESCALATION: "clinical escalation", TWL_MEDIUM: "TWL medium", TWL_HIGH: "TWL high",
};

export function topReason(c: CrewView): string {
  const codes = [...c.floors, ...c.reasons, ...(c.action?.reason_codes ?? []).filter((r) => !r.startsWith("LEVEL_"))];
  if (codes.includes("PROTECTION_INSUFFICIENT") || codes.includes("NO_COVERAGE")) return "no protection capacity";
  if (!c.rest_edges.length && c.display_level >= 3 && !c.escalated) return "no rest resource reachable";
  const first = codes.find((r) => REASON[r]);
  return first ? REASON[first] : `effective WBGT ${c.trace.effective_wbgt_c} °C`;
}

interface Props { crews: CrewView[]; override: Record<string, number>; onOpen: (id: string) => void }

export function CrewTable({ crews, override, onOpen }: Props) {
  return (
    <table className="crew-table">
      <caption className="sr-only">Crews sorted by level, highest first</caption>
      <thead><tr><th scope="col">Crew</th><th scope="col">Level</th><th scope="col">Now</th><th scope="col">Cover</th><th scope="col">Why</th></tr></thead>
      <tbody>
        {crews.map((c) => {
          const lvl = Math.max(c.display_level, override[c.crew_id] ?? 0);
          const covered = c.action_valid && Boolean(c.action?.rest_resource && (c.action.water_resource || c.action.action === "stop"));
          const degraded = c.degraded || lvl > c.display_level;
          return (
            <tr key={c.crew_id} className={`row ${degraded ? "degraded" : ""}`} onClick={() => onOpen(c.crew_id)}>
              <td><button className="btn-quiet" onClick={(e) => { e.stopPropagation(); onOpen(c.crew_id); }}>
                <b>{c.crew_id}</b>&nbsp;<span className="muted">×{c.size}</span><span className="sr-only"> open detail</span></button></td>
              <td><LevelBadge level={lvl} degraded={degraded} english />{degraded && <> <span className="tag-conservative">CONSERVATIVE — data degraded</span></>}</td>
              <td>{nowText(c)}</td>
              <td className={covered ? "cover-ok" : "cover-no"}>{covered ? `✓ ${c.action?.rest_resource}` : "✗ none"}</td>
              <td className="muted">{topReason(c)}</td>
            </tr>
          );
        })}
      </tbody>
    </table>
  );
}

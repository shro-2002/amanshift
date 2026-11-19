import type { Coverage, CrewView } from "../api/client";

// S4: zone schematic, no map tiles or GPS. Edge state by colour AND dash pattern (colour-blind safe).
const W = 640, ZONE_W = 200, GAP = 10, CREW_Y = 64, RES_Y = 176;
const SHAPE = ["", "●", "▲", "◆", "⬢"];
const ICON: Record<string, string> = { shade: "⛱", cooled_rest: "❄︎", water: "💧" };

export function CoverageGraph({ coverage, crews }: { coverage: Coverage; crews: CrewView[] }) {
  const zx = (z: string) => GAP + coverage.zones.indexOf(z) * (ZONE_W + GAP);
  const pos: Record<string, [number, number]> = {};
  for (const z of coverage.zones) {
    const cs = crews.filter((c) => c.zone_id === z).sort((a, b) => a.crew_id.localeCompare(b.crew_id));
    cs.forEach((c, i) => { pos[c.crew_id] = [zx(z) + 40 + i * 64, CREW_Y]; });
    const rs = coverage.resources.filter((r) => r.zone_id === z);
    rs.forEach((r, i) => { pos[r.resource_id] = [zx(z) + 40 + i * 64, RES_Y]; });
  }
  const edgeStyle = { assigned: { stroke: "var(--brand)", w: 3, dash: "" },
    available: { stroke: "var(--ink-3)", w: 1, dash: "2 3" }, lost: { stroke: "var(--sev-4)", w: 2, dash: "7 4" } };
  return (
    <figure style={{ margin: 0 }}>
      <svg viewBox={`0 0 ${W} 240`} width="100%" role="img" aria-labelledby="cov-title">
        <title id="cov-title">Protection coverage schematic: crews, resources and edges</title>
        {coverage.zones.map((z) => (
          <g key={z}>
            <rect x={zx(z)} y={8} width={ZONE_W} height={222} rx={6} fill="var(--surface-2)" stroke="var(--line)" />
            <text x={zx(z) + 8} y={26} fontSize="12" fill="var(--ink-2)" fontWeight={600}>Zone {z}</text>
          </g>
        ))}
        {coverage.edges.filter((e) => pos[e.crew] && pos[e.resource]).map((e, i) => {
          const s = edgeStyle[e.status];
          const [x1, y1] = pos[e.crew], [x2, y2] = pos[e.resource];
          return <line key={i} x1={x1} y1={y1 + 18} x2={x2} y2={y2 - 18} stroke={s.stroke} strokeWidth={s.w} strokeDasharray={s.dash} />;
        })}
        {crews.map((c) => pos[c.crew_id] && (
          <g key={c.crew_id} transform={`translate(${pos[c.crew_id][0]},${pos[c.crew_id][1]})`}>
            <rect x={-26} y={-16} width={52} height={32} rx={14} fill={`var(--sev-${c.display_level})`} />
            <text textAnchor="middle" y={5} fontSize="12" fontWeight={600} fill={`var(--sev-${c.display_level}-ink)`}>
              {SHAPE[c.display_level]} {c.crew_id}
            </text>
            <text textAnchor="middle" y={30} fontSize="10" fill="var(--ink-2)">×{c.size}</text>
          </g>
        ))}
        {coverage.resources.map((r) => pos[r.resource_id] && (
          <g key={r.resource_id} transform={`translate(${pos[r.resource_id][0]},${pos[r.resource_id][1]})`}>
            <rect x={-28} y={-18} width={56} height={36} rx={4} fill="var(--surface)"
              stroke={r.trusted ? "var(--ink-2)" : "var(--sev-4)"} strokeDasharray={r.trusted ? "" : "4 3"} strokeWidth={r.trusted ? 1 : 2} />
            <text textAnchor="middle" y={-2} fontSize="12" fontWeight={600} fill="var(--ink)">{ICON[r.type]} {r.resource_id}</text>
            <text textAnchor="middle" y={12} fontSize="10" fill={r.trusted ? "var(--ink-2)" : "var(--sev-4-text)"}>
              {r.trusted ? `${r.load}/${r.capacity}` : r.state.toUpperCase()}
            </text>
          </g>
        ))}
      </svg>
      <figcaption className="small muted">
        Legend: <b style={{ color: "var(--brand)" }}>━ assigned</b> · ┄ available · <span style={{ color: "var(--sev-4-text)" }}>╍ lost (resource not trusted-up)</span> · dashed box = not usable · capacity shown as load/capacity
      </figcaption>
      <details className="small"><summary>Coverage as text</summary>
        <ul>{crews.map((c) => (
          <li key={c.crew_id}>Crew {c.crew_id} (zone {c.zone_id}): rest {c.rest_edges.join(", ") || "none reachable"}; water {c.water_edges.join(", ") || "none reachable"}; assigned {c.action?.rest_resource ?? "no rest"}</li>
        ))}</ul>
      </details>
    </figure>
  );
}

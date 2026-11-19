import type { KeyboardEvent } from "react";
import type { ResourceView, SiteState } from "../api/client";
import { crewName, levelOf, resName, zoneName } from "../site/derive";
import { ICON_PATHS, type IconName } from "./Icon";

// Synthetic worksite schematic (doc 12 §5.3). Crews are drawn at zone level only — no individual positions exist.
export type Sel = { kind: "crew" | "resource" | "zone"; id: string } | null;
interface Props { s: SiteState; override: Record<string, number>; sel: Sel; onSelect: (s: Sel) => void; compact?: boolean }

const W = 1200, H = 600, PAD = 36, TOP = 56, ZH = 430, GAP = 28, ROAD_Y = TOP + ZH + 34;
const RES_ICON: Record<ResourceView["type"], IconName> = { shade: "shade", cooled_rest: "cabin", water: "water" };
const SHAPE = ["", "●", "▲", "◆", "⬢"];

interface Box { x: number; y: number; w: number; h: number }
interface Layout { zones: Record<string, Box>; res: Record<string, Box>; crews: Record<string, Box> }

function layout(s: SiteState): Layout {
  const zs = s.coverage.zones;
  const zw = (W - 2 * PAD - GAP * (zs.length - 1)) / zs.length;
  const out: Layout = { zones: {}, res: {}, crews: {} };
  zs.forEach((z, i) => {
    const x = PAD + i * (zw + GAP);
    out.zones[z] = { x, y: TOP, w: zw, h: ZH };
    const rs = s.coverage.resources.filter((r) => r.zone_id === z);
    const rw = Math.min(150, (zw - 32 - 12 * (rs.length - 1)) / Math.max(rs.length, 1));
    rs.forEach((r, j) => { out.res[r.resource_id] = { x: x + 16 + j * (rw + 12), y: TOP + 196, w: rw, h: 92 }; });
    s.crews.filter((c) => c.zone_id === z).forEach((c, j) => {
      out.crews[c.crew_id] = { x: x + 16, y: TOP + 306 + j * 54, w: zw - 32, h: 44 };
    });
  });
  return out;
}

const mid = (b: Box) => ({ x: b.x + b.w / 2, y: b.y + b.h / 2 });

function act(fn: () => void) {
  return { onClick: fn, onKeyDown: (e: KeyboardEvent) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); fn(); } } };
}

function Structure({ z, b, i }: { z: string; b: Box; i: number }) {
  const sx = b.x + 16, sy = b.y + 44, sw = b.w - 32, sh = 136;
  if (i % 3 === 2) {
    return (
      <g aria-hidden="true">
        <rect x={sx} y={sy} width={sw} height={sh} rx="6" fill="var(--map-structure)" />
        {[0, 1, 2].map((k) => <circle key={k} cx={sx + 46 + k * 74} cy={sy + 62} r="30" fill="none" stroke="var(--map-line)" strokeWidth="2" />)}
        <line x1={sx + 16} x2={sx + sw - 16} y1={sy + 112} y2={sy + 112} stroke="var(--map-line)" strokeWidth="2" strokeDasharray="10 6" />
        <text x={sx + sw - 8} y={sy + sh - 8} textAnchor="end" className="map-tag">{z} · plant yard</text>
      </g>);
  }
  const cols = 6, rows = 3;
  return (
    <g aria-hidden="true">
      <rect x={sx} y={sy} width={sw} height={sh} rx="6" fill="var(--map-structure)" />
      {Array.from({ length: cols - 1 }, (_, k) => <line key={`c${k}`} x1={sx + ((k + 1) * sw) / cols} x2={sx + ((k + 1) * sw) / cols} y1={sy} y2={sy + sh} stroke="var(--map-line)" />)}
      {Array.from({ length: rows - 1 }, (_, k) => <line key={`r${k}`} x1={sx} x2={sx + sw} y1={sy + ((k + 1) * sh) / rows} y2={sy + ((k + 1) * sh) / rows} stroke="var(--map-line)" />)}
      {i % 3 === 0 && <g stroke="var(--map-crane)" strokeWidth="3" fill="none"><path d={`M${sx + sw - 40} ${sy + sh} V${sy + 6} M${sx + sw * 0.3} ${sy + 14} H${sx + sw - 12} M${sx + sw - 40} ${sy + 6} L${sx + sw - 64} ${sy + 14} M${sx + sw * 0.45} ${sy + 14} V${sy + 52}`} /></g>}
      <text x={sx + sw - 8} y={sy + sh - 8} textAnchor="end" className="map-tag">{z} · {i % 3 === 0 ? "frame under construction" : "podium slab"}</text>
    </g>);
}

export function WorksiteMap({ s, override, sel, onSelect, compact = false }: Props) {
  const L = layout(s);
  const d = s.site.display;
  const pick = (k: NonNullable<Sel>["kind"], id: string) => onSelect(sel && sel.kind === k && sel.id === id ? null : { kind: k, id });
  const edges = s.coverage.edges.filter((e) =>
    sel ? (sel.kind === "crew" && e.crew === sel.id) || (sel.kind === "resource" && e.resource === sel.id) : e.status === "lost");
  const zs = s.coverage.zones;
  return (
    <figure className={`map ${compact ? "compact" : ""}`}>
      <svg viewBox={`0 0 ${W} ${H}`} role="group" aria-label="Worksite schematic: zones, protective resources and crews">
        <defs>
          <pattern id="map-hatch" width="8" height="8" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
            <line x1="0" y1="0" x2="0" y2="8" stroke="var(--sev-4)" strokeWidth="2.5" opacity=".55" />
          </pattern>
        </defs>
        <rect x="0" y="0" width={W} height={H} fill="var(--map-ground)" rx="12" />
        <rect x={PAD - 12} y={ROAD_Y - 18} width={W - 2 * PAD + 24} height="36" rx="6" fill="var(--map-road)" />
        <line x1={PAD} x2={W - PAD} y1={ROAD_Y} y2={ROAD_Y} stroke="var(--map-ground)" strokeWidth="2" strokeDasharray="18 14" />
        <text x={PAD} y={ROAD_Y + 44} className="map-tag">Site access road · walking times between zones</text>
        {zs.slice(1).map((z, i) => {
          const a = L.zones[zs[i]], b = L.zones[z];
          const min = s.coverage.walk_min[`${zs[i]}|${z}`] ?? s.coverage.walk_min[`${z}|${zs[i]}`];
          const x = (a.x + a.w + b.x) / 2;
          return min !== undefined ? <g key={z}><rect x={x - 38} y={ROAD_Y - 13} width="76" height="26" rx="13" fill="var(--surface)" stroke="var(--map-line)" /><text x={x} y={ROAD_Y + 5} textAnchor="middle" className="map-walk">{min} min walk</text></g> : null;
        })}
        {zs.map((z, i) => {
          const b = L.zones[z];
          const on = sel?.kind === "zone" && sel.id === z;
          return (
            <g key={z}>
              <rect x={b.x} y={b.y} width={b.w} height={b.h} rx="12" fill="var(--map-zone)" stroke={on ? "var(--brand)" : "var(--map-line)"} strokeWidth={on ? 3 : 1.5} />
              <line x1={b.x + b.w / 2} x2={b.x + b.w / 2} y1={b.y + b.h} y2={ROAD_Y - 18} stroke="var(--map-line)" strokeWidth="6" />
              <g className="map-hit" role="button" tabIndex={0} aria-pressed={on} aria-label={`Zone ${zoneName(d, z)}`} {...act(() => pick("zone", z))}>
                <rect x={b.x + 8} y={b.y + 8} width={b.w - 16} height="30" rx="6" fill="transparent" />
                <text x={b.x + 16} y={b.y + 29} className="map-zone-t">{zoneName(d, z)}</text>
              </g>
              <Structure z={z} b={b} i={i} />
            </g>);
        })}
        {edges.map((e) => {
          const a = L.crews[e.crew], b = L.res[e.resource];
          if (!a || !b) return null;
          const p = mid(a), q = mid(b);
          const color = e.status === "lost" ? "var(--sev-4)" : e.status === "assigned" ? "var(--brand)" : "var(--ink-3)";
          return <path key={`${e.crew}-${e.resource}`} d={`M${p.x} ${a.y} C ${p.x} ${(a.y + q.y) / 2}, ${q.x} ${(a.y + q.y) / 2}, ${q.x} ${b.y + b.h}`}
            fill="none" stroke={color} strokeWidth={e.status === "assigned" ? 3 : 2} strokeDasharray={e.status === "assigned" ? undefined : "6 5"} className="map-edge" />;
        })}
        {s.coverage.resources.map((r) => {
          const b = L.res[r.resource_id];
          const down = r.state === "down", pending = !down && !r.trusted;
          const on = sel?.kind === "resource" && sel.id === r.resource_id;
          const state = down ? "Unavailable" : pending ? "Not confirmed" : `${r.load}/${r.capacity} in use`;
          return (
            <g key={r.resource_id} className="map-hit" role="button" tabIndex={0} aria-pressed={on}
              aria-describedby={`desc-${r.resource_id}`} {...act(() => pick("resource", r.resource_id))}>
              <desc id={`desc-${r.resource_id}`}>{`${resName(d, r.resource_id)}: ${state}`}</desc>
              <rect x={b.x} y={b.y} width={b.w} height={b.h} rx="10" fill={down ? "url(#map-hatch)" : "var(--surface)"}
                stroke={down ? "var(--sev-4)" : on ? "var(--brand)" : pending ? "var(--sev-2)" : "var(--map-line)"} strokeWidth={on || down ? 3 : 1.5}
                strokeDasharray={pending ? "6 4" : undefined} />
              {down && <rect x={b.x} y={b.y} width={b.w} height={b.h} rx="10" fill="var(--surface)" opacity=".72" />}
              <g transform={`translate(${b.x + 12} ${b.y + 12}) scale(1.25)`} fill="none" stroke={down ? "var(--sev-4)" : "var(--brand)"} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d={ICON_PATHS[RES_ICON[r.type]]} />
              </g>
              <text x={b.x + 48} y={b.y + 30} className="map-res-id">{r.resource_id}</text>
              {!compact && <text x={b.x + 12} y={b.y + 60} className="map-res-t">{r.type === "cooled_rest" ? "Cooled cabin" : r.type === "shade" ? "Shade" : "Water"}</text>}
              <text x={b.x + 12} y={b.y + 80} className={`map-res-s ${down ? "crit" : pending ? "warn" : ""}`}>{down ? "UNAVAILABLE" : pending ? "Confirm on site" : `${r.capacity} places`}</text>
            </g>);
        })}
        {s.crews.map((c) => {
          const b = L.crews[c.crew_id];
          const lvl = levelOf(c, override);
          const none = c.rest_edges.length === 0;
          const on = sel?.kind === "crew" && sel.id === c.crew_id;
          return (
            <g key={c.crew_id} className="map-hit" role="button" tabIndex={0} aria-pressed={on}
              aria-describedby={`desc-${c.crew_id}`} {...act(() => pick("crew", c.crew_id))}>
              <desc id={`desc-${c.crew_id}`}>{`Level ${lvl}${none ? ", no reachable rest area" : ""}`}</desc>
              <rect x={b.x} y={b.y} width={b.w} height={b.h} rx="22" fill="var(--surface)" stroke={none ? "var(--sev-4)" : on ? "var(--brand)" : "var(--map-line)"} strokeWidth={none || on ? 3 : 1.5} />
              <circle cx={b.x + 22} cy={b.y + 22} r="14" fill={`var(--sev-${lvl})`} />
              <text x={b.x + 22} y={b.y + 27} textAnchor="middle" className="map-lvl" fill={`var(--sev-${lvl}-ink)`}>{lvl}</text>
              <text x={b.x + 46} y={b.y + 27} className="map-crew-t">{crewName(d, c.crew_id)}</text>
              <text x={b.x + b.w - 14} y={b.y + 27} textAnchor="end" className={`map-crew-s ${none ? "crit" : ""}`}>
                {none ? "No rest reachable" : `${SHAPE[lvl]} ${c.size} workers`}
              </text>
            </g>);
        })}
      </svg>
      <figcaption className="map-legend xs">
        <span><i className="lg-sw assigned" />Assigned protection</span>
        <span><i className="lg-sw lost" />Lost protection</span>
        <span><i className="lg-sw hatch" />Unavailable resource</span>
        <span><i className="lg-sw pending" />Awaiting on-site confirmation</span>
        <span className="muted">Synthetic schematic — not a surveyed site. Crews shown by zone; no individual locations.</span>
      </figcaption>
    </figure>
  );
}

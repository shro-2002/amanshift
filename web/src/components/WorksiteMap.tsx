import type { KeyboardEvent } from "react";
import type { ResourceView, SiteState } from "../api/client";
import { crewName, levelOf, resName, zoneName } from "../site/derive";
import { ICON_PATHS, type IconName } from "./Icon";

// Overhead schematic of the synthetic worksite (doc 13 §4). Crews are drawn at zone level only:
// no individual positions or coordinates exist. Geometry is illustrative, state comes from the server.
export type Sel = { kind: "crew" | "resource" | "zone"; id: string } | null;
export interface Layers { crews: boolean; resources: boolean; links: boolean }
interface Props { s: SiteState; override: Record<string, number>; sel: Sel; onSelect: (s: Sel) => void; compact?: boolean; layers?: Layers }

const W = 1200, H = 620, X0 = 60, Y0 = 70, ZH = 420, GAP = 40, ROAD = Y0 + ZH + 46;
const RES_ICON: Record<ResourceView["type"], IconName> = { shade: "shade", cooled_rest: "cabin", water: "water" };
const ALL: Layers = { crews: true, resources: true, links: false };

interface Box { x: number; y: number; w: number; h: number }
interface Pt { x: number; y: number }

function layout(s: SiteState) {
  const zs = s.coverage.zones;
  const zw = (W - 2 * X0 - GAP * (zs.length - 1)) / zs.length;
  const zones: Record<string, Box> = {}, res: Record<string, Pt> = {}, crews: Record<string, Box> = {};
  zs.forEach((z, i) => {
    const x = X0 + i * (zw + GAP);
    zones[z] = { x, y: Y0, w: zw, h: ZH };
    const rs = s.coverage.resources.filter((r) => r.zone_id === z);
    rs.forEach((r, j) => { res[r.resource_id] = { x: x + zw * ((j + 1) / (rs.length + 1)), y: Y0 + 250 }; });
    s.crews.filter((c) => c.zone_id === z).forEach((c, j) => { crews[c.crew_id] = { x: x + 18, y: Y0 + 312 + j * 46, w: zw - 36, h: 36 }; });
  });
  return { zones, res, crews };
}

function act(fn: () => void) {
  return { onClick: fn, onKeyDown: (e: KeyboardEvent) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); fn(); } } };
}

/** Building footprints seen from above: column grid (frame), slab with cores (podium), tanks and skids (plant). */
function Footprint({ b, i }: { b: Box; i: number }) {
  const x = b.x + 22, y = b.y + 50, w = b.w - 44, h = 150;
  if (i % 3 === 2) {
    return (
      <g aria-hidden="true">
        {[0, 1, 2].map((k) => <circle key={k} cx={x + 48 + k * ((w - 96) / 2)} cy={y + 52} r="34" className="fp" />)}
        {[0, 1, 2].map((k) => <circle key={`i${k}`} cx={x + 48 + k * ((w - 96) / 2)} cy={y + 52} r="14" className="fp-in" />)}
        <rect x={x} y={y + 104} width={w * 0.42} height="40" rx="4" className="fp" />
        <rect x={x + w * 0.5} y={y + 104} width={w * 0.5} height="40" rx="4" className="fp" />
        <path d={`M${x} ${y + 96} H${x + w}`} className="fp-pipe" />
      </g>);
  }
  if (i % 3 === 1) {
    return (
      <g aria-hidden="true">
        <rect x={x} y={y} width={w} height={h} rx="6" className="fp" />
        <rect x={x + w * 0.18} y={y + 40} width="34" height="60" rx="3" className="fp-core" />
        <rect x={x + w * 0.62} y={y + 40} width="34" height="60" rx="3" className="fp-core" />
        <path d={`M${x} ${y + h * 0.5} H${x + w}`} className="fp-joint" />
      </g>);
  }
  const cols = 7, rows = 4;
  return (
    <g aria-hidden="true">
      <rect x={x} y={y} width={w} height={h} rx="6" className="fp" />
      {Array.from({ length: cols * rows }, (_, k) => (
        <rect key={k} x={x + 14 + (k % cols) * ((w - 28) / (cols - 1)) - 3} y={y + 18 + Math.floor(k / cols) * ((h - 36) / (rows - 1)) - 3} width="6" height="6" className="fp-col" />))}
      <circle cx={x + w - 30} cy={y + 30} r="10" className="fp-crane" />
      <path d={`M${x + w - 30} ${y + 30} L${x + 30} ${y + 30}`} className="fp-jib" />
    </g>);
}

export function WorksiteMap({ s, override, sel, onSelect, compact = false, layers = ALL }: Props) {
  const L = layout(s);
  const d = s.site.display;
  const pick = (k: NonNullable<Sel>["kind"], id: string) => onSelect(sel && sel.kind === k && sel.id === id ? null : { kind: k, id });
  const edges = s.coverage.edges.filter((e) => {
    if (sel?.kind === "crew") return e.crew === sel.id;
    if (sel?.kind === "resource") return e.resource === sel.id;
    return e.status === "lost" || (layers.links && e.status === "assigned");
  });
  const zs = s.coverage.zones;
  return (
    <figure className={`map ${compact ? "compact" : ""}`}>
      <svg viewBox={`0 0 ${W} ${H}`} role="group" aria-label="Worksite plan: zones, protective resources and crews">
        <defs>
          <pattern id="map-hatch" width="6" height="6" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
            <line x1="0" y1="0" x2="0" y2="6" stroke="var(--crit)" strokeWidth="2" opacity=".5" />
          </pattern>
          <pattern id="map-grid" width="24" height="24" patternUnits="userSpaceOnUse">
            <path d="M24 0H0V24" fill="none" stroke="var(--map-grid)" strokeWidth="1" />
          </pattern>
        </defs>
        <rect width={W} height={H} rx="14" fill="var(--map-ground)" />
        <rect width={W} height={H} rx="14" fill="url(#map-grid)" />
        <rect x={X0 - 30} y={Y0 - 40} width={W - 2 * X0 + 60} height={ZH + 140} rx="18" className="fence" />
        <path d={`M${X0 - 30} ${ROAD} H${W - X0 + 30}`} className="road" />
        <path d={`M${X0 - 30} ${ROAD} H${W - X0 + 30}`} className="road-line" />
        <g className="gate"><rect x={W / 2 - 40} y={ROAD + 34} width="80" height="26" rx="13" /><text x={W / 2} y={ROAD + 51} textAnchor="middle">Site gate</text></g>
        {zs.map((z, i) => {
          const b = L.zones[z];
          const on = sel?.kind === "zone" && sel.id === z;
          return (
            <g key={z}>
              <rect x={b.x} y={b.y} width={b.w} height={b.h} rx="12" className={`zone ${on ? "on" : ""}`} />
              <path d={`M${b.x + b.w / 2} ${b.y + b.h} V${ROAD - 14}`} className="path" />
              <Footprint b={b} i={i} />
              <g className="map-hit" role="button" tabIndex={0} aria-pressed={on} {...act(() => pick("zone", z))}>
                <rect x={b.x + 10} y={b.y + 10} width={b.w - 20} height="30" rx="8" fill="transparent" />
                <text x={b.x + 22} y={b.y + 31} className="zone-t">{zoneName(d, z)}</text>
                <text x={b.x + b.w - 22} y={b.y + 31} textAnchor="end" className="zone-id">{z}</text>
              </g>
            </g>);
        })}
        {zs.slice(1).map((z, i) => {
          const a = L.zones[zs[i]], b = L.zones[z];
          const min = s.coverage.walk_min[`${zs[i]}|${z}`] ?? s.coverage.walk_min[`${z}|${zs[i]}`];
          if (min === undefined) return null;
          const x = (a.x + a.w + b.x) / 2;
          return <g key={z} className="walk"><rect x={x - 34} y={ROAD - 12} width="68" height="24" rx="12" /><text x={x} y={ROAD + 4} textAnchor="middle">{min} min</text></g>;
        })}
        {edges.map((e) => {
          const a = L.crews[e.crew], p = L.res[e.resource];
          if (!a || !p) return null;
          const sx = a.x + a.w / 2, sy = a.y;
          return <path key={`${e.crew}-${e.resource}`} d={`M${sx} ${sy} C ${sx} ${(sy + p.y) / 2}, ${p.x} ${(sy + p.y) / 2 + 20}, ${p.x} ${p.y + 22}`} className={`link ${e.status}`} />;
        })}
        {layers.resources && s.coverage.resources.map((r) => {
          const p = L.res[r.resource_id];
          const down = r.state === "down", pending = !down && !r.trusted;
          const on = sel?.kind === "resource" && sel.id === r.resource_id;
          const state = down ? "Unavailable" : pending ? "Awaiting on-site confirmation" : `${r.load} of ${r.capacity} in use`;
          return (
            <g key={r.resource_id} className={`pin map-hit ${down ? "down" : pending ? "pending" : ""} ${on ? "on" : ""}`} role="button" tabIndex={0} aria-pressed={on}
              aria-describedby={`desc-${r.resource_id}`} {...act(() => pick("resource", r.resource_id))}>
              <title>{`${resName(d, r.resource_id)} — ${state}`}</title>
              <desc id={`desc-${r.resource_id}`}>{`${resName(d, r.resource_id)}: ${state}`}</desc>
              <circle cx={p.x} cy={p.y} r="26" className="pin-halo" />
              <circle cx={p.x} cy={p.y} r="20" className="pin-c" fill={down ? "url(#map-hatch)" : undefined} />
              <g transform={`translate(${p.x - 12} ${p.y - 12})`} className="pin-i"><path d={ICON_PATHS[RES_ICON[r.type]]} /></g>
              {down && <path d={`M${p.x - 14} ${p.y + 14} L${p.x + 14} ${p.y - 14}`} className="pin-x" />}
              <text x={p.x} y={p.y + 40} textAnchor="middle" className="pin-t">{r.resource_id}{compact ? "" : ` · ${down ? "down" : pending ? "confirm" : `${r.capacity}`}`}</text>
            </g>);
        })}
        {layers.crews && s.crews.map((c) => {
          const b = L.crews[c.crew_id];
          const lvl = levelOf(c, override);
          const none = c.rest_edges.length === 0;
          const on = sel?.kind === "crew" && sel.id === c.crew_id;
          return (
            <g key={c.crew_id} className={`crew map-hit ${none ? "none" : ""} ${on ? "on" : ""}`} role="button" tabIndex={0} aria-pressed={on}
              aria-describedby={`desc-${c.crew_id}`} {...act(() => pick("crew", c.crew_id))}>
              <title>{`${crewName(d, c.crew_id)} — level ${lvl}, ${c.size} workers${none ? ", no confirmed rest area in reach" : ""}`}</title>
              <desc id={`desc-${c.crew_id}`}>{`Level ${lvl}${none ? ", no reachable rest area" : ""}`}</desc>
              <rect x={b.x} y={b.y} width={b.w} height={b.h} rx="18" className="crew-r" />
              <circle cx={b.x + 18} cy={b.y + 18} r="11" fill={`var(--sev-${lvl})`} />
              <text x={b.x + 18} y={b.y + 22.5} textAnchor="middle" className="crew-l" fill={`var(--sev-${lvl}-ink)`}>{lvl}</text>
              <text x={b.x + 38} y={b.y + 23} className="crew-t">{crewName(d, c.crew_id)}</text>
              <text x={b.x + b.w - 14} y={b.y + 23} textAnchor="end" className={`crew-s ${none ? "crit" : ""}`}>{none ? "no rest in reach" : `${c.size}`}</text>
            </g>);
        })}
      </svg>
      {!compact && (
        <figcaption className="map-legend xs">
          <span><i className="lg-sw assigned" />Assigned protection</span>
          <span><i className="lg-sw lost" />Lost protection</span>
          <span><i className="lg-sw down" />Unavailable</span>
          <span><i className="lg-sw pending" />Awaiting confirmation</span>
          <span className="muted">Synthetic site plan — not surveyed. Crews shown by zone; no individual locations.</span>
        </figcaption>)}
    </figure>
  );
}

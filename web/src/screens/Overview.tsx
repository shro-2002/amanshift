import { useCallback, useState } from "react";
import type { SiteState } from "../api/client";
import { BriefingPanel } from "../components/Briefing";
import { Icon } from "../components/Icon";
import { LevelBadge } from "../components/LevelBadge";
import { MapDrawer } from "../components/MapDrawer";
import { OfflineBanner } from "../components/OfflineBanner";
import { Timeline } from "../components/Timeline";
import { WorksiteMap, type Sel } from "../components/WorksiteMap";
import { linkTo } from "../router";
import { actionText, confirmedRestPlaces, crewName, levelOf, needIntervention, persons, REST_TYPES, tzOffsetMin, zoneName } from "../site/derive";
import { useSite } from "../site/SiteContext";
import { useCrewDrawer } from "../site/useCrewDrawer";

export function Metrics({ s, override }: { s: SiteState; override: Record<string, number> }) {
  const need = needIntervention(s, override);
  const needP = persons(s, need);
  const total = s.coverage.total_persons || 1;
  const covered = s.coverage.covered_crews.length;
  const rest = s.coverage.resources.filter((r) => REST_TYPES.has(r.type));
  const trusted = rest.filter((r) => r.trusted).length;
  return (
    <section className="tiles" aria-label="Key figures">
      <div className={`card tile ${needP ? "crit" : ""}`}><span className="k"><Icon name="alert" size={15} />Need intervention</span>
        <span className="v">{needP}<small>of {s.coverage.total_persons} workers</small></span>
        <span className="s">{need.length ? need.map((id) => crewName(s.site.display, id)).join(", ") : "No crew needs intervention"}</span>
        <span className="bar" aria-hidden="true"><i style={{ width: `${(100 * needP) / total}%` }} /></span></div>
      <div className={`card tile ${covered < s.coverage.total_crews ? "warn" : ""}`}><span className="k"><Icon name="shield" size={15} />Crews with current protection</span>
        <span className="v">{covered}<small>of {s.coverage.total_crews} crews</small></span>
        <span className="s">Rest and water assigned under a valid plan</span>
        <span className="bar" aria-hidden="true"><i style={{ width: `${(100 * covered) / (s.coverage.total_crews || 1)}%` }} /></span></div>
      <div className={`card tile ${trusted < rest.length ? "warn" : ""}`}><span className="k"><Icon name="shade" size={15} />Confirmed rest places</span>
        <span className="v">{confirmedRestPlaces(s)}<small>places</small></span>
        <span className="s">{trusted} of {rest.length} rest areas available and confirmed on site</span>
        <span className="bar" aria-hidden="true"><i style={{ width: `${(100 * trusted) / (rest.length || 1)}%` }} /></span></div>
    </section>);
}

export function PriorityActions({ s, override, onOpen, limit = 5 }: { s: SiteState; override: Record<string, number>; onOpen: (id: string) => void; limit?: number }) {
  const d = s.site.display;
  const tz = tzOffsetMin(s);
  const crews = [...s.crews].sort((a, b) => levelOf(b, override) - levelOf(a, override) || Number(b.rest_edges.length === 0) - Number(a.rest_edges.length === 0) || b.size - a.size).slice(0, limit);
  return (
    <section className="card priority" aria-labelledby="pa-h">
      <header><h2 id="pa-h">Priority actions</h2><a className="small" href="/app/protection" onClick={linkTo("/app/protection")}>Open Protection</a></header>
      <ul className="rows">
        {crews.map((c) => {
          const lvl = levelOf(c, override);
          return (
            <li key={c.crew_id}>
              <button className="row-btn" onClick={() => onOpen(c.crew_id)}>
                <span className="lvl-bar" style={{ background: `var(--sev-${lvl})` }} />
                <span className="grow"><span className="t">{crewName(d, c.crew_id)}</span> <span className="xs muted">· {zoneName(d, c.zone_id)} · {c.size}</span><br />
                  <span className="act">{actionText(c, d, tz)}</span></span>
                <LevelBadge level={lvl} degraded={c.degraded || lvl > c.display_level} english />
              </button>
            </li>);
        })}
      </ul>
    </section>);
}

export function Overview() {
  const { s, override, isOffline, off } = useSite();
  const { openCrew, drawer } = useCrewDrawer();
  const [sel, setSel] = useState<Sel>(null);
  const select = useCallback((next: Sel) => { if (next?.kind === "crew") openCrew(next.id); else setSel(next); }, [openCrew]);
  if (!s) return <div className="skeleton" aria-busy="true" />;
  return (
    <div className="page">
      <div className="page-head">
        <div><h1>Overview</h1><p>What needs attention, who is affected, what protection exists and what to do next.</p></div>
        <span className="disclosure"><Icon name="help" size={14} />Synthetic site · historical Abu Dhabi weather</span>
      </div>
      <OfflineBanner view={off.view} />
      <BriefingPanel s={s} override={override} isOffline={isOffline} />
      <Metrics s={s} override={override} />
      <div className="ov-grid">
        <section className="card" aria-labelledby="ws-h">
          <header><h2 id="ws-h">Worksite</h2><a className="small" href="/app/worksite" onClick={linkTo("/app/worksite")}>Open worksite</a></header>
          <div className="map-card"><div className="map-scroll"><WorksiteMap s={s} override={override} sel={null} compact onSelect={select} /></div></div>
        </section>
        <PriorityActions s={s} override={override} onOpen={openCrew} />
      </div>
      <details className="card outlook">
        <summary><span>Today's heat outlook <span className="xs muted" style={{ fontWeight: 400 }}>· estimated WBGT from the day-ahead forecast</span></span><Icon name="chevron" size={16} className="chev" /></summary>
        <div className="body"><Timeline tl={s.timeline} scenarioDate={s.scenario_date} /></div>
      </details>
      <MapDrawer s={s} sel={sel} onSelect={setSel} onOpenCrew={openCrew} />
      {drawer}
    </div>
  );
}

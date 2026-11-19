import type { SiteState } from "../api/client";
import { Icon } from "../components/Icon";
import { LevelBadge } from "../components/LevelBadge";
import { OfflineBanner } from "../components/OfflineBanner";
import { PlanReview } from "../components/PlanReview";
import { Timeline } from "../components/Timeline";
import { WorksiteMap } from "../components/WorksiteMap";
import { linkTo, navigate } from "../router";
import { actionText, confirmedRestPlaces, crewName, deriveAlerts, levelOf, needIntervention, persons, REST_TYPES, tzOffsetMin, zoneName, type Alert } from "../site/derive";
import { useSite } from "../site/SiteContext";
import { useCrewDrawer } from "../site/useCrewDrawer";

export function Attention({ alerts, action = true }: { alerts: Alert[]; action?: boolean }) {
  const top = alerts[0];
  if (!top) {
    return (
      <section className="attention ok" aria-label="Site status">
        <span className="ico"><Icon name="check" /></span>
        <div><h2>Every crew has a current protective action</h2><p className="small">Plan accepted and checked. Keep confirming resources on site every 30 minutes.</p></div>
      </section>);
  }
  const more = alerts.length - 1;
  return (
    <section className={`attention ${top.severity === "critical" ? "" : "warning"}`} role={top.severity === "critical" ? "alert" : "status"} aria-label="Needs attention">
      <span className="ico"><Icon name={top.severity === "critical" ? "alert" : "help"} /></span>
      <div style={{ display: "grid", gap: 4 }}>
        <h2>{top.title}</h2>
        <p>{top.detail}</p>
        <p className="small"><b>Recommended: </b>{top.action}{more > 0 ? ` · ${more} more alert${more > 1 ? "s" : ""}` : ""}</p>
      </div>
      {action && <a className="btn btn-primary btn-lg" href="/app/alerts" onClick={linkTo("/app/alerts")}>Review actions<Icon name="arrow" size={18} /></a>}
    </section>);
}

export function Tiles({ s, override }: { s: SiteState; override: Record<string, number> }) {
  const need = needIntervention(s, override);
  const needPersons = persons(s, need);
  const rest = s.coverage.resources.filter((r) => REST_TYPES.has(r.type));
  const down = rest.filter((r) => !r.trusted).length;
  const hour = Number(s.eval_time_local.slice(0, 2));
  const now = s.timeline.hours.find((h) => h.hour === hour);
  const peak = s.timeline.hours.reduce((a, b) => (b.wbgt_sun_est > a.wbgt_sun_est ? b : a), s.timeline.hours[0]);
  return (
    <section className="tiles" aria-label="Key figures">
      <div className="card tile"><span className="k"><Icon name="crew" size={16} />Workers on site</span>
        <span className="v">{s.coverage.total_persons}</span><span className="s">{s.coverage.total_crews} active crews</span></div>
      <div className={`card tile ${needPersons ? "crit" : "ok"}`}><span className="k"><Icon name="alert" size={16} />Need intervention now</span>
        <span className="v">{needPersons}<small>workers</small></span><span className="s">{need.length ? need.map((id) => crewName(s.site.display, id)).join(", ") : "No crew needs intervention"}</span></div>
      <div className={`card tile ${down ? "warn" : ""}`}><span className="k"><Icon name="shade" size={16} />Confirmed rest places</span>
        <span className="v">{confirmedRestPlaces(s)}</span><span className="s">{rest.length - down} of {rest.length} rest areas available{down ? ` · ${down} out or unconfirmed` : ""}</span></div>
      <div className="card tile"><span className="k"><Icon name="sun" size={16} />Heat stress now (sun)</span>
        <span className="v">{now ? now.wbgt_sun_est.toFixed(1) : "—"}<small>°C WBGT</small></span>
        <span className="s">{peak ? `Peak ${peak.wbgt_sun_est.toFixed(1)} °C at ${String(peak.hour).padStart(2, "0")}:00 · ` : ""}forecast estimate, not measured</span></div>
    </section>);
}

export function Overview() {
  const { s, override, isOffline, off } = useSite();
  const { openCrew, drawer } = useCrewDrawer();
  if (!s) return <div className="skeleton" aria-busy="true" />;
  const d = s.site.display;
  const alerts = deriveAlerts(s, isOffline);
  const tz = tzOffsetMin(s);
  const crews = [...s.crews].sort((a, b) => levelOf(b, override) - levelOf(a, override) || b.size - a.size);
  return (
    <div className="page">
      <div className="page-head">
        <div><span className="eyebrow">Safety Command Center</span><h1>Site overview</h1>
          <p>Who needs protection now, what protection is available, and what to do next.</p></div>
        <a className="btn" href="/app/worksite" onClick={linkTo("/app/worksite")}><Icon name="map" size={16} />Open worksite map</a>
      </div>
      <OfflineBanner view={off.view} />
      <Attention alerts={alerts} />
      <Tiles s={s} override={override} />
      <div className="grid-2">
        <section className="card priority" aria-labelledby="pa-h">
          <header><h2 id="pa-h">Crew protective actions</h2><a className="small" href="/app/crews" onClick={linkTo("/app/crews")}>All crews</a></header>
          <ul className="rows">
            {crews.map((c) => {
              const lvl = levelOf(c, override);
              return (
                <li key={c.crew_id}>
                  <button className="row-btn" onClick={() => openCrew(c.crew_id)}>
                    <span className="lvl-bar" style={{ background: `var(--sev-${lvl})` }} />
                    <span className="grow"><span className="t">{crewName(d, c.crew_id)}</span> <span className="xs muted">· {zoneName(d, c.zone_id)} · {c.size} workers</span><br />
                      <span className="act">{actionText(c, d, tz)}</span></span>
                    <LevelBadge level={lvl} degraded={c.degraded || lvl > c.display_level} english />
                  </button>
                </li>);
            })}
          </ul>
        </section>
        <PlanReview limit={4} />
      </div>
      <section className="card" aria-labelledby="ws-h">
        <header><h2 id="ws-h">Worksite</h2><a className="small" href="/app/worksite" onClick={linkTo("/app/worksite")}>Open full map</a></header>
        <div className="body"><div className="map-scroll">
          <WorksiteMap s={s} override={override} sel={null} compact onSelect={(sel) => { if (sel?.kind === "crew") openCrew(sel.id); else if (sel) navigate(`/app/worksite?sel=${sel.kind}:${sel.id}`); }} />
        </div></div>
      </section>
      <section className="card outlook" aria-labelledby="ho-h">
        <header><h2 id="ho-h">Heat outlook today</h2><span className="xs muted">Estimated WBGT from the day-ahead forecast</span></header>
        <div className="body"><Timeline tl={s.timeline} scenarioDate={s.scenario_date} /></div>
      </section>
      {drawer}
    </div>
  );
}

import type { SiteState } from "../api/client";
import { CrewGrid } from "../components/CrewGrid";
import { Icon } from "../components/Icon";
import { LevelBadge } from "../components/LevelBadge";
import { OfflineBanner } from "../components/OfflineBanner";
import { PlanReview } from "../components/PlanReview";
import { ResourceList } from "../components/ResourceList";
import { navigate, usePath } from "../router";
import { actionText, crewName, deriveAlerts, isPlanCurrent, levelOf, planActionText, tzOffsetMin, uncovered } from "../site/derive";
import { useSite } from "../site/SiteContext";
import { useCrewDrawer } from "../site/useCrewDrawer";

const TABS = [["interventions", "Interventions"], ["plan", "Plan"], ["resources", "Resources"], ["crews", "Crews"]] as const;
type Tab = (typeof TABS)[number][0];

/** Hours ahead where the site level rises, plus the midday break — straight from the server timeline. */
function Upcoming({ s }: { s: SiteState }) {
  const hours = s.timeline.hours;
  const now = Number(s.eval_time_local.slice(0, 2));
  const mb = s.timeline.midday_break;
  const md = s.scenario_date.slice(5);
  const breakOn = md >= mb.from && md <= mb.to;
  const hm = (t: string) => Number(t.slice(0, 2)) + Number(t.slice(3)) / 60;
  const inBreak = (h: number) => breakOn && h + 1 > hm(mb.start) && h < hm(mb.end); // hour overlaps the break
  const curLvl = hours.find((h) => h.hour === now)?.site_max_level ?? 1;
  const rise = hours.find((h) => h.hour > now && h.site_max_level > curLvl);
  return (
    <section className="card" aria-labelledby="up-h">
      <header><h2 id="up-h">Upcoming protection requirements</h2><span className="xs muted">Highest crew level per hour · forecast estimate</span></header>
      <div className="body" style={{ display: "grid", gap: 8 }}>
        <div className="upcoming" role="img" aria-label="Highest crew level per hour from 06:00 to 18:00">
          {hours.map((h) => <span key={h.hour} className={`${h.hour === now ? "now" : ""} ${inBreak(h.hour) ? "ban" : ""}`} style={{ height: `${20 + h.site_max_level * 20}%`, background: `var(--sev-${h.site_max_level})` }} title={`${h.hour}:00 — level ${h.site_max_level}`} />)}
        </div>
        <div className="hours" aria-hidden="true">{hours.map((h) => <span key={h.hour}>{String(h.hour).padStart(2, "0")}</span>)}</div>
        <p className="small">{rise ? <>Site level rises to <b>{rise.site_max_level}</b> at <b>{String(rise.hour).padStart(2, "0")}:00</b> — plan rest capacity before then.</> : "No further rise in the site level forecast today."}
          {breakOn && <> Midday work break in direct sun {mb.start}–{mb.end} (hatched).</>}</p>
      </div>
    </section>);
}

/** Current (acknowledged) vs proposed arrangement per crew; invalid current actions flagged, never shown as valid. */
function Compare({ s, onOpen }: { s: SiteState; onOpen: (id: string) => void }) {
  const d = s.site.display;
  const tz = tzOffsetMin(s);
  const proposed = s.plan && !s.plan.approved && isPlanCurrent(s) ? Object.fromEntries(s.plan.actions.map((a) => [a.crew_id, a])) : null;
  return (
    <section className="card" aria-labelledby="cmp-h">
      <header><h2 id="cmp-h">Current versus proposed protection</h2><span className="xs muted">{proposed ? "Proposed plan awaiting acknowledgement" : "No proposal pending"}</span></header>
      <div className="scroll-x"><table className="cmp">
        <thead><tr><th>Crew</th><th>In effect now</th><th className="arrow" aria-hidden="true" /><th>Proposed</th></tr></thead>
        <tbody>{s.crews.map((c) => {
          const p = proposed?.[c.crew_id];
          return (
            <tr key={c.crew_id}>
              <td><button className="pill" onClick={() => onOpen(c.crew_id)}>{crewName(d, c.crew_id)}</button></td>
              <td>{actionText(c, d, tz)}{c.action && !c.action_valid && <><br /><span className="invalid"><Icon name="alert" size={12} />Accepted instruction no longer valid</span></>}</td>
              <td className="arrow" aria-hidden="true"><Icon name="arrow" size={14} /></td>
              <td>{p ? planActionText(p, d, tz) : <span className="muted">—</span>}</td>
            </tr>);
        })}</tbody>
      </table></div>
    </section>);
}

export function Protection() {
  const { s, override, isOffline, off } = useSite();
  const { search } = usePath();
  const { openCrew, drawer } = useCrewDrawer();
  const tab = (TABS.find(([k]) => k === search.get("tab"))?.[0] ?? "interventions") as Tab;
  if (!s) return <div className="skeleton" aria-busy="true" />;
  const d = s.site.display;
  const alerts = deriveAlerts(s, isOffline);
  const critical = alerts.filter((a) => a.severity === "critical").length;
  const gaps = uncovered(s);
  return (
    <div className="page">
      <div className="pz-head">
        <div><h1 style={{ fontSize: "var(--t-24)" }}>Protection</h1><p className="muted" style={{ marginTop: 4 }}>Review interventions, compare arrangements, acknowledge a checked plan and keep resources confirmed.</p></div>
        <div className="tabs" role="tablist" aria-label="Protection views">
          {TABS.map(([k, label]) => (
            <button key={k} role="tab" aria-selected={tab === k} onClick={() => navigate(k === "interventions" ? "/app/protection" : `/app/protection?tab=${k}`, true)}>
              {label}{k === "interventions" && critical > 0 && <span className="count">{critical}</span>}</button>))}
        </div>
      </div>
      <OfflineBanner view={off.view} />
      {tab === "interventions" && (
        <div className="grid-2">
          <section className="stack" style={{ gap: "var(--s-3)" }} aria-label="Interventions">
            {alerts.length === 0 && <div className="attention"><span className="ico"><Icon name="check" size={16} /></span><div><h2>No intervention needed</h2><p className="small muted">Keep confirming resources on site every 30 minutes.</p></div></div>}
            <div className="alert-list">
              {alerts.map((a) => (
                <article key={a.id} className={`alert ${a.severity}`} aria-labelledby={`a-${a.id}`}>
                  <div className="in">
                    <span className="eyebrow" style={{ color: a.severity === "critical" ? "var(--crit-text)" : a.severity === "warning" ? "var(--warn-text)" : undefined }}>
                      {a.severity === "critical" ? "Immediate intervention" : a.severity === "warning" ? "Attention" : "For review"}</span>
                    <h3 id={`a-${a.id}`}>{a.title}</h3>
                    <p className="small muted">{a.detail}</p>
                    {a.crews.length > 0 && <div className="chips">{a.crews.map((id) => <button key={id} className="pill" onClick={() => openCrew(id)}><Icon name="crew" size={12} />{crewName(d, id)}</button>)}</div>}
                    <p className="act"><b>Next: </b>{a.action}</p>
                  </div>
                </article>))}
            </div>
          </section>
          <div className="stack">
            <section className="card" aria-labelledby="gap-h">
              <header><h2 id="gap-h">Unresolved coverage gaps</h2><span className="xs muted">No confirmed rest area within walking limit</span></header>
              {gaps.length ? <ul className="rows">{gaps.map((id) => {
                const c = s.crews.find((x) => x.crew_id === id)!;
                return <li key={id}><button className="row-btn" onClick={() => openCrew(id)}><span className="ico-chip crit"><Icon name="alert" size={16} /></span><span className="grow"><span className="t">{crewName(d, id)}</span><br /><span className="xs muted">{c.size} workers</span></span><LevelBadge level={levelOf(c, override)} english /></button></li>;
              })}</ul> : <div className="body small muted">Every crew has at least one confirmed rest area in reach.</div>}
            </section>
            <Upcoming s={s} />
          </div>
        </div>)}
      {tab === "plan" && (
        <div className="stack">
          <PlanReview showList={false} />
          <Compare s={s} onOpen={openCrew} />
        </div>)}
      {tab === "resources" && <ResourceList />}
      {tab === "crews" && <CrewGrid onOpen={openCrew} />}
      {drawer}
    </div>
  );
}

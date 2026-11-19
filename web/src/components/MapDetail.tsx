import { api, type SiteState } from "../api/client";
import { actionText, crewName, levelOf, persons, resName, resourceStatus, soleDependants, strandedBy, taskContext, TONE_CLASS, TYPE_LABEL, tzOffsetMin, zoneName } from "../site/derive";
import { useSite } from "../site/SiteContext";
import { Icon } from "./Icon";
import { LevelBadge } from "./LevelBadge";
import type { Sel } from "./WorksiteMap";

interface Props { s: SiteState; sel: Sel; onOpenCrew: (id: string) => void; onSelect: (s: Sel) => void }

function Line({ k, v }: { k: string; v: React.ReactNode }) {
  return <><dt>{k}</dt><dd>{v}</dd></>;
}

// Selection detail for the worksite map: availability, capacity, confirmation, dependants, consequences.
export function MapDetail({ s, sel, onOpenCrew, onSelect }: Props) {
  const { busy, run, override } = useSite();
  const d = s.site.display;
  if (!sel) {
    return (
      <div className="map-detail empty">
        <Icon name="map" size={28} />
        <p><b>Select a zone, resource or crew</b></p>
        <p className="small muted">See availability, capacity, last on-site confirmation, which crews depend on it and what happens if it fails.</p>
      </div>);
  }
  if (sel.kind === "resource") {
    const r = s.coverage.resources.find((x) => x.resource_id === sel.id);
    if (!r) return null;
    const st = resourceStatus(r);
    const served = [...new Set(s.coverage.edges.filter((e) => e.resource === r.resource_id && e.status !== "lost").map((e) => e.crew))];
    const down = r.state === "down";
    const sole = down ? strandedBy(s, r) : soleDependants(s, r);
    const solePersons = persons(s, sole);
    return (
      <div className="map-detail">
        <span className="eyebrow">{TYPE_LABEL[r.type]} · {zoneName(d, r.zone_id)} · id {r.resource_id}</span>
        <h3>{resName(d, r.resource_id)}</h3>
        <span className={`pill ${TONE_CLASS[st.tone]}`}>{st.label}</span>
        <dl className="trace">
          <Line k="Capacity" v={`${r.capacity} ${r.type === "water" ? "persons" : "places"}`} />
          <Line k="Assigned now" v={`${r.load} persons`} />
          <Line k="Last on-site confirmation" v={r.confirmed_age_min === null ? "never" : `${r.confirmed_age_min} min ago`} />
          <Line k="Used for protection" v={r.trusted ? "Yes" : "No — not trusted until confirmed"} />
        </dl>
        <div>
          <p className="small"><b>Crews that can reach it</b></p>
          <div className="chips">{served.length ? served.map((id) => <button key={id} className="pill" onClick={() => onSelect({ kind: "crew", id })}>{crewName(d, id)}</button>) : <span className="small muted">{r.state === "down" ? "None while unavailable" : "None"}</span>}</div>
        </div>
        <p className={`notice ${sole.length ? "crit" : ""}`}>
          <b>{down ? "Impact now: " : "If unavailable: "}</b>{sole.length ? `${solePersons} workers in ${sole.length} crew${sole.length > 1 ? "s" : ""} (${sole.map((id) => crewName(d, id)).join(", ")}) ${down ? "have" : "would have"} no ${r.type === "water" ? "water station" : "rest area"} within walking limit and must stop.` : `every crew that uses it ${down ? "still has" : "has"} another reachable option.`}
        </p>
        <div className="chips">
          {r.state !== "down" && <button disabled={busy} onClick={() => run("Report unavailable", () => api.inject("resource_down", r.resource_id))}><Icon name="alert" size={16} />Report unavailable</button>}
          {r.state === "down" && <button className="btn-primary" disabled={busy} onClick={() => run("Report repaired", () => api.inject("resource_repaired", r.resource_id))}><Icon name="refresh" size={16} />Report repaired</button>}
          {r.state !== "down" && <button className={r.trusted ? "" : "btn-primary"} disabled={busy} onClick={() => run("Confirm on site", () => api.confirm(r.resource_id))}><Icon name="check" size={16} />Confirm on site</button>}
        </div>
      </div>);
  }
  if (sel.kind === "crew") {
    const c = s.crews.find((x) => x.crew_id === sel.id);
    if (!c) return null;
    const lvl = levelOf(c, override);
    return (
      <div className="map-detail">
        <span className="eyebrow">{zoneName(d, c.zone_id)} · {c.size} workers · id {c.crew_id}</span>
        <h3>{crewName(d, c.crew_id)}</h3>
        <LevelBadge level={lvl} degraded={c.degraded} english />
        <p className="small muted">{taskContext(c)}</p>
        <p style={{ fontWeight: 600 }}>{actionText(c, d, tzOffsetMin(s))}</p>
        <div className="protect">
          {c.rest_edges.length ? c.rest_edges.map((r) => <span key={r}><Icon name="shade" size={14} />{resName(d, r)}</span>) : <span className="none">No rest area reachable</span>}
          {c.water_edges.length ? c.water_edges.map((r) => <span key={r}><Icon name="water" size={14} />{resName(d, r)}</span>) : <span className="none">No water reachable</span>}
        </div>
        <button onClick={() => onOpenCrew(c.crew_id)}>Full crew detail<Icon name="chevron" size={16} /></button>
      </div>);
  }
  const z = sel.id;
  const crews = s.crews.filter((c) => c.zone_id === z);
  const res = s.coverage.resources.filter((r) => r.zone_id === z);
  return (
    <div className="map-detail">
      <span className="eyebrow">Zone · id {z}</span>
      <h3>{zoneName(d, z)}</h3>
      <p className="small"><b>{persons(s, crews.map((c) => c.crew_id))} workers</b> in {crews.length} crews · {res.length} protective resources</p>
      <ul className="rows card" style={{ boxShadow: "none" }}>
        {crews.map((c) => <li key={c.crew_id}><button className="row-btn" onClick={() => onSelect({ kind: "crew", id: c.crew_id })}><span className="grow t">{crewName(d, c.crew_id)}</span><LevelBadge level={levelOf(c, override)} english /></button></li>)}
        {res.map((r) => <li key={r.resource_id}><button className="row-btn" onClick={() => onSelect({ kind: "resource", id: r.resource_id })}><span className="grow t">{resName(d, r.resource_id)}</span><span className="small muted">{resourceStatus(r).label}</span></button></li>)}
      </ul>
    </div>);
}

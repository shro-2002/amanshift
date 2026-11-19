import { api, type ResourceView } from "../api/client";
import { Icon, type IconName } from "../components/Icon";
import { crewName, resName, resourceStatus, soleDependants, TONE_CLASS, TYPE_LABEL, zoneName } from "../site/derive";
import { useSite } from "../site/SiteContext";

const ICON: Record<ResourceView["type"], IconName> = { shade: "shade", cooled_rest: "cabin", water: "water" };
const ORDER: ResourceView["type"][] = ["cooled_rest", "shade", "water"];

export function ResourceList() {
  const { s, busy, run } = useSite();
  if (!s) return <div className="skeleton" aria-busy="true" />;
  const d = s.site.display;
  return (
    <div className="stack" style={{ gap: "var(--s-4)" }}>
      {ORDER.map((type) => {
        const list = s.coverage.resources.filter((r) => r.type === type);
        if (!list.length) return null;
        return (
          <section key={type} className="card" aria-labelledby={`rh-${type}`}>
            <header><h2 id={`rh-${type}`}>{TYPE_LABEL[type]}s</h2><span className="xs muted">{list.filter((r) => r.trusted).length} of {list.length} in use for protection</span></header>
            {list.map((r) => {
              const st = resourceStatus(r);
              const sole = soleDependants(s, r);
              const pct = r.capacity ? Math.min(100, Math.round((100 * r.load) / r.capacity)) : 0;
              return (
                <div key={r.resource_id} className="res-row">
                  <span className={`ico-chip ${st.tone === "ok" ? "" : TONE_CLASS[st.tone]}`}><Icon name={ICON[type]} /></span>
                  <span><b>{resName(d, r.resource_id)}</b><br /><span className="xs muted">{zoneName(d, r.zone_id)} · id {r.resource_id}</span></span>
                  <span><span className={`pill ${TONE_CLASS[st.tone]}`}>{st.label}</span><br />
                    <span className="xs muted">{r.confirmed_age_min === null ? "Never confirmed on site" : `Confirmed ${r.confirmed_age_min} min ago`}</span></span>
                  <span className="cap">{r.load} of {r.capacity} {type === "water" ? "persons" : "places"} assigned
                    <span className="meter" aria-hidden="true"><i style={{ width: `${pct}%` }} /></span>
                    <span className="xs muted">{sole.length ? `Only option for ${sole.map((id) => crewName(d, id)).join(", ")}` : "Every user has an alternative"}</span></span>
                  <span className="btns">
                    {r.state !== "down" && <button className={r.trusted ? "" : "btn-primary"} disabled={busy} onClick={() => run("Confirm on site", () => api.confirm(r.resource_id))}><Icon name="check" size={16} />Confirm on site</button>}
                    {r.state !== "down" ? <button disabled={busy} onClick={() => run("Report unavailable", () => api.inject("resource_down", r.resource_id))}>Report unavailable</button>
                      : <button className="btn-primary" disabled={busy} onClick={() => run("Report repaired", () => api.inject("resource_repaired", r.resource_id))}><Icon name="refresh" size={16} />Report repaired</button>}
                  </span>
                </div>);
            })}
          </section>);
      })}
    </div>
  );
}

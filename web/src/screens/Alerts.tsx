import { Icon } from "../components/Icon";
import { OfflineBanner } from "../components/OfflineBanner";
import { PlanReview } from "../components/PlanReview";
import { crewName, deriveAlerts } from "../site/derive";
import { useSite } from "../site/SiteContext";
import { useCrewDrawer } from "../site/useCrewDrawer";

export function Alerts() {
  const { s, isOffline, off } = useSite();
  const { openCrew, drawer } = useCrewDrawer();
  if (!s) return <div className="skeleton" aria-busy="true" />;
  const d = s.site.display;
  const alerts = deriveAlerts(s, isOffline);
  return (
    <div className="page">
      <div className="page-head">
        <div><span className="eyebrow">Alerts &amp; actions</span><h1>What needs a decision</h1>
          <p>Every alert comes from the current site state. Generate a protection plan, review it in plain language, and accept it only after the independent policy check passes.</p></div>
      </div>
      <OfflineBanner view={off.view} />
      <div className="grid-2">
        <section aria-labelledby="al-h" className="stack" style={{ gap: "var(--s-3)" }}>
          <h2 id="al-h" className="eyebrow">{alerts.length ? `${alerts.length} active alert${alerts.length > 1 ? "s" : ""}` : "No active alerts"}</h2>
          {alerts.length === 0 && <div className="attention ok"><span className="ico"><Icon name="check" /></span><div><h2>Nothing needs a decision</h2><p className="small">Keep confirming resources on site every 30 minutes.</p></div></div>}
          <div className="alert-list">
            {alerts.map((a) => (
              <article key={a.id} className={`alert ${a.severity}`} aria-labelledby={`a-${a.id}`}>
                <div className="in">
                  <span className="eyebrow" style={{ color: a.severity === "critical" ? "var(--sev-4-text)" : a.severity === "warning" ? "var(--warn-text)" : undefined }}>
                    {a.severity === "critical" ? "Immediate attention" : a.severity === "warning" ? "Attention" : "For review"}</span>
                  <h3 id={`a-${a.id}`}>{a.title}</h3>
                  <p className="small">{a.detail}</p>
                  {a.crews.length > 0 && <div className="chips">{a.crews.map((id) => <button key={id} className="pill" onClick={() => openCrew(id)}><Icon name="crew" size={14} />{crewName(d, id)}</button>)}</div>}
                  <p className="act">Recommended: {a.action}</p>
                </div>
              </article>))}
          </div>
        </section>
        <PlanReview />
      </div>
      {drawer}
    </div>
  );
}

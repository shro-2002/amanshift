import { Icon, type IconName } from "../components/Icon";
import { hhmm, humanize, tzOffsetMin } from "../site/derive";
import { useSite } from "../site/SiteContext";

const KIND: Record<string, IconName> = {
  resource_down: "alert", resource_state: "check", plan_proposed: "refresh", checker_verdict: "shield", plan_approved: "check",
  symptom_escalation: "medic", forecast_stale: "forecast", forecast_lost: "forecast", network_offline: "offline",
  meter_reading: "meter", restore_all: "refresh", resource_repaired: "refresh", time_advance: "clock", scenario: "play",
};

export function Activity() {
  const { s } = useSite();
  if (!s) return <div className="skeleton" aria-busy="true" />;
  const d = s.site.display;
  const tz = tzOffsetMin(s);
  return (
    <div className="page">
      <div className="page-head">
        <div><span className="eyebrow">Safety activity</span><h1>What happened, and when</h1>
          <p>Every failure, plan, policy check, acceptance and symptom report is recorded in a tamper-evident audit trail. Scenario clock, GST.</p></div>
        <span className={`pill ${s.chain_ok ? "ok" : "crit"}`}><Icon name={s.chain_ok ? "lock" : "alert"} size={14} />{s.chain_ok ? "Audit trail integrity verified" : "Audit trail integrity FAILED"}</span>
      </div>
      <section className="card" aria-label="Activity timeline">
        {s.log.length === 0 ? <div className="body muted">No activity yet.</div> : (
          <ol className="tl">
            {s.log.map((l, i) => (
              <li key={i}>
                <time dateTime={l.at}>{hhmm(l.at, tz)}</time>
                <span className="ico-chip"><Icon name={KIND[l.kind] ?? "activity"} size={18} /></span>
                <span className="txt">{humanize(l.text, d)}</span>
              </li>))}
          </ol>)}
      </section>
    </div>
  );
}

import { useState } from "react";
import { api } from "../api/client";
import { Icon } from "../components/Icon";
import { OfflineBanner } from "../components/OfflineBanner";
import { PlanReview } from "../components/PlanReview";
import { WorksiteMap } from "../components/WorksiteMap";
import { linkTo, navigate } from "../router";
import { crewName, deriveAlerts, policyCheck, resName, humanize } from "../site/derive";
import { useSite } from "../site/SiteContext";
import { useCrewDrawer } from "../site/useCrewDrawer";
import { Attention, Tiles } from "./Overview";

const COOLING = "R2";

// Demonstration environment (doc 12 §5.9): every control calls the real API on this browser session.
export function Demo() {
  const { s, busy, run, isOffline, off, simulated, setSimulated, override } = useSite();
  const { openCrew, drawer } = useCrewDrawer();
  const [done, setDone] = useState(0);
  if (!s) return <div className="skeleton" aria-busy="true" />;
  const d = s.site.display;
  const cabin = resName(d, COOLING);
  const steps: { title: string; text: string; cta: string; go: () => void }[] = [
    { title: "Start the morning shift", text: "Replay 1 July 2026 at 10:30 GST with the day-ahead forecast issued the day before. Crews get different protection levels; the plan is checked and accepted.", cta: "Load scenario", go: () => run("Load", () => api.load()) },
    { title: `${cabin} fails`, text: "Report the cooling cabin unavailable. Crews that depended on it lose their rest area and the accepted plan stops protecting them.", cta: "Cooling cabin fails", go: () => run("Cooling fails", () => api.inject("resource_down", COOLING)) },
    { title: "Generate a new protection plan", text: "The planner reassigns what it can and stops what it cannot protect. The independent policy check runs before anyone can accept it.", cta: "Generate plan", go: () => run("Generate plan", () => api.plan()) },
    { title: "Try to keep the old schedule", text: "Re-submit the earlier plan unchanged, as if nothing had happened. The policy check must reject it and say why.", cta: "Submit old schedule", go: () => run("Old schedule", () => api.checkUnsafe()) },
    { title: "Network goes offline", text: "Devices keep the last plan, count down and tighten to conservative levels; after expiry they show STOP-HOLD. Open the worker app to see it.", cta: "Go offline", go: () => { run("Offline", () => api.inject("network_offline")); setSimulated(true); } },
    { title: "Inspect the evidence", text: "Property tests, checker mutation testing, forecast skill against baselines and the cost of safety — all loaded from the evaluation artifacts.", cta: "Open technical validation", go: () => navigate("/help/validation") },
  ];
  const step = (i: number) => { steps[i].go(); setDone(Math.max(done, i + 1)); };
  const unsafe = s.unsafe_check;
  const uv = unsafe ? policyCheck(unsafe.checker) : null;
  return (
    <div className="page">
      <div className="page-head">
        <div><span className="eyebrow">Live demonstration</span><h1>Failure-resilience scenario</h1>
          <p>Historical Abu Dhabi weather on a synthetic worksite. Every step runs through the real decision engine, planner, policy checker and offline logic — nothing is prerecorded.</p></div>
        <a className="btn" href="/worker" onClick={linkTo("/worker")}><Icon name="phone" size={16} />Open worker app</a>
      </div>
      <div className="demo-layout">
        <div className="demo-sticky">
          <section className="card" aria-labelledby="st-h">
            <header><h2 id="st-h">Guided steps</h2><span className="xs muted">about 2 minutes</span></header>
            <ol className="demo-steps" aria-label="Demonstration steps">
              {steps.map((st, i) => (
                <li key={st.title} className={i < done ? "done" : i === done ? "next" : ""}>
                  <span className="n" aria-hidden="true">{i < done ? <Icon name="check" size={16} /> : i + 1}</span>
                  <div style={{ display: "grid" }}>
                    <b>{st.title}</b><p>{st.text}</p>
                    <button className={i === done ? "btn-primary" : ""} disabled={busy} onClick={() => step(i)}>{st.cta}</button>
                  </div>
                </li>))}
            </ol>
          </section>
          <section className="card" aria-labelledby="sc-h">
            <header><h2 id="sc-h">More scenario controls</h2></header>
            <div className="body demo-controls">
              <button disabled={busy} onClick={() => run("Forecast stale", () => api.inject("forecast_stale"))}><Icon name="forecast" size={16} />Forecast goes stale</button>
              <button disabled={busy} onClick={() => run("Forecast lost", () => api.inject("forecast_lost"))}><Icon name="forecast" size={16} />Forecast feed lost</button>
              <button disabled={busy} onClick={() => run("Meter reading", () => api.inject("meter_reading", "Z2", { zone: "Z2", location: "sun", wbgt: 34.5 }))}><Icon name="meter" size={16} />Onsite meter: 34.5 °C at {d?.zones?.Z2 ?? "Z2"}</button>
              <button disabled={busy} onClick={() => run("Shade fails", () => api.inject("resource_down", "R1"))}><Icon name="shade" size={16} />{resName(d, "R1")} fails</button>
              <button disabled={busy} onClick={() => run("Report repaired", () => api.inject("resource_repaired", COOLING))}><Icon name="refresh" size={16} />{cabin} repaired</button>
              <button disabled={busy} onClick={() => run("Confirm on site", () => api.confirm(COOLING))}><Icon name="check" size={16} />Confirm {cabin} on site</button>
              <button disabled={busy} onClick={() => run("Restore all", () => api.inject("restore_all"))}><Icon name="refresh" size={16} />Restore feeds and network</button>
              <button disabled={busy} onClick={() => run("+15 min", () => api.inject("time_advance", undefined, { steps: 1 }))}><Icon name="clock" size={16} />Advance 15 minutes</button>
              {simulated && <button onClick={() => off.fastForward(65)}><Icon name="clock" size={16} />Advance offline clock 65 min</button>}
              {simulated && <button onClick={() => setSimulated(false)}><Icon name="online" size={16} />Reconnect device</button>}
              <button disabled={busy} onClick={() => { setSimulated(false); setDone(0); run("Reset", () => api.load()); }}><Icon name="play" size={16} />Reset scenario</button>
            </div>
          </section>
        </div>
        <div className="stack">
          <OfflineBanner view={off.view} />
          <Attention alerts={deriveAlerts(s, isOffline)} action={false} />
          <Tiles s={s} override={override} />
          {unsafe && uv && (
            <section className="card" aria-labelledby="us-h" role="status">
              <header><h2 id="us-h">Old schedule re-submitted</h2>
                <span className={`check ${uv.ok ? "ok" : "no"}`}><Icon name={uv.ok ? "check" : "x"} size={16} />{uv.ok ? "Policy check passed" : "Rejected by the policy check"}</span></header>
              <div className="body verdict">
                <p>{uv.ok ? "The earlier plan still satisfies every rule under current conditions." : `The earlier plan breaks ${unsafe.checker.violations.length} safety rules under current conditions and cannot be accepted.`}</p>
                {!uv.ok && <ul className="small" style={{ margin: 0, paddingInlineStart: 18 }}>
                  {unsafe.checker.violations.map((v, i) => <li key={i}>{v.crew_id ? <b>{crewName(d, v.crew_id)}: </b> : null}{humanize(v.message, d)}</li>)}
                </ul>}
                <details className="more"><summary>Rule references</summary>
                  <ul className="xs" style={{ paddingInlineStart: 18 }}>{unsafe.checker.violations.map((v, i) => <li key={i}><span className="mono">{v.rule}</span> — {v.citation}</li>)}</ul>
                  <p className="xs muted">Checked by {unsafe.checker.checker_version}, {unsafe.checker.rules_evaluated} rules evaluated.</p>
                </details>
              </div>
            </section>)}
          <section className="card" aria-labelledby="dm-h">
            <header><h2 id="dm-h">Worksite</h2><span className="xs muted">select a crew for detail</span></header>
            <div className="body"><div className="map-scroll">
              <WorksiteMap s={s} override={override} sel={null} compact onSelect={(sel) => { if (sel?.kind === "crew") openCrew(sel.id); else if (sel) navigate(`/app/worksite?sel=${sel.kind}:${sel.id}`); }} />
            </div></div>
          </section>
          <PlanReview />
        </div>
      </div>
      {drawer}
    </div>
  );
}

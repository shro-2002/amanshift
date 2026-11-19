import { useCallback, useState } from "react";
import { api } from "../api/client";
import { BriefingPanel } from "../components/Briefing";
import { Icon } from "../components/Icon";
import { MapDrawer } from "../components/MapDrawer";
import { OfflineBanner } from "../components/OfflineBanner";
import { PlanReview } from "../components/PlanReview";
import { WorksiteMap, type Sel } from "../components/WorksiteMap";
import { linkTo, navigate } from "../router";
import { crewName, humanize, policyCheck, resName } from "../site/derive";
import { useSite } from "../site/SiteContext";
import { useCrewDrawer } from "../site/useCrewDrawer";
import { Metrics, PriorityActions } from "./Overview";

const COOLING = "R2";

// Product tour (doc 13 §4): the real product with one scenario chapter at a time. Every chapter calls the real API.
export function Tour() {
  const { s, busy, run, isOffline, off, simulated, setSimulated, override } = useSite();
  const { openCrew, drawer } = useCrewDrawer();
  const [idx, setIdx] = useState(0);
  const [ran, setRan] = useState(false);
  const [sel, setSel] = useState<Sel>(null);
  const [controls, setControls] = useState(false);
  const select = useCallback((next: Sel) => { if (next?.kind === "crew") openCrew(next.id); else setSel(next); }, [openCrew]);
  if (!s) return <div className="skeleton" aria-busy="true" />;
  const d = s.site.display;
  const cabin = resName(d, COOLING);
  const chapters: { title: string; text: string; cta: string; go: () => void }[] = [
    { title: "Morning protection outlook", text: "1 July 2026, 10:30 GST. Yesterday's day-ahead forecast, crew tasks and the protection on site produce one action per crew.", cta: "Start the shift", go: () => run("Load", () => api.load()) },
    { title: "Cooling facility outage", text: `The ${cabin} is reported unavailable. Watch the briefing and the plan react.`, cta: "Report the outage", go: () => run("Cooling outage", () => api.inject("resource_down", COOLING)) },
    { title: "Affected crews identified", text: "The worksite plan shows which crews lost their only rest area and what the outage means for them.", cta: "Inspect the outage", go: () => setSel({ kind: "resource", id: COOLING }) },
    { title: "Revised protective action", text: "The planner reassigns what it can and stops what it cannot protect. An independent policy check runs first.", cta: "Generate revised plan", go: () => run("Revised plan", () => api.plan()) },
    { title: "Unsafe previous arrangement rejected", text: "Try to keep the earlier schedule unchanged. The policy check must reject it and say why.", cta: "Re-submit previous arrangement", go: () => run("Previous arrangement", () => api.checkUnsafe()) },
    { title: "Connectivity failure, conservative fallback", text: "Devices keep the last plan and tighten as time passes, then hold work. Open the worker companion to see it.", cta: "Disconnect the network", go: () => { run("Offline", () => api.inject("network_offline")); setSimulated(true); } },
  ];
  const last = idx === chapters.length - 1;
  const ch = chapters[idx];
  const primary = () => {
    if (!ran) { ch.go(); setRan(true); return; }
    if (last) { navigate("/help/validation"); return; }
    setIdx(idx + 1); setRan(false);
  };
  const unsafe = s.unsafe_check;
  const uv = unsafe ? policyCheck(unsafe.checker) : null;
  return (
    <div className="page">
      <div className="tour-head">
        <div><span className="eyebrow">Product tour · live scenario</span><h1 style={{ fontSize: "var(--t-24)", marginTop: 4 }}>A cooling failure on a hot morning</h1>
          <p className="muted" style={{ marginTop: 4 }}>Historical Abu Dhabi weather on a synthetic worksite. Each chapter runs the real decision engine, planner, policy check and offline logic.</p></div>
        <div className="chips">
          <a className="btn" href="/worker" onClick={linkTo("/worker")}><Icon name="phone" size={15} />Worker companion</a>
          <button aria-expanded={controls} onClick={() => setControls(!controls)}><Icon name="menu" size={15} />Scenario controls</button>
        </div>
      </div>
      <OfflineBanner view={off.view} />
      <BriefingPanel s={s} override={override} isOffline={isOffline} actions={false} />
      <Metrics s={s} override={override} />
      {unsafe && uv && (
        <section className="card" aria-labelledby="us-h" role="status">
          <header><h2 id="us-h">Previous arrangement re-submitted</h2>
            <span className={`check ${uv.ok ? "ok" : "no"}`}><Icon name={uv.ok ? "check" : "x"} size={15} />{uv.ok ? "Policy check passed" : "Rejected by the policy check"}</span></header>
          <div className="body verdict">
            <p className="small">{uv.ok ? "The earlier arrangement still satisfies every rule under current conditions." : `It breaks ${unsafe.checker.violations.length} safety rules under current conditions and cannot be acknowledged.`}</p>
            {!uv.ok && <ul className="small" style={{ margin: 0, paddingInlineStart: 18 }}>
              {unsafe.checker.violations.map((v, i) => <li key={i}>{v.crew_id ? <b>{crewName(d, v.crew_id)}: </b> : null}{humanize(v.message, d)}</li>)}
            </ul>}
            <details className="more"><summary>Rule references</summary>
              <ul className="xs" style={{ paddingInlineStart: 18 }}>{unsafe.checker.violations.map((v, i) => <li key={i}><span className="mono">{v.rule}</span> — {v.citation}</li>)}</ul>
            </details>
          </div>
        </section>)}
      <div className="ov-grid">
        <section className="card" aria-label="Worksite"><div className="map-card"><div className="map-scroll"><WorksiteMap s={s} override={override} sel={null} compact onSelect={select} /></div></div></section>
        <div className="stack">
          <PriorityActions s={s} override={override} onOpen={openCrew} limit={4} />
          <PlanReview showList={false} />
        </div>
      </div>
      <div className="tour-bar" role="region" aria-label="Tour chapter">
        <div className="dots" aria-hidden="true">{chapters.map((c, i) => <i key={c.title} className={i < idx || (i === idx && ran) ? "done" : i === idx ? "cur" : ""} />)}</div>
        <div aria-live="polite">
          <span className="chap">Chapter {idx + 1} of {chapters.length}</span>
          <h2>{ch.title}</h2>
          <p>{ran ? (last ? "Scenario complete. The evidence behind each behaviour is in the technical validation report." : "Done — look at the briefing, map and plan, then continue.") : ch.text}</p>
        </div>
        <div className="ctl">
          {idx > 0 && <button className="btn-ghost" onClick={() => { setIdx(0); setRan(false); setSimulated(false); run("Restart", () => api.load()); }}>Restart</button>}
          <button className="btn-primary btn-lg" disabled={busy} onClick={primary}>{ran ? (last ? "Open technical validation" : "Next chapter") : ch.cta}<Icon name="arrow" size={16} /></button>
        </div>
      </div>
      {controls && (
        <>
          <div className="scrim" onClick={() => setControls(false)} />
          <div className="drawer" role="dialog" aria-modal="true" aria-label="Scenario controls">
            <header><div><span className="eyebrow">Scenario controls</span><h2 style={{ fontSize: "var(--t-16)", marginTop: 4 }}>Inject conditions</h2></div><button className="btn-ghost" aria-label="Close" onClick={() => setControls(false)}><Icon name="close" /></button></header>
            <section className="scenario-controls">
              <p className="xs muted">Each control changes this browser session through the real API and is recorded in Activity.</p>
              <button disabled={busy} onClick={() => run("Forecast stale", () => api.inject("forecast_stale"))}><Icon name="forecast" size={15} />Forecast goes out of date</button>
              <button disabled={busy} onClick={() => run("Forecast lost", () => api.inject("forecast_lost"))}><Icon name="forecast" size={15} />Forecast feed lost</button>
              <button disabled={busy} onClick={() => run("Meter reading", () => api.inject("meter_reading", "Z2", { zone: "Z2", location: "sun", wbgt: 34.5 }))}><Icon name="meter" size={15} />Onsite meter reads 34.5 °C at {d?.zones?.Z2 ?? "Z2"}</button>
              <button disabled={busy} onClick={() => run("Shade fails", () => api.inject("resource_down", "R1"))}><Icon name="shade" size={15} />{resName(d, "R1")} fails</button>
              <button disabled={busy} onClick={() => run("Report repaired", () => api.inject("resource_repaired", COOLING))}><Icon name="refresh" size={15} />{cabin} repaired</button>
              <button disabled={busy} onClick={() => run("Confirm on site", () => api.confirm(COOLING))}><Icon name="check" size={15} />Confirm {cabin} on site</button>
              <button disabled={busy} onClick={() => run("Restore all", () => api.inject("restore_all"))}><Icon name="refresh" size={15} />Restore feeds and network</button>
              <button disabled={busy} onClick={() => run("+15 min", () => api.inject("time_advance", undefined, { steps: 1 }))}><Icon name="clock" size={15} />Advance 15 minutes</button>
              {simulated && <button onClick={() => off.fastForward(65)}><Icon name="clock" size={15} />Advance offline clock 65 min</button>}
              {simulated && <button onClick={() => setSimulated(false)}><Icon name="online" size={15} />Reconnect device</button>}
              <button disabled={busy} onClick={() => { setSimulated(false); setIdx(0); setRan(false); run("Reset", () => api.load()); }}><Icon name="play" size={15} />Reset scenario</button>
            </section>
          </div>
        </>)}
      <MapDrawer s={s} sel={sel} onSelect={setSel} onOpenCrew={openCrew} />
      {drawer}
    </div>
  );
}

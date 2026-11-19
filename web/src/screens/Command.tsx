import { useCallback, useEffect, useRef, useState } from "react";
import { api, type SiteState } from "../api/client";
import { CheckerPanel } from "../components/CheckerPanel";
import { CoverageGraph } from "../components/CoverageGraph";
import { CrewDrawer } from "../components/CrewDrawer";
import { CrewTable } from "../components/CrewTable";
import { DemoDrawer } from "../components/DemoDrawer";
import { LevelBadge } from "../components/LevelBadge";
import { OfflineBanner } from "../components/OfflineBanner";
import { ProvenanceChip } from "../components/ProvenanceChip";
import { Timeline } from "../components/Timeline";
import { navigate } from "../router";
import type { useOffline } from "../offline/useOffline";

type Offline = ReturnType<typeof useOffline>;
interface Props { judge: boolean; off: Offline; simulated: boolean; setSimulated: (v: boolean) => void }

const STEPS = ["Load scenario (10:30 GST)", "Cooling R2 fails", "Re-plan", "Submit unsafe plan (keep working as scheduled)",
  "Network offline", "Open evidence"];

export function Command({ judge, off, simulated, setSimulated }: Props) {
  const [s, setS] = useState<SiteState | null>(null);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [open, setOpen] = useState<string | null>(null);
  const [demo, setDemo] = useState(judge);
  const [done, setDone] = useState<number>(0);
  const [announce, setAnnounce] = useState({ polite: "", assertive: "" });
  const prev = useRef<Record<string, number>>({});
  const refreshPack = useRef(off.refreshPack);
  refreshPack.current = off.refreshPack;

  const apply = useCallback((next: SiteState) => {
    const changed = next.crews.filter((c) => prev.current[c.crew_id] !== undefined && prev.current[c.crew_id] !== c.display_level);
    const toStop = changed.filter((c) => c.display_level === 4);
    if (changed.length) {
      const msg = changed.map((c) => `Crew ${c.crew_id} now level ${c.display_level} ${c.level_name}`).join(". ");
      setAnnounce(toStop.length ? { polite: "", assertive: msg } : { polite: msg, assertive: "" });
    }
    prev.current = Object.fromEntries(next.crews.map((c) => [c.crew_id, c.display_level]));
    setS(next);
    setErr(null);
    void refreshPack.current();
  }, []);

  const run = useCallback((label: string, fn: () => Promise<unknown>) => {
    setBusy(true);
    fn().then((r) => { if (r && typeof r === "object" && "crews" in (r as object)) apply(r as SiteState); })
      .catch((e: Error) => setErr(`${label}: ${e.message}`)).finally(() => setBusy(false));
  }, [apply]);

  useEffect(() => { run("Load", () => api.state()); }, [run]); // run is stable (deps are stable)

  const step = (i: number) => {
    const actions: (() => void)[] = [
      () => run("Load", () => api.load()), () => run("R2 fails", () => api.inject("resource_down", "R2")),
      () => run("Re-plan", () => api.plan()), () => run("Unsafe plan", () => api.checkUnsafe()),
      () => { run("Offline", () => api.inject("network_offline")); setSimulated(true); }, () => navigate("/evidence"),
    ];
    actions[i]();
    setDone(i + 1);
  };

  if (!s) return <main><div className="skeleton" aria-busy="true" />{err && <p role="alert">{err} <button onClick={() => run("Load", () => api.state())}>Retry</button></p>}</main>;

  const override = Object.fromEntries(Object.entries(off.view.levels).map(([k, v]) => [k, v.display]));
  const plan = s.plan;
  const counts = [4, 3, 2, 1].map((l) => [l, s.crews.filter((c) => Math.max(c.display_level, override[c.crew_id] ?? 0) === l).length] as const);
  const crewOpen = s.crews.find((c) => c.crew_id === open);
  const escalated = s.crews.filter((c) => c.escalated);

  return (
    <main>
      <div aria-live="polite" className="sr-only">{announce.polite}</div>
      <div aria-live="assertive" className="sr-only">{announce.assertive}</div>
      {judge && (
        <ol className="rail" aria-label="Judging moment steps">
          {STEPS.map((label, i) => (
            <li key={label} className={i < done ? "done" : ""}>
              <span className="n">{i + 1}</span><span style={{ flex: 1 }}>{label}</span>
              <button className={i === done ? "btn-primary" : ""} disabled={busy} onClick={() => step(i)}>Do step {i + 1}</button>
            </li>))}
        </ol>)}
      <section className="statusline" aria-label="Site status">
        <h1 style={{ fontSize: "var(--t-20)" }}>{s.site.label}</h1>
        <span className="meta">
          <span className="mono">{s.scenario_date} · {s.eval_time_local} GST (replay)</span>
          <span>Forecast {s.forecast.tier}{s.forecast.age_min !== undefined ? ` · age ${s.forecast.age_min} min` : ""} <ProvenanceChip kind={s.forecast.tier === "fresh" ? "forecast" : "fallback"} source="Open-Meteo Previous Runs" detail={s.forecast.label} /></span>
          <span>Policy {s.policy_version}</span>
          <span>{simulated || off.offline ? "○ Offline" : "● Online"}</span>
        </span>
      </section>
      <section className="statusline" aria-label="Level counts">
        {counts.map(([l, n]) => <span key={l} className="count"><LevelBadge level={l} english /> × {n}</span>)}
        <span>Coverage <b>{s.coverage.covered_crews.length}/{s.coverage.total_crews}</b> crews ({s.coverage.covered_persons}/{s.coverage.total_persons} persons)</span>
      </section>
      <div className="banners">
        {escalated.map((c) => <div key={c.crew_id} className="banner escalation" role="alert"><strong>⚕ Clinical escalation</strong> Crew {c.crew_id}: stop, cool, call medic / emergency 999. Closes only by medic role.</div>)}
        <OfflineBanner view={off.view} />
        {s.banners.map((b, i) => (
          <div key={i} className={`banner ${b.kind === "forecast" ? "hatch" : ""} ${b.kind === "replan" ? "info" : ""}`} role="status">
            <strong>{b.kind === "replan" ? "↻" : "⚠"}</strong> {b.text}
            {b.kind === "replan" && <button className="btn-primary" disabled={busy} onClick={() => run("Re-plan", () => api.plan())}>Re-plan</button>}
          </div>))}
        {err && <div className="banner" role="alert">{err}</div>}
      </div>
      <div className="layout">
        <section className="panel" aria-labelledby="crews-h">
          <header><h2 id="crews-h">Crews</h2><span className="small muted">sorted by level, then id · click a row for the trace</span></header>
          <div className="scroll-x"><CrewTable crews={s.crews} override={override} onOpen={setOpen} /></div>
        </section>
        <div style={{ display: "grid", gap: "var(--s-6)" }}>
          <section className="panel" aria-labelledby="cov-h"><header><h2 id="cov-h">Coverage</h2><span className="small muted">synthetic site schematic</span></header>
            <CoverageGraph coverage={s.coverage} crews={s.crews} /></section>
          <button className="noprint" aria-expanded={demo} onClick={() => setDemo(!demo)}>{demo ? "Hide" : "Show"} demo controls</button>
          {demo && <DemoDrawer busy={busy} simulatedOffline={simulated} run={run} api={api} setSimulatedOffline={setSimulated} fastForward={off.fastForward} />}
        </div>
      </div>
      <section className="panel" style={{ marginBlockStart: "var(--s-6)" }} aria-labelledby="tl-h">
        <header><h2 id="tl-h">Timeline 06:00–18:00 GST</h2><ProvenanceChip kind="forecast" source="Open-Meteo Previous Runs" detail="estimated WBGT" /></header>
        <Timeline tl={s.timeline} scenarioDate={s.scenario_date} />
      </section>
      <div style={{ marginBlockStart: "var(--s-6)" }}><CheckerPanel plan={plan} unsafe={s.unsafe_check} snapshotId={s.snapshot_id} policy={s.policy_version} /></div>
      <section className="panel small" style={{ marginBlockStart: "var(--s-6)" }} aria-labelledby="log-h">
        <header><h2 id="log-h">Event log</h2><span className={s.chain_ok ? "verdict-ok" : "verdict-no"}>hash chain {s.chain_ok ? "verified" : "BROKEN"}</span></header>
        <ul>{s.log.slice(0, 8).map((l, i) => <li key={i}>{l.text}</li>)}</ul>
      </section>
      <div className="planbar noprint" role="region" aria-label="Plan">
        {plan ? <>
          <b className="mono">PLAN {plan.plan_id}</b>
          <span className={plan.checker.verdict === "approved" ? "verdict-ok" : "verdict-no"}>{plan.checker.verdict === "approved" ? "✓" : "✗"} {plan.checker.verdict.toUpperCase()} {plan.checker.checker_version}</span>
          <span className="small">{plan.status === "protection_insufficient" ? "protection insufficient" : "feasible"}{plan.approved ? " · applied" : ""}{plan.stale ? " · outdated" : ""}</span>
          <span style={{ flex: 1 }} />
          <button disabled={busy} onClick={() => run("Re-plan", () => api.plan())}>Re-plan</button>
          <button className="btn-primary" disabled={busy || plan.approved || plan.stale || plan.checker.verdict !== "approved"}
            title={plan.checker.verdict !== "approved" ? "Only checker-approved plans can be applied" : "Apply this plan"}
            onClick={() => run("Approve", () => api.approve(plan.plan_id))}>Approve</button>
          <button disabled={busy || !s.approved_plan_id} onClick={() => run("Unsafe plan", () => api.checkUnsafe())}>Submit unsafe plan</button>
          <button onClick={() => navigate("/evidence")}>Evidence</button>
          <button onClick={() => navigate("/cards")}>Cards</button>
        </> : <button className="btn-primary" onClick={() => run("Load", () => api.load())}>Load a scenario</button>}
      </div>
      {crewOpen && <CrewDrawer crew={crewOpen} onClose={() => setOpen(null)} onEscalate={(id) => { setOpen(null); run("Escalation", () => api.escalate(id)); }} />}
    </main>
  );
}

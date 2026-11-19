import { useEffect, useState } from "react";
import { api } from "../api/client";

type J = Record<string, any>; // eslint-disable-line @typescript-eslint/no-explicit-any
const ent = (o: unknown): [string, J][] => Object.entries((o ?? {}) as Record<string, J>);
const pct = (x: number | null | undefined) => (x === null || x === undefined || Number.isNaN(x) ? "n/a" : `${(100 * x).toFixed(1)} %`);
function Badge({ t }: { t: string }) { return <span className="dtype">{t}</span>; }
function Src({ file, cmd = "make eval" }: { file: string; cmd?: string }) {
  return <p className="small muted">Artifact <span className="mono">eval/out/{file}</span> · regenerate with <span className="mono">{cmd}</span></p>;
}

// S11: every number is loaded from eval/out via /api/v1/evaluation — none typed into the UI.
export function Evidence() {
  const [e, setE] = useState<J | null>(null);
  const [err, setErr] = useState<string | null>(null);
  useEffect(() => { api.evaluation().then((d) => setE(d as J)).catch((x: Error) => setErr(x.message)); }, []);
  if (err) return <main><p role="alert">Evaluation artifacts unavailable: {err}</p></main>;
  if (!e) return <main><div className="skeleton" aria-busy="true" /></main>;
  const fe = e.forecast_eval ?? {}, prop = e.property_tests ?? {}, mut = e.checker_mutation ?? {};
  const bench = e.planner_bench ?? {}, cost = e.cost_of_safety ?? {}, ref = e.reference_checks ?? {};
  const clean = fe.holdout_clean_2026?.profiles ?? {};
  const prim = clean.primary_moderate_acc_shade;
  return (
    <main className="evi">
      <h1 style={{ fontSize: "var(--t-24)" }}>Evaluation &amp; evidence</h1>
      <section className="panel"><header><h2>Fail-safe property tests</h2><Badge t="SYNTHETIC TESTS" /></header>
        <table><thead><tr><th>Test</th><th>Examples</th><th>Violations</th></tr></thead>
          <tbody>{(prop.tests ?? []).map((t: J) => <tr key={t.test}><td className="mono small">{t.test}</td><td>{t.examples}</td><td className={t.violations ? "verdict-no" : "verdict-ok"}>{t.violations}</td></tr>)}</tbody></table>
        <p>Total {prop.total_examples} generated cases, {prop.failures} failures.</p><Src file="property_tests.json" /></section>
      <section className="panel"><header><h2>Day-ahead warning skill — clean holdout 2026</h2><span><Badge t="HISTORICAL FORECASTS" /> <Badge t="REAL OBSERVATIONS" /></span></header>
        <p>Forecast margin δ = {fe.delta_frozen?.value} °C ({fe.delta_frozen?.rule}; train {String(fe.delta_frozen?.train_years)}). {fe.lead_time}.</p>
        <div className="scroll-x"><table><thead><tr><th>Profile</th><th>Reference</th><th>Hours</th><th>Events</th><th>POD</th><th>FAR</th><th>CSI</th><th>Under-warning</th></tr></thead>
          <tbody>{ent(clean).map(([k, p]: [string, J]) => <tr key={k}><td className="small">{k}</td><td className="small">{p.reference}</td><td>{p.k3.hours}</td><td>{p.k3.events_ref}</td><td>{pct(p.k3.pod)}</td><td>{pct(p.k3.far)}</td><td>{pct(p.k3.csi)}</td><td>{pct(p.k3.under_warning_rate)}</td></tr>)}</tbody></table></div>
        {prim && <><h3 style={{ marginBlockStart: 16, fontSize: "var(--t-14)" }}>Primary profile vs baselines (event = level ≥ 3)</h3>
          <table><thead><tr><th>Method</th><th>POD</th><th>FAR</th><th>CSI</th><th>Under-warning</th></tr></thead><tbody>
            <tr><td>AmanShift (forecast + δ)</td><td>{pct(prim.k3.pod)}</td><td>{pct(prim.k3.far)}</td><td>{pct(prim.k3.csi)}</td><td>{pct(prim.k3.under_warning_rate)}</td></tr>
            {ent(prim.baselines_k3).map(([k, b]: [string, J]) => <tr key={k}><td>{k}</td><td>{pct(b.pod)}</td><td>{pct(b.far)}</td><td>{pct(b.csi)}</td><td>{pct(b.under_warning_rate)}</td></tr>)}
          </tbody></table></>}
        <p className="small">Limitations: {(fe.limitations ?? []).join("; ")}.</p><Src file="forecast_eval.json" /></section>
      <section className="panel"><header><h2>Checker mutation testing</h2><Badge t="SYNTHETIC TESTS" /></header>
        <table><thead><tr><th>Operator</th><th>Rule</th><th>Non-equivalent</th><th>Killed</th><th>Kill rate</th></tr></thead>
          <tbody>{ent(mut.operators).map(([k, o]: [string, J]) => <tr key={k}><td>{k}</td><td>{o.safety_rule ?? "—"}</td><td>{o.non_equivalent}</td><td>{o.killed}</td><td>{pct(o.kill_rate)}</td></tr>)}</tbody></table>
        <p>Overall kill rate {pct(mut.kill_rate_total)}; safety-critical survivors {mut.safety_critical_survivors}. {mut.note}</p><Src file="checker_mutation.json" /></section>
      <section className="panel"><header><h2>Planner benchmark</h2><Badge t="SYNTHETIC TESTS" /></header>
        <div className="scroll-x"><table><thead><tr><th>Crews/resources</th><th>Planner</th><th>Priority-weighted unprotected</th><th>Crews stopped</th><th>Sites with checker violations</th></tr></thead>
          <tbody>{(bench.tiers ?? []).flatMap((t: J) => ["amanshift_greedy", "naive_greedy", "no_replan"].map((k) => <tr key={`${t.crews}-${k}`}><td>{t.crews}/{t.resources}</td><td>{k}</td><td>{t[k].mean_priority_weighted_unprotected}</td><td>{t[k].mean_crews_stopped}</td><td>{t[k].sites_with_checker_violations}/{t.sites}</td></tr>))}</tbody></table></div>
        <Src file="planner_bench.json" /></section>
      <section className="panel"><header><h2>Cost of safety</h2><span><Badge t="SIMULATED SITE" /> <Badge t="HISTORICAL FORECASTS" /></span></header>
        <table><thead><tr><th>Information state</th><th>Permitted work person-hours</th><th>Reduction</th></tr></thead>
          <tbody>{Object.entries(cost.permitted_work_person_hours ?? {}).map(([k, v]) => <tr key={k}><td>{k}</td><td>{String(v)}</td><td>{cost.reduction_vs_full_pct?.[k]} %</td></tr>)}</tbody></table>
        <p className="small">{cost.note} Season {String(cost.season)}, {cost.days} days.</p><Src file="cost_of_safety.json" /></section>
      <section className="panel"><header><h2>Reference reproduction</h2><Badge t="REFERENCE VALUES" /></header>
        <p>Liljegren vs thermofeel vectors: max error {ref.t_ref_01_liljegren?.max_abs_error_c} °C over {ref.t_ref_01_liljegren?.vectors} vectors · NIOSH golden rows {(ref.t_ref_02_niosh?.rows ?? []).length} · solar geometry {ref.t_ref_04_solar?.max_cos_zenith_21jun} vs {ref.t_ref_04_solar?.expected} · all pass: <b>{String(ref.all_pass)}</b></p><Src file="reference_checks.json" /></section>
      <section className="panel"><header><h2>Not validated</h2><Badge t="NOT VALIDATED" /></header>
        <ul><li>Reduction of heat illness or injury — requires a field pilot (doc 06 §14).</li><li>Accuracy against onsite measured WBGT/TWL at a worksite.</li>
          <li>Worker comprehension of translated cards — pending native review.</li><li>Supervisor adherence and real operations.</li></ul></section>
    </main>
  );
}

import { useEffect, useRef, useState } from "react";
import type { CrewView, SiteState } from "../api/client";
import { actionText, crewName, reasonText, resName, taskContext, tzOffsetMin, zoneName } from "../site/derive";
import { Icon } from "./Icon";
import { LevelBadge } from "./LevelBadge";

interface Props { crew: CrewView; level: number; s: SiteState; onClose: () => void; onEscalate: (id: string) => void }

// Crew drawer: plain-language reasoning first, full computation trace behind "How this was determined".
export function CrewDetail({ crew: c, level, s, onClose, onEscalate }: Props) {
  const d = s.site.display;
  const typeOf = Object.fromEntries(s.coverage.resources.map((r) => [r.resource_id, r.type]));
  const ref = useRef<HTMLDivElement>(null);
  const opener = useRef<Element | null>(null);
  const [confirming, setConfirming] = useState(false);
  useEffect(() => {
    opener.current = document.activeElement;
    ref.current?.focus();
    const k = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", k);
    return () => { window.removeEventListener("keydown", k); (opener.current as HTMLElement | null)?.focus?.(); };
  }, [onClose]);
  const t = c.trace;
  const fmax = Math.round(t.f_cap_effective * 100);
  const reasons = c.reasons.filter((r) => r !== "STANDARD");
  return (
    <>
      <div className="scrim" onClick={onClose} />
      <div className="drawer" role="dialog" aria-modal="true" aria-labelledby="crew-h" ref={ref} tabIndex={-1}>
        <header>
          <div style={{ display: "grid", gap: 6 }}>
            <span className="eyebrow">{zoneName(d, c.zone_id)} · {c.size} workers · id {c.crew_id}</span>
            <h2 id="crew-h" style={{ fontSize: "var(--t-24)" }}>{crewName(d, c.crew_id)}</h2>
            <span><LevelBadge level={level} degraded={c.degraded || level > c.display_level} english /></span>
          </div>
          <button className="btn-ghost" onClick={onClose} aria-label="Close"><Icon name="close" /></button>
        </header>
        <section>
          <h3>Current protective action</h3>
          <p style={{ fontSize: "var(--t-20)", fontWeight: 600 }}>{actionText(c, d, tzOffsetMin(s))}</p>
          {level > c.display_level && <p className="notice">Offline: shown at a stricter level than the last plan because information is ageing.</p>}
          {c.action && !c.action_valid && <p className="notice crit">The accepted plan no longer protects this crew under current conditions. Generate a new protection plan.</p>}
        </section>
        <section>
          <h3>Why</h3>
          <p>{taskContext(c)}. Estimated heat stress (forecast, including safety margin) is <b className="num">{t.estimated_wbgt_c} °C</b>; with clothing it is <b className="num">{t.effective_wbgt_c} °C</b>. At this workload the {t.limit_kind === "RAL" ? "limit for unacclimatized workers" : "recommended limit"} allows at most <b className="num">{fmax} %</b> work per hour.</p>
          {reasons.length > 0 && <ul className="small" style={{ margin: 0, paddingInlineStart: 18 }}>{reasons.map((r) => <li key={r}>{reasonText(r)}</li>)}</ul>}
        </section>
        <section>
          <h3>Protection reachable</h3>
          <div className="protect">
            {c.rest_edges.length ? c.rest_edges.map((r) => <span key={r}><Icon name={typeOf[r] === "cooled_rest" ? "cabin" : "shade"} size={14} />{resName(d, r)}</span>)
              : <span className="none"><Icon name="alert" size={14} />No rest area within walking limit</span>}
            {c.water_edges.length ? c.water_edges.map((r) => <span key={r}><Icon name="water" size={14} />{resName(d, r)}</span>)
              : <span className="none"><Icon name="alert" size={14} />No water station</span>}
          </div>
          <p className="small muted">Only resources that are available and physically confirmed within the last 30 minutes count.</p>
        </section>
        <section>
          <h3>Options the policy permits</h3>
          <ul className="small" style={{ margin: 0, paddingInlineStart: 18 }}>
            {c.escalated ? <li>Stop and clinical escalation only</li> : <li>Stop work and rest{c.rest_edges.length ? ` at ${c.rest_edges.map((r) => resName(d, r)).join(" or ")}` : " at the nearest shade"}</li>}
            {c.defer_earliest && <li>Move the task to after {c.defer_earliest} GST</li>}
            {c.work_options.length ? <li>Work up to {Math.round(Math.max(...c.work_options.map((o) => o.f)) * 60)} min per hour with assigned rest and water</li> : <li>No work schedule is permitted right now</li>}
          </ul>
          <details className="more">
            <summary>How this was determined</summary>
            <dl className="trace">
              <dt>Estimated WBGT ({t.estimated_wbgt_kind}), incl. margin {t.forecast_margin_c} °C</dt><dd>{t.estimated_wbgt_c} °C</dd>
              <dt>Clothing adjustment (NIOSH Table 3-2)</dt><dd>+{t.clothing_adjustment_c} °C</dd>
              <dt>Effective WBGT</dt><dd>{t.effective_wbgt_c} °C</dd>
              <dt>Metabolic rate (NIOSH category)</dt><dd>{t.metabolic_w} W</dd>
              <dt>Limit at full work ({t.limit_kind}, NIOSH 2016-106)</dt><dd>{t.limit_full_work_c} °C</dd>
              <dt>Maximum work fraction / effective cap</dt><dd>{t.f_max} / {t.f_cap_effective}</dd>
              <dt>ADOSH TWL zone</dt><dd>{t.twl_zone ?? "no onsite reading"}</dd>
              <dt>Policy floors</dt><dd>{c.floors.join(", ") || "none"}</dd>
              <dt>Reason codes</dt><dd>{c.reasons.join(", ") || "—"}</dd>
            </dl>
            <p className="xs muted" style={{ marginTop: 8 }}>Weather values are estimates from a day-ahead forecast grid cell — not measured at the site.</p>
          </details>
        </section>
        <section>
          <h3>Symptoms in this crew</h3>
          {c.escalated ? <p className="notice crit">Symptom report open. The crew stays stopped until the medic closes it.</p>
            : !confirming ? <button className="btn-danger" onClick={() => setConfirming(true)}><Icon name="medic" size={18} />Report symptoms in this crew</button>
            : (
              <div className="notice crit" role="alertdialog" aria-label="Confirm symptom report" style={{ display: "grid", gap: 12 }}>
                <span>{crewName(d, c.crew_id)} will stop work and the medic is alerted. Confirm?</span>
                <span style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                  <button className="btn-danger" onClick={() => { setConfirming(false); onEscalate(c.crew_id); }}>Confirm report</button>
                  <button onClick={() => setConfirming(false)}>Cancel</button>
                </span>
              </div>)}
        </section>
      </div>
    </>
  );
}

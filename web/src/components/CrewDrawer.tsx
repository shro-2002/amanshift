import { useEffect, useRef, useState } from "react";
import type { CrewView } from "../api/client";
import { LevelBadge } from "./LevelBadge";
import { Value } from "./ProvenanceChip";

interface Props { crew: CrewView; onClose: () => void; onEscalate: (id: string) => void }

// S5 lite: computation trace + permitted actions + two-step escalation. No individual data exists.
export function CrewDrawer({ crew: c, onClose, onEscalate }: Props) {
  const ref = useRef<HTMLDivElement>(null);
  const [confirming, setConfirming] = useState(false);
  useEffect(() => {
    ref.current?.focus();
    const k = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", k);
    return () => window.removeEventListener("keydown", k);
  }, [onClose]);
  const t = c.trace;
  const src = "Open-Meteo Previous Runs (HIST-FCST)";
  return (
    <>
      <div className="scrim" onClick={onClose} />
      <div className="drawer" role="dialog" aria-modal="true" aria-label={`Crew ${c.crew_id} detail`} ref={ref} tabIndex={-1}>
        <header><h3>Crew {c.crew_id} <span className="muted">×{c.size}</span></h3><button onClick={onClose} aria-label="Close">✕</button></header>
        <p><LevelBadge level={c.display_level} degraded={c.degraded} english /></p>
        <p className="muted small">{c.workload} work · {c.ppe.replace(/_/g, " ")} · {c.acclimatization} · {c.exposure.replace(/_/g, " ")} · zone {c.zone_id}</p>
        <h2>Computation trace</h2>
        <dl className="trace">
          <dt>Estimated WBGT ({t.estimated_wbgt_kind}) + δ</dt><dd><Value value={t.estimated_wbgt_c} unit="°C" kind={c.reasons.includes("FORECAST_DEGRADED") ? "fallback" : "forecast"} source={src} detail={`δ ${t.forecast_margin_c} °C included`} /></dd>
          <dt>+ clothing adjustment</dt><dd><Value value={t.clothing_adjustment_c} unit="°C" kind="derived" source="NIOSH Table 3-2" /></dd>
          <dt>= effective WBGT</dt><dd><Value value={t.effective_wbgt_c} unit="°C" kind="derived" source="AmanShift" /></dd>
          <dt>Metabolic rate</dt><dd><Value value={t.metabolic_w} unit="W" kind="derived" source="NIOSH category (policy)" /></dd>
          <dt>Limit at full work ({t.limit_kind})</dt><dd><Value value={t.limit_full_work_c} unit="°C" kind="derived" source="NIOSH 2016-106 equation" /></dd>
          <dt>Max work fraction</dt><dd>{t.f_max} (effective cap {t.f_cap_effective})</dd>
          <dt>TWL zone</dt><dd>{t.twl_zone ?? "no reading"}{t.twl_zone ? ` (cap ${t.twl_cap})` : ""}</dd>
          <dt>Floors</dt><dd>{c.floors.join(", ") || "none"}</dd>
          <dt>Reasons</dt><dd>{c.reasons.join(", ") || "—"}</dd>
        </dl>
        <h2 style={{ marginBlockStart: 16 }}>Permitted actions</h2>
        <ul className="small">
          {c.escalated ? <li>stop + clinical escalation only</li> : <li>stop (any reachable rest: {c.rest_edges.join(", ") || "none"})</li>}
          {c.defer_earliest && <li>move task after {c.defer_earliest} GST</li>}
          {c.work_options.length ? <li>work at fractions ≤ {Math.max(...c.work_options.map((o) => o.f))} with {[...new Set(c.work_options.map((o) => o.rest ?? "no rest"))].join(", ")}</li>
            : <li>no work option permitted</li>}
        </ul>
        <h2 style={{ marginBlockStart: 16 }}>Assigned</h2>
        <p>{c.action ? `${c.action.action}${c.action.work_fraction ? ` ${c.action.work_fraction}` : ""} · rest ${c.action.rest_resource ?? "none"} · water ${c.action.water_resource ?? "none"}` : "no plan"}</p>
        <div style={{ marginBlockStart: 24 }}>
          {!confirming ? <button className="btn-danger" onClick={() => setConfirming(true)}>⚕ Report symptoms in this crew</button> : (
            <div className="banner escalation" role="alertdialog" aria-label="Confirm escalation">
              <span>Crew {c.crew_id} will STOP and the medic is alerted. Confirm?</span>
              <button className="btn-danger" onClick={() => { setConfirming(false); onEscalate(c.crew_id); }}>Confirm escalation</button>
              <button onClick={() => setConfirming(false)}>Cancel</button>
            </div>)}
        </div>
      </div>
    </>
  );
}

import type { SiteState } from "../api/client";
import { linkTo } from "../router";
import { briefing } from "../site/derive";
import { Icon } from "./Icon";

interface Props { s: SiteState; override: Record<string, number>; isOffline: boolean; actions?: boolean }

// Protection briefing: a deterministic summary of server state (site/derive.ts → briefing). No language model.
export function BriefingPanel({ s, override, isOffline, actions = true }: Props) {
  const b = briefing(s, override, isOffline);
  return (
    <section className={`briefing ${b.tone}`} aria-labelledby="brief-h" role={b.tone === "crit" ? "alert" : undefined}>
      <div>
        <span className="tag"><Icon name="shield" size={14} />Protection briefing <span className="muted">· site state at {s.eval_time_local} GST</span></span>
        <h2 id="brief-h">{b.headline}</h2>
        <dl>
          {b.facts.map(([k, v]) => <div key={k} style={{ display: "contents" }}><dt>{k}</dt><dd>{v}</dd></div>)}
          <dt>Next</dt><dd><b>{b.next}</b></dd>
        </dl>
      </div>
      {actions && (
        <div className="cta">
          <a className="btn btn-primary btn-lg" href="/app/protection" onClick={linkTo("/app/protection")}>Review in Protection<Icon name="arrow" size={16} /></a>
          <a className="btn" href="/app/worksite" onClick={linkTo("/app/worksite")}><Icon name="map" size={16} />Show on map</a>
        </div>)}
    </section>
  );
}

import { Icon } from "../Icon";
import { LevelBadge } from "../LevelBadge";

// Hero product preview. Values mirror the demonstration scenario after the cooled rest cabin
// failure (data/scenarios/demo-site-a.json: C2 8 + C5 6 workers; R1 20 + R3 12 rest places).
const METRICS: [string, string][] = [
  ["14", "workers need new protection"],
  ["2 of 3", "rest areas available"],
  ["32", "rest places confirmed"],
];

const CREWS = ["Concrete Pour", "Site Logistics"];

export function ProductPreview() {
  return (
    <figure className="hp-preview" aria-labelledby="hp-preview-cap">
      <div className="hp-preview-bar">
        <span className="hp-dots" aria-hidden="true"><i /><i /><i /></span>
        <span className="hp-preview-site">Demo Site A · 10:30 GST</span>
        <span className="hp-chip"><Icon name="forecast" size={12} />Forecast current</span>
      </div>
      <div className="hp-preview-body">
        <p className="hp-kicker"><Icon name="shield" size={14} />Protection briefing</p>
        <p className="hp-brief">Central cooled rest cabin unavailable — 14 workers need alternative protection</p>
        <dl className="hp-metrics">
          {METRICS.map(([v, label]) => (
            <div key={label}><dt>{label}</dt><dd>{v}</dd></div>
          ))}
        </dl>
        <ul className="hp-crews" role="list">
          {CREWS.map((c) => (
            <li key={c}>
              <span className="hp-crew-name">{c}</span>
              <span className="hp-crew-act">Stop work required · no rest area within walking limit</span>
              <LevelBadge level={4} english />
            </li>
          ))}
          <li className="hp-crews-more"><span>4 other crews</span><span>Current plan still applies</span></li>
        </ul>
        <p className="hp-next"><Icon name="arrow" size={14} />Next: generate and acknowledge a new protection plan</p>
      </div>
      <figcaption id="hp-preview-cap" className="hp-preview-cap">Product preview · demonstration scenario</figcaption>
    </figure>
  );
}

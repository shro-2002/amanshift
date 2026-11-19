import type { Timeline as T } from "../api/client";

const W = 1100, H = 170, X0 = 36, X1 = 1084, Y0 = 16, Y1 = 118;
const SHAPE = ["", "●", "▲", "◆", "⬢"];
const hm = (s: string) => { const [h, m] = s.split(":").map(Number); return h + m / 60; };

export function Timeline({ tl, scenarioDate }: { tl: T; scenarioDate: string }) {
  if (!tl.hours.length) return null;
  const h0 = tl.hours[0].hour, h1 = tl.hours[tl.hours.length - 1].hour;
  const x = (h: number) => X0 + ((h - h0) / (h1 - h0)) * (X1 - X0);
  const vals = tl.hours.flatMap((h) => [h.wbgt_sun_est, h.wbgt_shade_est]);
  const lo = Math.floor(Math.min(...vals) - 1), hi = Math.ceil(Math.max(...vals) + 1);
  const y = (v: number) => Y1 - ((v - lo) / (hi - lo)) * (Y1 - Y0);
  const line = (k: "wbgt_sun_est" | "wbgt_shade_est") => tl.hours.map((h, i) => `${i ? "L" : "M"}${x(h.hour)},${y(h[k])}`).join(" ");
  const mmdd = scenarioDate.slice(5);
  const ban = mmdd >= tl.midday_break.from && mmdd <= tl.midday_break.to;
  return (
    <figure style={{ margin: 0 }}>
      <svg viewBox={`0 0 ${W} ${H}`} width="100%" role="img" aria-labelledby="tl-title">
        <title id="tl-title">Estimated WBGT (forecast-derived) and site maximum level, 06:00 to 18:00 GST</title>
        <defs><pattern id="hatch" width="6" height="6" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
          <line x1="0" y1="0" x2="0" y2="6" stroke="var(--ink-3)" strokeWidth="1.5" /></pattern></defs>
        {ban && <g>
          <rect x={x(hm(tl.midday_break.start))} y={Y0} width={x(hm(tl.midday_break.end)) - x(hm(tl.midday_break.start))} height={Y1 - Y0} fill="url(#hatch)" opacity={0.5} />
          <text x={x(hm(tl.midday_break.start)) + 3} y={Y0 + 11} fontSize="10" fill="var(--ink-2)">midday break {tl.midday_break.start}–{tl.midday_break.end}</text>
        </g>}
        {[lo, Math.round((lo + hi) / 2), hi].map((v) => (
          <g key={v}><line x1={X0} x2={X1} y1={y(v)} y2={y(v)} stroke="var(--line)" /><text x={4} y={y(v) + 4} fontSize="10" fill="var(--ink-2)">{v}°</text></g>
        ))}
        <path d={line("wbgt_sun_est")} fill="none" stroke="var(--sev-3)" strokeWidth={2} />
        <path d={line("wbgt_shade_est")} fill="none" stroke="var(--brand)" strokeWidth={2} strokeDasharray="6 3" />
        {tl.hours.map((h) => (
          <g key={h.hour}>
            <text x={x(h.hour)} y={Y1 + 14} fontSize="10" textAnchor="middle" fill="var(--ink-2)">{String(h.hour).padStart(2, "0")}</text>
            <text x={x(h.hour)} y={Y1 + 36} fontSize="13" textAnchor="middle" fill={`var(--sev-${h.site_max_level})`}>{SHAPE[h.site_max_level]}</text>
          </g>
        ))}
        {tl.meters.map((m, i) => (
          <text key={i} x={x(hm(m.at))} y={m.wbgt ? y(m.wbgt) : Y0 + 20} fontSize="12" textAnchor="middle" fill="var(--ink)">◇</text>
        ))}
        <line x1={x(hm(tl.now))} x2={x(hm(tl.now))} y1={Y0 - 6} y2={Y1 + 40} stroke="var(--ink)" strokeWidth={1.5} />
        <text x={x(hm(tl.now)) + 3} y={Y0 - 6 + 9} fontSize="10" fill="var(--ink)">now {tl.now}</text>
      </svg>
      <figcaption className="small muted">
        <span style={{ color: "var(--sev-3)" }}>━ sun</span> · <span style={{ color: "var(--brand)" }}>╍ shade</span> estimated WBGT (forecast-derived, before margin δ; never "measured") · shapes = site maximum level per hour · ◇ meter entry
      </figcaption>
      <details className="small"><summary>Timeline as table</summary>
        <table><thead><tr><th>Hour</th><th>Sun est. °C</th><th>Shade est. °C</th><th>Site max level</th></tr></thead>
          <tbody>{tl.hours.map((h) => <tr key={h.hour}><td>{h.hour}:00</td><td>{h.wbgt_sun_est}</td><td>{h.wbgt_shade_est}</td><td>{h.site_max_level}</td></tr>)}</tbody></table>
      </details>
    </figure>
  );
}

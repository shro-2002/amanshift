import { Icon, type IconName } from "../Icon";
import { LevelBadge } from "../LevelBadge";

// HTML/CSS interface fragments for the homepage feature sections. Names and resources come from
// the demonstration scenario (data/scenarios/demo-site-a.json); hourly levels are an illustration
// of the layout, not a forecast, and are labelled as such.

const SHAPE = ["", "●", "▲", "◆", "⬢"];
const WORD = ["", "Standard", "Increased care", "Work / rest", "Stop"];
const BREAK_HOURS = new Set([13, 14]);
// hour → illustrative level (06–18)
const HOURS: [number, number][] = [
  [6, 1], [7, 2], [8, 2], [9, 3], [10, 3], [11, 3], [12, 4], [13, 0], [14, 0], [15, 3], [16, 3], [17, 2], [18, 2],
];

function FragmentHead({ icon, title, tag }: { icon: IconName; title: string; tag: string }) {
  return (
    <div className="hf-head">
      <span className="hf-title"><Icon name={icon} size={16} />{title}</span>
      <span className="hf-tag">{tag}</span>
    </div>
  );
}

export function AnticipateFragment() {
  return (
    <div className="hf">
      <FragmentHead icon="forecast" title="Tomorrow · Concrete Pour" tag="Illustration" />
      <p className="hf-sub">Moderate work · work clothes · direct sun · estimated WBGT (forecast)</p>
      <ol className="hf-hours" role="list" aria-label="Illustrative hourly levels, 06:00 to 18:00">
        {HOURS.map(([h, l]) => {
          const label = BREAK_HOURS.has(h) ? "midday break" : `level ${l} ${WORD[l]}`;
          return (
            <li key={h} className={BREAK_HOURS.has(h) ? "hf-break" : `sev-${l}`} aria-label={`${String(h).padStart(2, "0")}:00 ${label}`}>
              <span aria-hidden="true">{BREAK_HOURS.has(h) ? "" : SHAPE[l]}</span>
              <time aria-hidden="true">{String(h).padStart(2, "0")}</time>
            </li>
          );
        })}
      </ol>
      <p className="hf-note"><span className="hf-swatch" aria-hidden="true" />12:30–15:00 midday break, 15 Jun–15 Sep</p>
      <ul className="hf-rows" role="list">
        <li><span>Work / rest from 09:00</span><LevelBadge level={3} english /></li>
        <li><span>Rest area required: Central cooled rest cabin</span><Icon name="cabin" size={16} /></li>
      </ul>
    </div>
  );
}

const RESOURCES: { icon: IconName; name: string; places: string; serves?: string }[] = [
  { icon: "shade", name: "West shade canopy", places: "20 places" },
  { icon: "cabin", name: "Central cooled rest cabin", places: "16 places", serves: "Only rest area within walking limit for Concrete Pour and Site Logistics" },
  { icon: "shade", name: "East shade canopy", places: "12 places" },
  { icon: "water", name: "Water stations", places: "3 stations" },
];

export function CoordinateFragment() {
  return (
    <div className="hf">
      <FragmentHead icon="shield" title="Protection on site" tag="Demonstration scenario" />
      <ul className="hf-res" role="list">
        {RESOURCES.map((r) => (
          <li key={r.name} className={r.serves ? "hf-res-key" : undefined}>
            <span className="hf-res-ico" aria-hidden="true"><Icon name={r.icon} size={18} /></span>
            <span className="hf-res-main">
              <b>{r.name}</b>
              <span>{r.places}</span>
              {r.serves && <span className="hf-dep"><Icon name="crew" size={14} />{r.serves}</span>}
            </span>
            <span className="hf-ok"><Icon name="check" size={14} />Confirmed on site</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

const EVENTS: { icon: IconName; what: string; then: string }[] = [
  { icon: "forecast", what: "Forecast out of date", then: "Levels use a conservative seasonal bound" },
  { icon: "cabin", what: "Central cooled rest cabin unavailable", then: "Concrete Pour, Site Logistics: stop work required" },
  { icon: "offline", what: "Network offline", then: "Worker devices tighten, then STOP-HOLD" },
];

export function RespondFragment() {
  return (
    <div className="hf">
      <FragmentHead icon="alert" title="When something fails" tag="Demonstration scenario" />
      <ul className="hf-events" role="list">
        {EVENTS.map((e) => (
          <li key={e.what}>
            <span className="hf-ev-what"><Icon name={e.icon} size={16} />{e.what}</span>
            <span className="hf-ev-then"><Icon name="arrow" size={14} className="rtl-mirror" />{e.then}</span>
          </li>
        ))}
      </ul>
      <div className="hf-reject" role="note">
        <span className="hf-reject-ico" aria-hidden="true"><Icon name="x" size={16} /></span>
        <span>
          <b>Previous plan · Policy check failed</b>
          <span>It still sends crews to the unavailable cooled rest cabin, so it cannot be acknowledged.</span>
        </span>
      </div>
    </div>
  );
}

const LANG_CHIPS: [string, string][] = [["en", "EN"], ["ar", "عربي"], ["hi", "हिं"], ["ur", "اردو"], ["bn", "বাং"]];

export function WorkerPhone() {
  return (
    <figure className="hf-phone" aria-labelledby="hf-phone-cap">
      <div className="hf-phone-screen">
        <div className="hf-phone-langs" aria-hidden="true">
          {LANG_CHIPS.map(([l, t]) => <span key={l} lang={l} className={l === "ar" ? "on" : undefined}>{t}</span>)}
        </div>
        <div className="hf-card" lang="ar" dir="rtl">
          <p className="hf-card-crew">طاقمك: Concrete Pour</p>
          <span role="img" className="badge sev-4 lg" aria-label="Level 4 STOP">
            <span aria-hidden="true">⬢</span><span className="num" aria-hidden="true">4</span><span aria-hidden="true">توقّف</span>
          </span>
          <span className="hf-card-picto" aria-hidden="true"><Icon name="stop" size={30} stroke={2.5} /><Icon name="shade" size={30} stroke={2.5} /></span>
          <p className="hf-card-action">توقّف عن العمل. اذهب إلى أقرب ظل.</p>
          <p className="hf-card-en" lang="en" dir="ltr">Stop work. Go to the nearest shade.</p>
        </div>
        <div className="hf-unwell" lang="ar" dir="rtl">
          <b>هل تشعر بتعب؟</b>
          <span>توقّف. تبرّد. لا تبقَ وحدك. أخبر مشرفك.</span>
          <span className="hf-sos"><Icon name="phone" size={14} />الطوارئ 998</span>
        </div>
        <p className="hf-pending">Arabic pending native review</p>
      </div>
      <figcaption id="hf-phone-cap" className="sr-only">Worker companion preview: Arabic card for the Concrete Pour crew, level 4 stop, go to the nearest shade.</figcaption>
    </figure>
  );
}

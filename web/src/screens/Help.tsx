import { Icon, type IconName } from "../components/Icon";
import { linkTo } from "../router";
import { Evidence } from "./Evidence";
import { Method } from "./Method";

const CARDS: [string, IconName, string, string][] = [
  ["/help/validation", "shield", "Technical validation", "Measured results from the evaluation suite: forecast skill against baselines, fail-safe property tests, checker mutation testing, planner benchmark, cost of safety, reference reproduction."],
  ["/help/method", "help", "Method, assumptions & limitations", "How estimated heat stress, NIOSH limits, ADOSH TWL zones and the midday break combine — and what AmanShift does not do."],
  ["/tour", "play", "Product tour", "Live scenario: cooling outage, affected crews, revised plan, rejected previous arrangement, connectivity loss."],
  ["/worker", "phone", "Worker companion", "The field view a crew sees: one protective action, pictograms first, five languages, works offline."],
];

function Head({ eyebrow, title, text }: { eyebrow: string; title: string; text: string }) {
  return <div className="page-head"><div><span className="eyebrow">{eyebrow}</span><h1>{title}</h1><p>{text}</p></div></div>;
}

export function HelpIndex() {
  return (
    <div className="page">
      <Head eyebrow="Help & resources" title="How AmanShift works" text="Operational guidance, the scientific method and the measured technical evidence — kept separate from day-to-day protection work." />
      <div className="help-grid">
        {CARDS.map(([to, icon, title, text]) => (
          <a key={to} href={to} className="help-card" onClick={linkTo(to)}>
            <span className="ico-chip"><Icon name={icon} /></span><h2>{title}</h2><p>{text}</p>
          </a>))}
      </div>
      <section className="card" aria-labelledby="repro-h">
        <header><h2 id="repro-h">Reproduce every number</h2></header>
        <div className="body small" style={{ display: "grid", gap: 8 }}>
          <p>All figures shown in the product and the technical report are produced by the evaluation suite into <span className="mono">eval/out/</span>. Nothing is typed by hand.</p>
          <p className="mono">make setup · make test · make eval · make demo</p>
        </div>
      </section>
    </div>
  );
}

export function HelpValidation() {
  return (
    <div className="page">
      <Head eyebrow="Help & resources" title="Technical validation" text="Measured results from the evaluation suite, loaded live from eval/out. Synthetic tests and simulated sites are labelled as such; nothing here is a health-outcome claim." />
      <Evidence />
    </div>
  );
}

export function HelpMethod() {
  return (
    <div className="page">
      <Head eyebrow="Help & resources" title="Method, assumptions & limitations" text="Plain-language description of the science and the safety design. Full detail in docs/02 and LIMITATIONS.md." />
      <Method />
    </div>
  );
}

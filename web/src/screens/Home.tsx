import type { ReactNode } from "react";

import { BrandMark } from "../app/AppShell";
import { Icon } from "../components/Icon";
import { AnticipateFragment, CoordinateFragment, RespondFragment, WorkerPhone } from "../components/home/Fragments";
import { ProductPreview } from "../components/home/ProductPreview";
import { linkTo } from "../router";
import "../styles/home.css";

// Public homepage (doc 13 §4 Website, doc 12 §2 story, §8 wording). Photos: web/public/img/ATTRIBUTION.md.

// React 18 does not recognise the camelCase prop; pass the HTML attribute directly.
const HIGH_PRIORITY = { fetchpriority: "high" } as Record<string, string>;

function RouteLink({ to, className, children }: { to: string; className?: string; children: ReactNode }) {
  return <a href={to} className={className} onClick={linkTo(to)}>{children}</a>;
}

const FACTS: { fact: string; source: string }[] = [
  { fact: "Outdoor work in direct sun pauses 12:30–15:00 every day from 15 June to 15 September.",
    source: "UAE MoHRE midday work break · 2026 dates via secondary sources" },
  { fact: "Recommended heat limits depend on how hard the work is and what workers wear.",
    source: "NIOSH Criteria Document, Pub. 2016-106" },
  { fact: "Abu Dhabi manages heat at work with Thermal Work Limit zones from onsite readings.",
    source: "ADOSH-SF Code of Practice CoP 11.0, Safety in the Heat" },
];

interface Feature { id: string; eyebrow: string; title: string; body: string; points: string[]; media: ReactNode; wide?: boolean }

const FEATURES: Feature[] = [
  { id: "anticipate", eyebrow: "Anticipate risk", title: "Know tomorrow's heat exposure for every crew.",
    body: "A day-ahead forecast becomes an hourly level for each crew, adjusted for workload, clothing and acclimatization. Onsite meter readings can only make a level stricter.",
    points: ["Estimated WBGT from the forecast, never presented as measured", "Midday break built into the plan", "Four levels, each with one clear action"],
    media: <AnticipateFragment /> },
  { id: "coordinate", eyebrow: "Coordinate protection", title: "Plan around the shade, cooling and water that is really there.",
    body: "Rest areas and water count only when a supervisor has confirmed them on site, with capacity and walking distance. AmanShift shows which crews depend on which resource.",
    points: ["Physical confirmation, renewed every 30 minutes", "Capacity and walking limits respected", "Consequences of losing a resource shown in advance"],
    media: (
      <div className="hm-photo-stack">
        <figure className="hm-photo">
          <img src="/img/crew-ppe.webp" width={1200} height={712} loading="lazy" decoding="async"
            alt="A construction worker in a hard hat and safety harness working on scaffolding." />
          <figcaption>Photo: Bm Asif / Pexels</figcaption>
        </figure>
        <CoordinateFragment />
      </div>
    ), wide: true },
  { id: "respond", eyebrow: "Respond when systems fail", title: "When information disappears, protection only tightens.",
    body: "A stale forecast, a broken cooling cabin or a dropped network never relaxes a recommendation. The supervisor sees exactly which crews are affected, and a separately implemented policy check rejects any plan that no longer fits the conditions.",
    points: ["Stale forecast falls back to a conservative seasonal bound", "Affected crews identified the moment a resource fails", "Offline devices tighten on their own, then STOP-HOLD"],
    media: <RespondFragment /> },
  { id: "privacy", eyebrow: "Protect without surveillance", title: "Built to protect crews, not to watch people.",
    body: "The crew is the smallest unit. No names, no tracking, no biometrics. Each crew gets one instruction in their language on a shared phone or tablet, readable in direct sun and offline.",
    points: ["English, Arabic, Hindi, Urdu and Bengali", "Not for discipline, pay or hiring", "Symptom escalation closes only by the medic role"],
    media: <WorkerPhone /> },
];

function Brand() {
  return (
    <RouteLink to="/" className="hm-brand"><BrandMark size={26} /><b>AmanShift</b></RouteLink>
  );
}

function Hero() {
  return (
    <section className="hm-hero" aria-labelledby="hm-h1">
      <img className="hm-hero-img" src="/img/hero.webp" srcSet="/img/hero-sm.webp 1000w, /img/hero.webp 2000w" sizes="100vw"
        width={2000} height={1334} decoding="async" {...HIGH_PRIORITY}
        alt="High-rise towers under construction in Dubai, with cranes, scaffolding and stacked materials on the site below." />
      <div className="hm-hero-shade" aria-hidden="true" />
      <div className="hm-wrap hm-hero-grid">
        <div className="hm-hero-copy">
          <p className="hm-eyebrow">Climate-resilient worker health · Abu Dhabi</p>
          <h1 id="hm-h1">Every worker deserves to return home safely.</h1>
          <p className="hm-lead">Predict dangerous heat exposure, coordinate protective resources and keep workers informed — even when critical systems fail.</p>
          <div className="hm-hero-ctas">
            <RouteLink to="/app" className="btn btn-primary btn-lg">Open Safety Command Center</RouteLink>
            <RouteLink to="/tour" className="hm-textlink">Take the product tour <Icon name="arrow" size={16} className="rtl-mirror" /></RouteLink>
          </div>
        </div>
        <ProductPreview />
      </div>
      <p className="hm-hero-credit">Photo: Andrea Piacquadio / Pexels</p>
    </section>
  );
}

function Problem() {
  return (
    <section id="problem" className="hm-section hm-problem" aria-labelledby="hm-problem-h">
      <div className="hm-wrap hm-problem-grid">
        <div>
          <p className="hm-kicker">Why it matters</p>
          <h2 id="hm-problem-h">Heat exposure is more than the temperature.</h2>
          <p className="hm-intro">The same afternoon can be manageable for light work in shade and dangerous for heavy work in coveralls in direct sun. Protection also depends on whether shade, cooling and water are actually there when a crew needs them.</p>
        </div>
        <ol className="hm-facts" role="list">
          {FACTS.map((f) => <li key={f.source}><p>{f.fact}</p><p className="hm-source">{f.source}</p></li>)}
        </ol>
      </div>
    </section>
  );
}

function FeatureSection({ f, index }: { f: Feature; index: number }) {
  return (
    <section id={f.id} className={`hm-section hm-feature ${index % 2 ? "hm-flip-row" : ""}`} aria-labelledby={`${f.id}-h`}>
      <div className={`hm-wrap hm-feature-grid ${f.wide ? "hm-feature-wide" : ""}`}>
        <div className="hm-feature-copy">
          <p className="hm-kicker"><span className="hm-step mono">0{index + 1}</span>{f.eyebrow}</p>
          <h2 id={`${f.id}-h`}>{f.title}</h2>
          <p className="hm-intro">{f.body}</p>
          <ul className="hm-points" role="list">
            {f.points.map((p) => <li key={p}><Icon name="check" size={16} />{p}</li>)}
          </ul>
        </div>
        <div className="hm-feature-media">{f.media}</div>
      </div>
    </section>
  );
}

const FOOT_LINKS: [string, string][] = [
  ["/help/method", "Method & limitations"], ["/help/validation", "Technical validation"], ["/worker", "Worker companion"], ["/tour", "Product tour"],
];

export function Home() {
  return (
    <div className="hm">
      <a className="skip" href="#hm-main">Skip to content</a>
      <header className="hm-header">
        <div className="hm-wrap hm-header-row">
          <Brand />
          <nav className="hm-nav" aria-label="Page sections">
            <a href="#problem">Why it matters</a>
            <a href="#anticipate">Product</a>
            <a href="#respond">Resilience</a>
            <a href="#privacy">Privacy</a>
          </nav>
          <RouteLink to="/app" className="btn btn-primary hm-header-cta">
            <span className="hm-long">Open Command Center</span><span className="hm-short">Open app</span>
          </RouteLink>
        </div>
      </header>

      <main id="hm-main">
        <Hero />
        <Problem />
        {FEATURES.map((f, i) => <FeatureSection key={f.id} f={f} index={i} />)}
        <section className="hm-cta" aria-labelledby="hm-cta-h">
          <div className="hm-wrap hm-cta-inner">
            <h2 id="hm-cta-h">See a full protection day on a demonstration site.</h2>
            <p>Replay a cooling failure, a rejected plan and an offline crew — on historical Abu Dhabi weather.</p>
            <div className="hm-cta-actions">
              <RouteLink to="/app" className="btn btn-primary btn-lg">Open Safety Command Center</RouteLink>
              <RouteLink to="/tour" className="btn btn-lg">Take the product tour</RouteLink>
            </div>
          </div>
        </section>
      </main>

      <footer className="hm-footer">
        <div className="hm-wrap hm-footer-grid">
          <div className="hm-footer-brand">
            <Brand />
            <p>Demonstration uses a synthetic worksite and historical Abu Dhabi weather (Open-Meteo Previous Runs, CC BY 4.0). Decision support, not diagnosis or work authorization.</p>
          </div>
          <nav aria-label="Resources">
            {FOOT_LINKS.map(([to, label]) => <RouteLink key={to} to={to}>{label}</RouteLink>)}
            <a href="/img/ATTRIBUTION.md">Photo credits</a>
          </nav>
        </div>
      </footer>
    </div>
  );
}

import type { MouseEvent, ReactNode } from "react";

import { Icon, type IconName } from "../components/Icon";
import { LevelBadge } from "../components/LevelBadge";
import { SiteIllustration } from "../components/home/SiteIllustration";
import { navigate } from "../router";
import "../styles/home.css";

// Public product homepage (doc 12 §2, §5.1, §8). Wording follows AGENTS.md and doc 12 §8;
// forecast-derived values are "estimated WBGT".

interface LinkProps { to: string; className?: string; children: ReactNode }

function RouteLink({ to, className, children }: LinkProps) {
  const go = (e: MouseEvent<HTMLAnchorElement>) => {
    if (e.metaKey || e.ctrlKey || e.shiftKey || e.button !== 0) return;
    e.preventDefault();
    navigate(to);
    window.scrollTo(0, 0);
  };
  return <a href={to} className={className} onClick={go}>{children}</a>;
}

interface Item { icon: IconName; title: string; body: ReactNode }

const FACTS: { fact: string; source: string }[] = [
  { fact: "Outdoor work under direct sun pauses from 12:30 to 15:00 every day between 15 June and 15 September.",
    source: "UAE Ministry of Human Resources and Emiratisation (MoHRE), federal midday work break. 2026 dates confirmed via secondary sources." },
  { fact: "Recommended exposure limits depend on how hard the work is and what workers wear — not on air temperature alone.",
    source: "NIOSH Criteria for a Recommended Standard: Occupational Exposure to Heat and Hot Environments, Pub. 2016-106." },
  { fact: "Abu Dhabi manages heat at work with Thermal Work Limit (TWL) zones, assessed from onsite readings.",
    source: "ADOSH-SF Code of Practice CoP 11.0, Safety in the Heat, v4.0." },
];

const STEPS: Item[] = [
  { icon: "forecast", title: "Day-ahead forecast and onsite readings",
    body: "Hourly estimated WBGT (forecast) for tomorrow, refined by onsite WBGT or TWL meter readings. A reading can only make a level stricter." },
  { icon: "crew", title: "Crew task, clothing, acclimatization",
    body: "Workload, protective clothing and acclimatization status set each crew's limit, following NIOSH." },
  { icon: "cabin", title: "Protection actually available",
    body: "Shade, cooled rest and water count only when physically confirmed on site, with capacity and walking distance." },
  { icon: "shield", title: "One clear action per crew",
    body: "One of four levels with one instruction. A separately implemented rule checker rejects any plan that breaks a policy rule before a supervisor can accept it." },
];

const WORKER_POINTS: Item[] = [
  { icon: "check", title: "One instruction, in their language", body: "English, Arabic, Hindi, Urdu and Bengali — with the English line underneath." },
  { icon: "shade", title: "Pictograms first", body: "Shape, level word and pictogram before any text, readable in direct sun." },
  { icon: "offline", title: "Works offline", body: "The last plan stays on the device and tightens on its own when the connection is lost." },
  { icon: "phone", title: "Emergency guidance", body: "Stop. Cool down. Do not stay alone. Tell your supervisor. Emergency 998." },
];

const SUPERVISOR_POINTS: Item[] = [
  { icon: "alert", title: "Who needs intervention now", body: "Crews ordered by need, with the reason in plain language." },
  { icon: "map", title: "What protection is available", body: "Every shade, cooled rest and water point, its capacity and when it was last confirmed." },
  { icon: "refresh", title: "Re-plan when something fails", body: "Affected crews are identified and a new plan is generated in one step." },
  { icon: "shield", title: "Policy check before acceptance", body: "A plan can be accepted only after it passes the rule checker and is current." },
];

const FAILURES: (Item & { fails: string })[] = [
  { icon: "forecast", fails: "Forecast stale or lost", title: "Falls back to a conservative seasonal bound",
    body: "Levels are computed from a high seasonal estimate instead of the missing forecast, and the supervisor sees why." },
  { icon: "cabin", fails: "Cooling resource fails", title: "Affected crews identified; plan must be regenerated",
    body: "The current plan is marked outdated. No worker is directed to an unavailable resource." },
  { icon: "offline", fails: "Network offline", title: "Devices tighten, then STOP-HOLD",
    body: "Worker devices move to conservative levels as the saved plan ages, and finally to STOP-HOLD until the connection returns." },
];

const RIGHTS: Item[] = [
  { icon: "lock", title: "No names, no tracking, no biometrics", body: "No personal, health or location data is collected." },
  { icon: "crew", title: "The crew is the smallest unit", body: "Every level, action and alert is for a crew, never an individual." },
  { icon: "x", title: "Not for discipline, pay or hiring", body: "AmanShift must not be used to rank, reward or penalise workers or crews." },
  { icon: "medic", title: "Symptom escalation closes only by the medic role", body: "A supervisor can raise a crew escalation; only the medic role can close it." },
];

function ItemList({ items, className }: { items: Item[]; className: string }) {
  return (
    <ul className={className} role="list">
      {items.map((it) => (
        <li key={it.title}>
          <span className="hm-ico" aria-hidden="true"><Icon name={it.icon} size={22} /></span>
          <span><b>{it.title}</b><span className="hm-body">{it.body}</span></span>
        </li>
      ))}
    </ul>
  );
}

function Brand() {
  return (
    <RouteLink to="/" className="hm-brand">
      <svg width="28" height="28" viewBox="0 0 64 64" aria-hidden="true"><path d="M32 4 8 12v18c0 15 10 26 24 30 14-4 24-15 24-30V12Z" fill="none" stroke="currentColor" strokeWidth="4" /><rect x="18" y="40" width="7" height="8" fill="currentColor" /><rect x="27" y="36" width="7" height="12" fill="currentColor" /><rect x="36" y="32" width="7" height="16" fill="currentColor" /></svg>
      <span><b>AmanShift</b> <span className="hm-brand-ar" lang="ar">أمان</span></span>
    </RouteLink>
  );
}

function WorkerSnippet() {
  return (
    <div className="hm-snippet">
      <div className="hm-snippet-head">
        <span className="xs">Crew: Concrete Pour · Central Podium</span>
        <span className="hm-tag">Illustration</span>
      </div>
      <LevelBadge level={3} english size="lg" />
      <div className="hm-snippet-picto" aria-hidden="true"><Icon name="clock" size={30} stroke={2.5} /><Icon name="cabin" size={30} stroke={2.5} /></div>
      <p className="hm-snippet-action">Work 45 min, rest 15 min in Central cooled rest cabin.</p>
      <p className="hm-snippet-ar" lang="ar" dir="rtl">اعمل 45 دقيقة، واسترح 15 دقيقة في غرفة الاستراحة المبرّدة المركزية.</p>
      <p className="xs muted">Arabic pending native review</p>
    </div>
  );
}

export function Home() {
  return (
    <div className="hm">
      <a className="skip" href="#hm-main">Skip to content</a>
      <header className="hm-header">
        <div className="hm-wrap hm-header-row">
          <Brand />
          <nav className="hm-nav" aria-label="Page sections">
            <a href="#how">How it works</a>
            <a href="#workers">For workers</a>
            <a href="#failures">When systems fail</a>
            <a href="#privacy">Privacy</a>
            <RouteLink to="/help/validation">Technical validation</RouteLink>
          </nav>
          <RouteLink to="/app" className="btn btn-primary hm-header-cta">
            <span className="hm-long">Open Command Center</span><span className="hm-short">Command Center</span>
          </RouteLink>
        </div>
      </header>

      <main id="hm-main">
        <section className="hm-hero" aria-labelledby="hm-h1">
          <div className="hm-wrap hm-hero-grid">
            <div className="hm-hero-copy">
              <p className="hm-eyebrow">Crew-level heat protection · Abu Dhabi</p>
              <h1 id="hm-h1">Every worker deserves to return home safely.</h1>
              <p className="hm-lead">Predict dangerous heat exposure, coordinate protective resources and keep workers informed — even when critical systems fail.</p>
              <div className="hm-ctas">
                <RouteLink to="/app" className="btn btn-primary btn-lg">Open Safety Command Center</RouteLink>
                <RouteLink to="/worker" className="btn btn-lg hm-btn-ghost">Explore Worker Experience</RouteLink>
              </div>
              <RouteLink to="/demo" className="hm-textlink">Run the live failure demonstration <Icon name="arrow" size={16} /></RouteLink>
            </div>
            <figure className="hm-hero-art">
              <SiteIllustration />
              <WorkerSnippet />
            </figure>
          </div>
        </section>

        <section className="hm-section" aria-labelledby="hm-problem">
          <div className="hm-wrap">
            <p className="eyebrow">The problem</p>
            <h2 id="hm-problem">Heat exposure is more than the temperature.</h2>
            <p className="hm-intro">The same afternoon can be manageable for a light task in shade and dangerous for heavy work in coveralls in direct sun. The rules already reflect this.</p>
            <ol className="hm-facts" role="list">
              {FACTS.map((f) => (
                <li key={f.source}><p className="hm-fact">{f.fact}</p><p className="hm-source"><span>Source</span>{f.source}</p></li>
              ))}
            </ol>
          </div>
        </section>

        <section id="how" className="hm-section hm-alt" aria-labelledby="hm-how">
          <div className="hm-wrap">
            <p className="eyebrow">How it works</p>
            <h2 id="hm-how">From tomorrow's forecast to one action per crew.</h2>
            <ol className="hm-steps" role="list">
              {STEPS.map((s, i) => (
                <li key={s.title}>
                  <span className="hm-step-n mono" aria-hidden="true">{i + 1}</span>
                  <span className="hm-ico" aria-hidden="true"><Icon name={s.icon} size={24} /></span>
                  <h3>{s.title}</h3>
                  <p>{s.body}</p>
                </li>
              ))}
            </ol>
            <div className="hm-levels">
              <span className="small muted">Four graded levels, each with one action:</span>
              {[1, 2, 3, 4].map((l) => <LevelBadge key={l} level={l} english />)}
            </div>
          </div>
        </section>

        <section id="workers" className="hm-section" aria-labelledby="hm-roles">
          <div className="hm-wrap">
            <h2 id="hm-roles" className="sr-only">For workers and supervisors</h2>
            <div className="hm-roles">
              <article className="hm-role">
                <p className="eyebrow">For workers</p>
                <h3>One clear instruction, wherever they are.</h3>
                <p className="hm-langs" aria-label="Languages">
                  <span lang="en">English</span><span lang="ar">العربية</span><span lang="hi">हिन्दी</span><span lang="ur">اردو</span><span lang="bn">বাংলা</span>
                </p>
                <ItemList items={WORKER_POINTS} className="hm-points" />
                <p className="xs muted">Translations pending native-speaker review.</p>
                <RouteLink to="/worker" className="btn hm-role-cta">Explore Worker Experience <Icon name="arrow" size={16} /></RouteLink>
              </article>
              <article className="hm-role">
                <p className="eyebrow">For supervisors</p>
                <h3>Know who to protect first and with what.</h3>
                <ItemList items={SUPERVISOR_POINTS} className="hm-points" />
                <RouteLink to="/app" className="btn hm-role-cta">Open Command Center <Icon name="arrow" size={16} /></RouteLink>
              </article>
            </div>
          </div>
        </section>

        <section id="failures" className="hm-section hm-alt" aria-labelledby="hm-fail">
          <div className="hm-wrap">
            <p className="eyebrow">When systems fail</p>
            <h2 id="hm-fail">Protection never weakens when information disappears.</h2>
            <p className="hm-intro">Recommendations can only become stricter when forecasts go stale, cooling fails or the network drops. This property is covered by automated tests.</p>
            <ul className="hm-fails" role="list">
              {FAILURES.map((f) => (
                <li key={f.fails}>
                  <p className="hm-fails-what"><Icon name={f.icon} size={20} /> {f.fails}</p>
                  <h3>{f.title}</h3>
                  <p>{f.body}</p>
                </li>
              ))}
            </ul>
            <RouteLink to="/demo" className="hm-textlink hm-textlink-dark">Run the live failure demonstration <Icon name="arrow" size={16} /></RouteLink>
          </div>
        </section>

        <section id="privacy" className="hm-section" aria-labelledby="hm-privacy">
          <div className="hm-wrap hm-privacy">
            <div>
              <p className="eyebrow">Privacy and worker rights</p>
              <h2 id="hm-privacy">Built to protect crews, not to watch people.</h2>
            </div>
            <ItemList items={RIGHTS} className="hm-points hm-rights" />
          </div>
        </section>

        <section className="hm-cta" aria-labelledby="hm-cta">
          <div className="hm-wrap hm-cta-row">
            <h2 id="hm-cta">See tomorrow's protection plan for a demonstration site.</h2>
            <div className="hm-ctas">
              <RouteLink to="/app" className="btn btn-primary btn-lg">Open Command Center</RouteLink>
              <RouteLink to="/worker" className="btn btn-lg hm-btn-ghost">Explore Worker Experience</RouteLink>
            </div>
          </div>
        </section>
      </main>

      <footer className="hm-footer">
        <div className="hm-wrap hm-footer-row">
          <Brand />
          <p className="small">Demonstration uses a synthetic worksite and historical Abu Dhabi weather (Open-Meteo Previous Runs, CC BY 4.0). Decision support, not diagnosis or work authorization.</p>
          <nav aria-label="Footer">
            <RouteLink to="/help/method">Method &amp; limitations</RouteLink>
            <RouteLink to="/help/validation">Technical validation</RouteLink>
          </nav>
        </div>
      </footer>
    </div>
  );
}

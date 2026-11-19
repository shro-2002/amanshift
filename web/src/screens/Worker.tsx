import { useEffect, useState } from "react";

import { api, type Card, type SiteDisplay } from "../api/client";
import { Icon, type IconName } from "../components/Icon";
import { LevelBadge } from "../components/LevelBadge";
import { OfflineBanner } from "../components/OfflineBanner";
import { LANGS, translate, useI18n, type Key, type Lang } from "../i18n/i18n";
import { useOffline } from "../offline/useOffline";
import "../styles/worker.css";

import type { Displayed } from "../offline/degrader";

const CREW_KEY = "amanshift.crew";
const STOP = 4;
const PICTO_PX = 64;
const PLACE_PX = 28;

// Pictogram first (doc 04 §S9): the shared stroke icon set, described for screen readers.
const PICTO: Record<Card["key"], { icons: IconName[]; label: string }> = {
  standard: { icons: ["water"], label: "Water drop: drink water" },
  increased: { icons: ["water", "water", "shade"], label: "Two water drops and shade" },
  work_rest: { icons: ["clock", "shade"], label: "Clock and shade: timed work and rest" },
  stop: { icons: ["stop", "shade", "phone"], label: "Stop sign, shade and phone" },
  escalation: { icons: ["stop", "medic", "phone"], label: "Stop sign, medic and phone" },
};

function load(key: string): string | null {
  try { return localStorage.getItem(key); } catch { return null; }
}
function save(key: string, value: string): void {
  try { localStorage.setItem(key, value); } catch { /* storage unavailable: choice lasts this session only */ }
}

/** Displayed level = max(server level, offline override); raised to 4 the card becomes STOP (tighten only).
 *  Once offline confirmations have expired, no resource is named: it can no longer be called confirmed. */
export function effectiveCard(c: Card, override?: Displayed, confirmationsExpired = false): { card: Card; degraded: boolean } {
  const lvl = Math.max(c.level, override?.display ?? 0);
  let card: Card = lvl > c.level ? { ...c, level: lvl, key: lvl === STOP ? "stop" : c.key } : c;
  if (confirmationsExpired) card = { ...card, rest: null, water: null };
  return { card, degraded: c.degraded || lvl > c.level || confirmationsExpired };
}

/** "998 (UAE ambulance)" -> "tel:998": only the dialable part goes into the link. */
export function telHref(phone: string): string | null {
  const digits = phone.split("(")[0].replace(/[^\d+]/g, "");
  return digits ? `tel:${digits}` : null;
}

/** Fixed vetted strings only; a resource appears only by the name the backend gave for it. */
export function lines(lang: Lang, c: Card, phone: string, names: Record<string, string> = {}): string[] {
  const res = c.rest ? names[c.rest] ?? c.rest : "—";
  const k = c.key;
  if (k === "work_rest") return [translate(lang, "card_work_rest", { work: c.work_min ?? 0, rest: c.rest_min ?? 0, res })];
  if (k === "stop") return [c.rest ? translate(lang, "card_stop", { res }) : translate(lang, "card_stop_any"), translate(lang, "card_stop_2")];
  if (k === "escalation") return [translate(lang, "card_escalation", { phone: phone || "—" })];
  return [translate(lang, `card_${k}` as Key)];
}

interface CardProps { card: Card; degraded: boolean; title: string; names: Record<string, string>; phone: string }

function ActionCard({ card, degraded, title, names, phone }: CardProps) {
  const { lang, t } = useI18n();
  const pic = PICTO[card.key];
  const rest = card.rest ? names[card.rest] ?? card.rest : null;
  const water = card.water ? names[card.water] ?? card.water : null;
  return (
    <article className={`wk-card lvl-${card.level}${degraded ? " is-degraded" : ""}`} aria-labelledby="wk-card-title">
      <h2 id="wk-card-title" className="sr-only">{title}</h2>
      <div className="wk-band">
        <LevelBadge level={card.level} degraded={degraded} size="lg" />
      </div>
      <div className="wk-body">
        <div className="wk-picto" role="img" aria-label={pic.label}>
          {pic.icons.map((n, i) => <Icon key={i} name={n} size={PICTO_PX} stroke={2.5} />)}
        </div>
        {lines(lang, card, phone, names).map((l, i) => <p key={i} className="wk-line1">{l}</p>)}
        {lang !== "en" && lines("en", card, phone, names).map((l, i) => <p key={`en${i}`} className="wk-line2" lang="en" dir="ltr">{l}</p>)}
        {(rest || water) && (
          <ul className="wk-places">
            {rest && (
              <li><Icon name="shade" size={PLACE_PX} stroke={2.5} /><span><span className="sr-only">Rest area: </span>{rest}</span></li>
            )}
            {water && <li><Icon name="water" size={PLACE_PX} stroke={2.5} /><span>{translate(lang, "water_at", { res: water })}</span></li>}
          </ul>
        )}
        <footer className="wk-meta">
          {degraded && <strong className="wk-conservative">{t("conservative")}</strong>}
          <span lang="en">{card.provenance}</span>
          <span>{t("pending")}</span>
        </footer>
      </div>
    </article>
  );
}

function Status({ offline, updated }: { offline: boolean; updated?: string }) {
  const { t } = useI18n();
  return (
    <p className={`wk-status${offline ? " is-offline" : ""}`}>
      <Icon name={offline ? "offline" : "online"} size={16} stroke={2.25} />
      {updated && <span>{t("updated", { t: updated })}</span>}
      <span lang="en">{offline ? "Offline · cached" : "Online"}</span>
    </p>
  );
}

function Unwell({ phone }: { phone: string }) {
  const { lang, t } = useI18n();
  const href = telHref(phone);
  return (
    <section className="wk-unwell" aria-labelledby="wk-unwell-title">
      <h2 id="wk-unwell-title"><Icon name="medic" size={28} stroke={2.5} />{t("unwell_title")}</h2>
      <p className="wk-unwell-body">{t("unwell_body")}</p>
      {lang !== "en" && <p className="wk-line2" lang="en" dir="ltr">{translate("en", "unwell_body")}</p>}
      {href && (
        <a className="wk-call" href={href}>
          <Icon name="phone" size={28} stroke={2.5} />
          <span>{t("emergency")}</span>
          <bdi className="wk-num">{phone}</bdi>
        </a>
      )}
    </section>
  );
}

function Languages() {
  const { lang, setLang, t } = useI18n();
  return (
    <div className="wk-langs" role="group" aria-label={t("language")}>
      {(Object.keys(LANGS) as Lang[]).map((l) => (
        <button key={l} type="button" lang={l} dir={LANGS[l].dir} aria-pressed={l === lang} onClick={() => setLang(l)}>
          {LANGS[l].lang_name}
        </button>
      ))}
    </div>
  );
}

interface Live { cards: Card[]; display: SiteDisplay }

/** Worker protection app (doc 12 §5.8): one crew, one protective action, always the unwell guidance. */
export function Worker() {
  const off = useOffline(false);
  const { t } = useI18n();
  const [live, setLive] = useState<Live | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [crew, setCrew] = useState<string | null>(() => load(CREW_KEY));
  const [livePhone, setPhone] = useState("");
  const { refreshPack } = off;

  useEffect(() => {
    if (off.offline) return;
    let active = true;
    api.cards().then((r) => {
      if (!active) return;
      setLive({ cards: r.cards, display: r.display ?? {} });
      setErr(null);
      setPhone(r.emergency_number);
      void refreshPack();
    }).catch((e: Error) => { if (active) setErr(e.message); });
    return () => { active = false; };
  }, [off.offline, refreshPack]);

  const fromPack = off.offline || (!live && err !== null);
  const pack = off.view.pack;
  const phone = livePhone || (pack?.emergency_number ?? "");
  const cards = (fromPack ? pack?.cards : live?.cards) ?? [];
  const display = (fromPack ? pack?.display : live?.display) ?? {};
  const names = display.resources ?? {};
  const crewName = (id: string) => display.crews?.[id] ?? `${t("crew")} ${id}`;
  const chosen = cards.find((c) => c.crew_id === crew) ?? cards[0];
  const pick = (id: string) => { setCrew(id); save(CREW_KEY, id); };
  const expired = off.view.offline && pack !== null && off.view.elapsedMin >= pack.confirmations_expire_after_min;
  const shown = chosen ? effectiveCard(chosen, off.view.levels[chosen.crew_id], expired) : null;
  const others = cards.filter((c) => c !== chosen);

  return (
    <div className="wk">
      <header className="wk-top">
        <div className="wk-wrap">
          <div className="wk-bar">
            <h1 className="wk-brand">AmanShift</h1>
            <Status offline={fromPack} updated={shown?.card.updated_local} />
          </div>
          <Languages />
        </div>
      </header>
      <main className="wk-wrap wk-main">
        <div className="wk-first">
          <OfflineBanner view={off.view} />
          {err && !off.offline && <p className="wk-err" role="alert">{err}</p>}
          {chosen && (
            <label className="wk-crew">
              <span>{t("your_crew")}</span>
              <select value={chosen.crew_id} onChange={(e) => pick(e.target.value)}>
                {cards.map((c) => <option key={c.crew_id} value={c.crew_id}>{crewName(c.crew_id)}</option>)}
              </select>
            </label>
          )}
          {shown && chosen
            ? <ActionCard card={shown.card} degraded={shown.degraded} title={crewName(chosen.crew_id)} names={names} phone={phone} />
            : <p className="wk-empty" role="status">{fromPack || err ? t("no_cards") : t("loading")}</p>}
        </div>
        <Unwell phone={phone} />
        {others.length > 0 && (
          <details className="wk-others">
            <summary>{t("other_crews")}</summary>
            <ul>
              {others.map((c) => {
                const o = effectiveCard(c, off.view.levels[c.crew_id], expired);
                return (
                  <li key={c.crew_id}>
                    <button type="button" onClick={() => pick(c.crew_id)}>
                      <span>{crewName(c.crew_id)}</span>
                      <LevelBadge level={o.card.level} degraded={o.degraded} />
                    </button>
                  </li>
                );
              })}
            </ul>
          </details>
        )}
      </main>
      <footer className="wk-wrap wk-foot"><p>{t("notice")}</p></footer>
    </div>
  );
}

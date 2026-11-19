import { useEffect, useState } from "react";
import { api, type Card } from "../api/client";
import { LevelBadge } from "../components/LevelBadge";
import { OfflineBanner } from "../components/OfflineBanner";
import { LANGS, translate, useI18n, type Key, type Lang } from "../i18n/i18n";
import type { useOffline } from "../offline/useOffline";

const PICTO: Record<Card["key"], string[]> = {
  standard: ["🥤"], increased: ["🥤", "🥤", "⛱"], work_rest: ["⏱", "⛱"], stop: ["✋", "⛱", "📞"], escalation: ["✋", "❄︎", "📞"],
};
const PICTO_LABEL: Record<Card["key"], string> = {
  standard: "water cup", increased: "two water cups and shade", work_rest: "split clock and shade",
  stop: "hand, shade and phone", escalation: "hand, cooling and phone",
};

function lines(lang: Lang, c: Card, phone: string): string[] {
  const res = c.rest ?? "—";
  const k = c.key;
  if (k === "work_rest") return [translate(lang, "card_work_rest", { work: c.work_min ?? 0, rest: c.rest_min ?? 0, res })];
  if (k === "stop") return [c.rest ? translate(lang, "card_stop", { res }) : translate(lang, "card_stop_any"), translate(lang, "card_stop_2")];
  if (k === "escalation") return [translate(lang, "card_escalation", { phone })];
  return [translate(lang, `card_${k}` as Key)];
}

type Offline = ReturnType<typeof useOffline>;

// S9 worker cards: pictogram + shape + number first; selected language line, English always second.
export function Cards({ off }: { off: Offline }) {
  const { lang, setLang, t } = useI18n();
  const [cards, setCards] = useState<Card[]>([]);
  const [phone, setPhone] = useState("999");
  const [err, setErr] = useState<string | null>(null);
  useEffect(() => {
    if (off.offline) { setCards(off.view.pack?.cards ?? []); return; }
    api.cards().then((r) => { setCards(r.cards); setPhone(r.emergency_number); })
      .catch((e: Error) => { setErr(e.message); setCards(off.view.pack?.cards ?? []); });
  }, [off.offline, off.view.pack]);
  const override = off.view.levels;
  return (
    <main>
      <div className="statusline noprint">
        <h1 style={{ fontSize: "var(--t-20)" }}>{t("crew")} cards</h1>
        <label>Language <select value={lang} onChange={(e) => setLang(e.target.value as Lang)} aria-label="Card language">
          {(Object.keys(LANGS) as Lang[]).map((l) => <option key={l} value={l}>{LANGS[l].lang_name}</option>)}</select></label>
        <button onClick={() => window.print()}>Print</button>
      </div>
      <div className="banners noprint"><OfflineBanner view={off.view} />{err && !off.offline && <div className="banner" role="alert">{err}</div>}</div>
      <div className="cards">
        {cards.map((c) => {
          const lvl = Math.max(c.level, override[c.crew_id]?.display ?? 0);
          const card: Card = lvl > c.level ? { ...c, level: lvl, key: lvl === 4 ? "stop" : c.key } : c;
          const degraded = c.degraded || lvl > c.level;
          return (
            <article key={c.crew_id} className={`wcard lvl-${lvl}`} aria-label={`${t("crew")} ${c.crew_id}`}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                <b style={{ fontSize: "var(--t-20)" }}>{t("crew")} {c.crew_id}</b>
                <LevelBadge level={lvl} degraded={degraded} size="lg" />
              </div>
              <div className="picto" role="img" aria-label={PICTO_LABEL[card.key]} style={{ fontSize: 32 }}>{PICTO[card.key].join(" ")}</div>
              {lines(lang, card, phone).map((l, i) => <div key={i} className="line1">{l}</div>)}
              {lang !== "en" && lines("en", card, phone).map((l, i) => <div key={i} className="line2" lang="en" dir="ltr">{l}</div>)}
              <div className="small muted">{translate(lang, "updated", { t: c.updated_local })} · ◻ {c.provenance}{degraded ? " · CONSERVATIVE" : ""}</div>
              <div className="small muted">{t("pending")}</div>
            </article>);
        })}
      </div>
    </main>
  );
}

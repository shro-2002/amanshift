import { useEffect, useState, type ReactNode } from "react";
import { api } from "../api/client";
import { Icon, type IconName } from "../components/Icon";
import { LANGS, useI18n, type Lang } from "../i18n/i18n";
import { linkTo } from "../router";
import { deriveAlerts } from "../site/derive";
import { useSite } from "../site/SiteContext";

const OPS: [string, string, IconName][] = [
  ["/app", "Overview", "overview"], ["/app/worksite", "Worksite", "map"], ["/app/protection", "Protection", "shield"], ["/app/activity", "Activity", "activity"],
];
const MORE: [string, string, IconName][] = [["/worker", "Worker companion", "phone"], ["/tour", "Product tour", "play"], ["/help", "Help & documentation", "help"]];
const THEME_KEY = "amanshift.theme";

export function BrandMark({ size = 28 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 64 64" aria-hidden="true">
      <defs><linearGradient id="bm" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stopColor="#6366F1" /><stop offset="1" stopColor="#0D9488" /></linearGradient></defs>
      <path d="M32 4 8 12v18c0 15 10 26 24 30 14-4 24-15 24-30V12Z" fill="url(#bm)" />
      <rect x="19" y="38" width="6" height="10" rx="1" fill="#fff" /><rect x="29" y="31" width="6" height="17" rx="1" fill="#fff" />
      <rect x="39" y="24" width="6" height="24" rx="1" fill="#fff" />
    </svg>
  );
}

function isCurrent(path: string, to: string): boolean {
  return to === "/app" ? path === "/app" || path === "/app/" : path.startsWith(to);
}

function initialTheme(): "light" | "dark" | null {
  try { const v = localStorage.getItem(THEME_KEY); return v === "light" || v === "dark" ? v : null; } catch { return null; }
}

export function AppShell({ path, children }: { path: string; children: ReactNode }) {
  const { s, isOffline, err, run } = useSite();
  const { lang, setLang, t } = useI18n();
  const [open, setOpen] = useState(false);
  const [theme, setTheme] = useState(initialTheme);
  useEffect(() => {
    if (!theme) return;
    document.documentElement.dataset.theme = theme;
    try { localStorage.setItem(THEME_KEY, theme); } catch { /* storage unavailable */ }
  }, [theme]);
  useEffect(() => { setOpen(false); }, [path]);
  const critical = s ? deriveAlerts(s, isOffline).filter((a) => a.severity === "critical").length : 0;
  const tier = s?.forecast.tier;
  const item = ([to, label, icon]: [string, string, IconName]) => (
    <a key={to} href={to} className="nav-i" onClick={linkTo(to)} aria-current={isCurrent(path, to) ? "page" : undefined}>
      <Icon name={icon} size={18} />{label}
      {to === "/app/protection" && critical > 0 && <span className="count" aria-label={`${critical} critical`}>{critical}</span>}
    </a>
  );
  return (
    <div className="shell">
      <a href="#main" className="skip">Skip to content</a>
      <aside className={`side ${open ? "open" : ""}`} aria-label="Application">
        <a href="/" className="brand" onClick={linkTo("/")}><BrandMark /><span><b>AmanShift</b><span className="ar" lang="ar">أمان</span></span></a>
        <nav aria-label="Operations"><span className="nav-h">Operations</span>{OPS.map(item)}</nav>
        <div className="sep" />
        <nav aria-label="More">{MORE.map(item)}</nav>
        <p className="side-foot">{t("notice")}</p>
      </aside>
      {open && <div className="scrim" style={{ zIndex: 45 }} onClick={() => setOpen(false)} />}
      <div className="main">
        <header className="topbar">
          <button className="menu-btn btn-ghost" aria-label="Open navigation" aria-expanded={open} onClick={() => setOpen(!open)}><Icon name="menu" /></button>
          {s && (
            <div className="ctx">
              <b>{s.site.label.replace(/\s*\(SYNTHETIC\)/i, "")}</b>
              <span className="pill hist">Synthetic site</span>
              <span className="dot" />
              <span className="num">{new Date(`${s.scenario_date}T00:00:00Z`).toLocaleDateString("en-GB", { weekday: "short", day: "numeric", month: "short", timeZone: "UTC" })} · {s.eval_time_local} GST</span>
              <span className={`pill ${tier === "fresh" ? "ok" : "warn"}`}><span className="led" />Forecast {tier === "fresh" ? "current" : tier === "stale" ? "out of date" : "unavailable"}</span>
              <span className={`pill ${isOffline ? "warn" : "ok"}`}><span className="led" />{isOffline ? "Offline" : "Online"}</span>
            </div>)}
          <span className="spacer" />
          <select value={lang} onChange={(e) => setLang(e.target.value as Lang)} aria-label="Language">
            {(Object.keys(LANGS) as Lang[]).map((l) => <option key={l} value={l}>{LANGS[l].lang_name}</option>)}
          </select>
          <button className="btn-ghost" aria-label="Toggle dark theme" aria-pressed={theme === "dark"} onClick={() => setTheme(theme === "dark" ? "light" : "dark")}><Icon name="sun" /></button>
        </header>
        <main id="main" tabIndex={-1}>
          {err && <div className="page" style={{ paddingBlockEnd: 0 }}><div className="err" role="alert">{err}<button onClick={() => run("Reload", () => api.state())}>Retry</button></div></div>}
          {children}
        </main>
        <footer className="app-foot">
          <span>{t("notice")}</span>
          <span>Representative scenario: historical Abu Dhabi day-ahead weather on a synthetic worksite — not live site telemetry.</span>
          <span>No names, biometrics or locations of individuals are collected.</span>
          <a href="/help/method" onClick={linkTo("/help/method")}>Method &amp; limitations</a>
          <a href="/help/validation" onClick={linkTo("/help/validation")}>Technical validation</a>
        </footer>
      </div>
    </div>
  );
}

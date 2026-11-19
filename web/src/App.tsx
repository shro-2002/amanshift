import { useEffect, useState } from "react";
import { LANGS, useI18n, type Lang } from "./i18n/i18n";
import { useOffline } from "./offline/useOffline";
import { navigate, usePath } from "./router";
import { Cards } from "./screens/Cards";
import { Command } from "./screens/Command";
import { Evidence } from "./screens/Evidence";
import { Intro } from "./screens/Intro";
import { Method } from "./screens/Method";

const NAV: [string, string][] = [["/command", "Command"], ["/cards", "Crew cards"], ["/evidence", "Evidence"], ["/method", "Method & limits"]];

export function App() {
  const { path, search } = usePath();
  const { lang, setLang, t } = useI18n();
  const [simulated, setSimulated] = useState(false);
  const off = useOffline(simulated);
  const [theme, setTheme] = useState<"light" | "dark" | null>(null);
  useEffect(() => { if (theme) document.documentElement.dataset.theme = theme; }, [theme]);
  const link = (to: string) => (e: React.MouseEvent) => { e.preventDefault(); navigate(to); };
  let screen = <Intro />;
  if (path.startsWith("/command")) screen = <Command judge={search.get("judge") === "1"} off={off} simulated={simulated} setSimulated={setSimulated} />;
  else if (path.startsWith("/cards") || path.startsWith("/offline")) screen = <Cards off={off} />;
  else if (path.startsWith("/evidence")) screen = <Evidence />;
  else if (path.startsWith("/method")) screen = <Method />;
  return (
    <>
      <header className="top">
        <a href="/" className="brand" onClick={link("/")}>
          <svg width="28" height="28" viewBox="0 0 64 64" aria-hidden="true"><path d="M32 4 8 12v18c0 15 10 26 24 30 14-4 24-15 24-30V12Z" fill="none" stroke="var(--brand)" strokeWidth="4" /><rect x="18" y="40" width="7" height="8" fill="var(--brand)" /><rect x="27" y="36" width="7" height="12" fill="var(--brand)" /><rect x="36" y="32" width="7" height="16" fill="var(--brand)" /></svg>
          <span><b>AmanShift</b><span className="ar" lang="ar">أمان</span></span>
        </a>
        <nav className="nav" aria-label="Main">
          {NAV.map(([to, label]) => <a key={to} href={to} onClick={link(to)} aria-current={path.startsWith(to) ? "page" : undefined}>{label}</a>)}
        </nav>
        <span className="spacer" />
        <span className="small muted">Synthetic site · real Abu Dhabi weather</span>
        <select value={lang} onChange={(e) => setLang(e.target.value as Lang)} aria-label="Language">
          {(Object.keys(LANGS) as Lang[]).map((l) => <option key={l} value={l}>{LANGS[l].lang_name}</option>)}
        </select>
        <button aria-label="Toggle dark theme" onClick={() => setTheme(theme === "dark" ? "light" : "dark")}>☾</button>
      </header>
      {screen}
      <footer className="foot">
        <span>{t("notice")}</span>
        <span>Languages other than English: {t("pending")}.</span>
        <a href="/method" onClick={link("/method")}>Methodology &amp; limitations</a>
        <span>Policy abudhabi-heat-v1 · no names, biometrics or locations collected</span>
      </footer>
    </>
  );
}

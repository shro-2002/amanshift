import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import en from "./en.json";
import ar from "./ar.json";
import hi from "./hi.json";
import ur from "./ur.json";
import bn from "./bn.json";

export const LANGS = { en, ar, hi, ur, bn } as const;
export type Lang = keyof typeof LANGS;
export type Key = keyof typeof en;
const STORE = "amanshift.lang";

export function translate(lang: Lang, key: Key, params: Record<string, string | number> = {}): string {
  const raw = (LANGS[lang] as Record<string, string>)[key] ?? en[key];
  return raw.replace(/\{(\w+)\}/g, (_, p: string) => String(params[p] ?? ""));
}

interface Ctx { lang: Lang; setLang: (l: Lang) => void; t: (k: Key, p?: Record<string, string | number>) => string }
const I18n = createContext<Ctx>({ lang: "en", setLang: () => undefined, t: (k) => en[k] });

function initial(): Lang {
  try {
    const v = localStorage.getItem(STORE);
    if (v && v in LANGS) return v as Lang;
  } catch { /* storage unavailable: default */ }
  return "en";
}

export function I18nProvider({ children }: { children: ReactNode }) {
  const [lang, setLangState] = useState<Lang>(initial);
  useEffect(() => {
    document.documentElement.lang = lang;
    document.documentElement.dir = LANGS[lang].dir;
  }, [lang]);
  const setLang = (l: Lang) => {
    setLangState(l);
    try { localStorage.setItem(STORE, l); } catch { /* ignore */ }
  };
  return <I18n.Provider value={{ lang, setLang, t: (k, p) => translate(lang, k, p) }}>{children}</I18n.Provider>;
}

export const useI18n = () => useContext(I18n);

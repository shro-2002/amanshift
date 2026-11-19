import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from "react";
import { api, type SiteState } from "../api/client";
import { useOffline } from "../offline/useOffline";
import { crewName } from "./derive";

type Offline = ReturnType<typeof useOffline>;
interface Ctx {
  s: SiteState | null; busy: boolean; err: string | null;
  run: (label: string, fn: () => Promise<unknown>) => void;
  off: Offline; simulated: boolean; setSimulated: (v: boolean) => void;
  override: Record<string, number>; isOffline: boolean;
}

const SiteCtx = createContext<Ctx | null>(null);

/** One shared site session for every /app and /demo view; the server stays the source of truth. */
export function SiteProvider({ children }: { children: ReactNode }) {
  const [s, setS] = useState<SiteState | null>(null);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [simulated, setSimulated] = useState(false);
  const [announce, setAnnounce] = useState({ polite: "", assertive: "" });
  const off = useOffline(simulated);
  const prev = useRef<Record<string, number>>({});
  const refreshPack = useRef(off.refreshPack);
  refreshPack.current = off.refreshPack;

  const apply = useCallback((next: SiteState) => {
    const changed = next.crews.filter((c) => prev.current[c.crew_id] !== undefined && prev.current[c.crew_id] !== c.display_level);
    if (changed.length) {
      const msg = changed.map((c) => `${crewName(next.site.display, c.crew_id)} now level ${c.display_level} ${c.level_name}`).join(". ");
      setAnnounce(changed.some((c) => c.display_level === 4) ? { polite: "", assertive: msg } : { polite: msg, assertive: "" });
    }
    prev.current = Object.fromEntries(next.crews.map((c) => [c.crew_id, c.display_level]));
    setS(next);
    setErr(null);
    void refreshPack.current();
  }, []);

  const run = useCallback((label: string, fn: () => Promise<unknown>) => {
    setBusy(true);
    fn().then((r) => { if (r && typeof r === "object" && "crews" in (r as object)) apply(r as SiteState); })
      .catch((e: Error) => setErr(`${label}: ${e.message}`)).finally(() => setBusy(false));
  }, [apply]);

  useEffect(() => { run("Load", () => api.state()); }, [run]);

  const override = Object.fromEntries(Object.entries(off.view.levels).map(([k, v]) => [k, v.display]));
  const value: Ctx = { s, busy, err, run, off, simulated, setSimulated, override, isOffline: simulated || off.offline };
  return (
    <SiteCtx.Provider value={value}>
      <div aria-live="polite" className="sr-only">{announce.polite}</div>
      <div aria-live="assertive" className="sr-only">{announce.assertive}</div>
      {children}
    </SiteCtx.Provider>
  );
}

export function useSite(): Ctx {
  const c = useContext(SiteCtx);
  if (!c) throw new Error("useSite outside SiteProvider");
  return c;
}

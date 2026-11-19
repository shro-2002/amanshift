import { useCallback, useEffect, useRef, useState } from "react";
import { api } from "../api/client";
import { advanceClock, displayLevels, modeFor, type Displayed, type Mode } from "./degrader";
import { loadClock, loadPack, saveClock, savePack, type StoredPack } from "./store";

const TICK_MS = 5000;
export interface OfflineView { offline: boolean; mode: Mode | null; elapsedMin: number; levels: Record<string, Displayed>; pack: StoredPack | null }

/** Tracks real (navigator.onLine) or simulated offline; computes tighten-only displayed levels. */
export function useOffline(simulated: boolean) {
  const [online, setOnline] = useState(() => navigator.onLine);
  const [view, setView] = useState<OfflineView>({ offline: false, mode: null, elapsedMin: 0, levels: {}, pack: null });
  const bump = useRef(0);
  const offline = simulated || !online;

  useEffect(() => {
    const on = () => setOnline(true), off = () => setOnline(false);
    window.addEventListener("online", on); window.addEventListener("offline", off);
    return () => { window.removeEventListener("online", on); window.removeEventListener("offline", off); };
  }, []);

  const tick = useCallback(async () => {
    const pack = await loadPack();
    if (!pack) { setView({ offline, mode: offline ? "expired" : null, elapsedMin: 0, levels: {}, pack: null }); return; }
    const clock = await loadClock();
    const add = bump.current; bump.current = 0;
    const r = advanceClock(pack, Date.now(), { ...clock, maxElapsedMin: clock.maxElapsedMin + add });
    await saveClock(r.clock);
    setView({ offline, mode: offline ? modeFor(pack, r.elapsed, r.backwards) : null, elapsedMin: r.elapsed,
      levels: offline ? displayLevels(pack, r.elapsed, r.backwards) : {}, pack });
  }, [offline]);

  useEffect(() => {
    void tick();
    if (!offline) return;
    const id = window.setInterval(() => void tick(), TICK_MS);
    return () => window.clearInterval(id);
  }, [offline, tick]);

  const refreshPack = useCallback(async () => {
    try { await savePack(await api.pack()); await tick(); } catch { /* keep previous pack */ }
  }, [tick]);

  /** Demo only: move the offline clock forward. It can only increase elapsed time (tighten only). */
  const fastForward = useCallback((minutes: number) => { bump.current += minutes; void tick(); }, [tick]);

  return { view, refreshPack, fastForward, offline };
}

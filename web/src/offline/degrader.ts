// offline-degrader.ts — the ONLY decision logic in the browser (doc 03 §12, amendment A5).
// It never computes a level: it only takes maxima of server-precomputed levels. Tighten-only.

export interface PackStep { offset_min: number; planned: Record<string, number>; worst_case: Record<string, number> }
export interface OfflinePack {
  pack_issued_at: string; stale_after_min: number; expires_after_min: number;
  confirmations_expire_after_min: number; tick_min: number; steps: PackStep[];
  display?: import("../api/client").SiteDisplay; emergency_number?: string;
}
export interface ClockState { maxElapsedMin: number; lastWallMs: number }
export type Mode = "cached" | "conservative" | "expired";
export interface Displayed { cached: number; display: number; mode: Mode }

const STOP = 4;

/** elapsed = max(wall - issued, persisted max elapsed); a wall clock that moved backwards => expired. */
export function advanceClock(pack: OfflinePack, nowMs: number, clock: ClockState) {
  const backwards = clock.lastWallMs > 0 && nowMs < clock.lastWallMs;
  const wallElapsed = (nowMs - Date.parse(pack.pack_issued_at)) / 60000;
  const elapsed = Math.max(wallElapsed, clock.maxElapsedMin, 0);
  const next: ClockState = { maxElapsedMin: elapsed, lastWallMs: Math.max(nowMs, clock.lastWallMs) };
  return { elapsed, backwards, clock: next };
}

export function modeFor(pack: OfflinePack, elapsed: number, backwards: boolean): Mode {
  const lastStepEnd = pack.steps.length * pack.tick_min;
  if (backwards || elapsed >= pack.expires_after_min || elapsed >= lastStepEnd) return "expired";
  if (elapsed >= pack.stale_after_min || elapsed >= pack.confirmations_expire_after_min) return "conservative";
  return "cached";
}

/** Displayed level per crew. Local confirmations are deliberately not an input. */
export function displayLevels(pack: OfflinePack, elapsed: number, backwards: boolean): Record<string, Displayed> {
  const mode = modeFor(pack, elapsed, backwards);
  const idx = Math.min(Math.max(Math.floor(elapsed / pack.tick_min), 0), pack.steps.length - 1);
  const step = pack.steps[idx];
  const out: Record<string, Displayed> = {};
  for (const [crew, planned] of Object.entries(step.planned)) {
    const cached = Math.max(planned, pack.steps[0].planned[crew] ?? planned, 1);
    let display = cached;
    if (mode === "conservative") display = Math.max(cached, step.worst_case[crew] ?? STOP);
    if (mode === "expired") display = STOP;
    out[crew] = { cached, display, mode };
  }
  return out;
}

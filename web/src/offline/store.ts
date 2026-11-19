import { get, set } from "idb-keyval";
import type { Card } from "../api/client";
import type { ClockState, OfflinePack } from "./degrader";

export type StoredPack = OfflinePack & { cards: Card[] };
const PACK = "amanshift.pack", CLOCK = "amanshift.clock";

export async function savePack(p: StoredPack): Promise<void> {
  try { await set(PACK, p); await set(CLOCK, { maxElapsedMin: 0, lastWallMs: 0 }); } catch { /* storage unavailable */ }
}
export async function loadPack(): Promise<StoredPack | undefined> {
  try { return await get<StoredPack>(PACK); } catch { return undefined; }
}
export async function loadClock(): Promise<ClockState> {
  try { return (await get<ClockState>(CLOCK)) ?? { maxElapsedMin: 0, lastWallMs: 0 }; } catch { return { maxElapsedMin: 0, lastWallMs: 0 }; }
}
export async function saveClock(c: ClockState): Promise<void> {
  try { await set(CLOCK, c); } catch { /* ignore: elapsed still computed from wall clock */ }
}

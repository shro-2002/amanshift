// T-OFF-01..03 (fast-check): the offline degrader only ever tightens.
import fc from "fast-check";
import { describe, expect, it } from "vitest";
import { advanceClock, displayLevels, type OfflinePack } from "../../src/offline/degrader";
import en from "../../src/i18n/en.json";
import ar from "../../src/i18n/ar.json";
import hi from "../../src/i18n/hi.json";
import ur from "../../src/i18n/ur.json";
import bn from "../../src/i18n/bn.json";

const level = fc.integer({ min: 1, max: 4 });
const crews = ["C1", "C2", "C3"];
const pack = fc.record({
  steps: fc.array(fc.tuple(fc.tuple(level, level, level), fc.tuple(level, level, level)), { minLength: 1, maxLength: 48 }),
  conf: fc.integer({ min: 0, max: 120 }),
}).map(({ steps, conf }): OfflinePack => ({
  pack_issued_at: "2026-07-01T06:30:00Z", stale_after_min: 60, expires_after_min: 180,
  confirmations_expire_after_min: conf, tick_min: 15,
  steps: steps.map(([p, w], i) => ({
    offset_min: i * 15,
    planned: Object.fromEntries(crews.map((c, j) => [c, p[j]])),
    worst_case: Object.fromEntries(crews.map((c, j) => [c, Math.max(p[j], w[j])])),
  })),
}));

describe("offline degrader", () => {
  it("T-OFF-01: displayed level >= cached level for any pack and elapsed time", () => {
    fc.assert(fc.property(pack, fc.double({ min: 0, max: 400, noNaN: true }), fc.boolean(), (p, e, back) => {
      for (const v of Object.values(displayLevels(p, e, back))) expect(v.display).toBeGreaterThanOrEqual(v.cached);
    }), { numRuns: 5000 });
  });

  it("T-OFF-01b: displayed level never below the level shown when the pack was cached", () => {
    fc.assert(fc.property(pack, fc.double({ min: 0, max: 400, noNaN: true }), (p, e) => {
      const shown = p.steps[0].planned;
      for (const [c, v] of Object.entries(displayLevels(p, e, false))) expect(v.display).toBeGreaterThanOrEqual(shown[c]);
    }), { numRuns: 2000 });
  });

  it("T-OFF-02: stale => max(planned, worst case); expired => 4", () => {
    fc.assert(fc.property(pack, (p) => {
      const stale = displayLevels(p, 61, false);
      const idx = Math.min(Math.floor(61 / 15), p.steps.length - 1);
      for (const c of crews) {
        if (stale[c].mode === "conservative") expect(stale[c].display).toBeGreaterThanOrEqual(p.steps[idx].worst_case[c]);
      }
      for (const v of Object.values(displayLevels(p, 180, false))) expect(v.display).toBe(4);
    }), { numRuns: 1000 });
  });

  it("T-OFF-03: elapsed cannot be reset by reload; backwards clock => expired", () => {
    fc.assert(fc.property(pack, fc.integer({ min: 0, max: 300 }), fc.integer({ min: 1, max: 300 }), (p, a, b) => {
      const issued = Date.parse(p.pack_issued_at);
      const first = advanceClock(p, issued + a * 60000, { maxElapsedMin: 0, lastWallMs: 0 });
      const later = advanceClock(p, issued + (a - b) * 60000, first.clock); // wall clock moved back b min
      expect(later.elapsed).toBeGreaterThanOrEqual(first.elapsed);
      expect(later.backwards).toBe(true);
      for (const v of Object.values(displayLevels(p, later.elapsed, later.backwards))) expect(v.display).toBe(4);
    }), { numRuns: 1000 });
  });
});

describe("i18n", () => {
  it("every language has every key (fixed vetted strings only)", () => {
    for (const lang of [ar, hi, ur, bn]) expect(Object.keys(lang).sort()).toEqual(Object.keys(en).sort());
  });
  it("worker card lines are at most 8 words in English", () => {
    for (const k of ["card_standard", "card_increased", "card_stop", "card_stop_any", "card_stop_2"] as const) {
      expect(en[k].split(/\s+/).length).toBeLessThanOrEqual(8);
    }
  });
});

// Golden test: worker hydration text in every language matches the cited guidance value (NIOSH 2016-106).
import { describe, expect, it } from "vitest";
import guidance from "../../../policy/worker-guidance-v1.json";
import { LANGS } from "../../src/i18n/i18n";

describe("worker guidance", () => {
  const [lo, hi] = guidance.hydration_cup_interval_min.value;
  for (const [lang, strings] of Object.entries(LANGS)) {
    it(`${lang}: hydration lines state a cup every ${lo}–${hi} minutes, never "every hour"`, () => {
      for (const key of ["card_standard", "card_increased", "card_stop_2"] as const) {
        expect(strings[key]).toContain(`${lo}–${hi}`);
        expect(strings[key].toLowerCase()).not.toContain("hour");
      }
    });
  }
});

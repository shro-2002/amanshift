// Worker app helpers: tighten-only display level, resource names only as given, dialable emergency link.
import { describe, expect, it } from "vitest";

import { effectiveCard, lines, telHref } from "../../src/screens/Worker";

import type { Card } from "../../src/api/client";

const base: Card = {
  crew_id: "C1", level: 3, key: "work_rest", work_min: 45, rest_min: 15, rest: "R2", water: "W1",
  updated_local: "10:30", degraded: false, provenance: "estimated WBGT (forecast-derived)",
};

describe("effectiveCard", () => {
  it("raises to STOP when the offline override reaches level 4", () => {
    const r = effectiveCard(base, { cached: 3, display: 4, mode: "conservative" });
    expect(r.card.level).toBe(4);
    expect(r.card.key).toBe("stop");
    expect(r.degraded).toBe(true);
  });
  it("never lowers the server level", () => {
    const r = effectiveCard(base, { cached: 1, display: 1, mode: "cached" });
    expect(r.card).toBe(base);
    expect(r.degraded).toBe(false);
  });
});

describe("lines", () => {
  it("uses the backend display name for the rest resource", () => {
    expect(lines("en", base, "998", { R2: "Central cooled rest cabin" })[0]).toBe("Work 45 min, rest 15 min in Central cooled rest cabin.");
  });
  it("names no resource when the backend gave none", () => {
    expect(lines("en", { ...base, key: "stop", rest: null }, "998")).toEqual(["Stop work. Go to the nearest shade.", "Drink water. Tell supervisor if unwell."]);
  });
});

describe("telHref", () => {
  it("keeps only the dialable digits", () => expect(telHref("998 (UAE ambulance)")).toBe("tel:998"));
  it("returns null when there is no number", () => expect(telHref("")).toBeNull());
});

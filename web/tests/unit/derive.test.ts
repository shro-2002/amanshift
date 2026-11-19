import { describe, expect, it } from "vitest";
import type { SiteState } from "../../src/api/client";
import { deriveAlerts, hhmm, soleDependants, strandedBy, tzOffsetMin } from "../../src/site/derive";

const crew = (id: string, size: number, rest: string[], level = 3) => ({
  crew_id: id, size, rest_edges: rest, water_edges: ["W1"], display_level: level, escalated: false, action: null, action_valid: true,
});
const res = (id: string, type: string, state = "up") => ({ resource_id: id, type, zone_id: "Z1", capacity: 10, state, confirmed_age_min: 0, trusted: state === "up", load: 0 });

// R2 down: C2 lost its only rest (stranded); C1 lost R2 but still has R1.
const s = {
  eval_time: "2026-07-01T06:30:00Z", eval_time_local: "10:30", forecast: { tier: "fresh" }, plan: null, site: { display: {} },
  crews: [crew("C1", 10, ["R1"]), crew("C2", 8, [], 4)],
  coverage: { resources: [res("R1", "shade"), res("R2", "cooled_rest", "down"), res("W1", "water")],
    edges: [{ crew: "C1", resource: "R2", status: "lost" }, { crew: "C2", resource: "R2", status: "lost" }, { crew: "C1", resource: "R1", status: "available" }] },
} as unknown as SiteState;

describe("derive", () => {
  it("renders site-local times from the server's own offset", () => {
    expect(tzOffsetMin(s)).toBe(240);
    expect(hhmm("2026-07-01T11:00:00Z", 240)).toBe("15:00");
  });
  it("separates crews stranded by an outage from crews that lost an alternative", () => {
    const r2 = s.coverage.resources[1];
    expect(strandedBy(s, r2)).toEqual(["C2"]);
    expect(soleDependants(s, s.coverage.resources[0])).toEqual(["C1"]);
    const down = deriveAlerts(s, false).find((a) => a.id === "down-R2")!;
    expect(down.severity).toBe("critical");
    expect(down.persons).toBe(8);
    expect(down.detail).toContain("1 other crew lost an alternative");
    expect(deriveAlerts(s, false).some((a) => a.id === "uncovered")).toBe(false); // not reported twice
  });
});

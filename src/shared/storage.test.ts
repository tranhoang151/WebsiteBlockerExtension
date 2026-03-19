import { describe, it, expect } from "vitest";
import * as fc from "fast-check";
import { serialize, deserialize, type ExtensionState } from "./storage";

// Arbitraries for schedule types
const timeArb = fc.tuple(
  fc.integer({ min: 0, max: 23 }),
  fc.integer({ min: 0, max: 59 })
).map(([h, m]) => `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`);

const intervalArb = fc.tuple(timeArb, timeArb)
  .filter(([start, end]) => start < end)
  .map(([start, end]) => ({ start, end }));

const scheduleArb = fc.record({
  intervals: fc.array(intervalArb),
  selectedDays: fc.array(fc.integer({ min: 0, max: 6 }), { maxLength: 7 }),
});

const extensionStateArb = fc.record({
  enabled: fc.boolean(),
  blocklist: fc.array(
    fc.stringOf(fc.char(), { minLength: 1 }).filter((s) => s.trim().length > 0)
  ),
  mode: fc.constantFrom("manual" as const, "schedule" as const),
  schedule: scheduleArb,
});

describe("serialize / deserialize", () => {
  it("round-trips the default state", () => {
    const state: ExtensionState = {
      enabled: true,
      blocklist: [],
      mode: "manual",
      schedule: { intervals: [], selectedDays: [0, 1, 2, 3, 4, 5, 6] },
    };
    expect(deserialize(serialize(state))).toEqual(state);
  });

  it("returns default state for invalid JSON", () => {
    const result = deserialize("not-json");
    expect(result).toEqual({
      enabled: true,
      blocklist: [],
      mode: "manual",
      schedule: { intervals: [], selectedDays: [0, 1, 2, 3, 4, 5, 6] },
    });
  });
});

// Feature: blocking-schedule, Property 6: Schedule serialization round-trip
describe("Property 6: Schedule serialization round-trip", () => {
  it("deserialize(serialize(state)) equals original state for any valid ExtensionState", () => {
    // Validates: Requirements 6.1, 6.2
    fc.assert(
      fc.property(extensionStateArb, (state: ExtensionState) => {
        const result = deserialize(serialize(state));
        expect(result.enabled).toBe(state.enabled);
        expect(result.blocklist).toEqual(state.blocklist);
        expect(result.mode).toBe(state.mode);
        expect(result.schedule.intervals).toEqual(state.schedule.intervals);
        expect(result.schedule.selectedDays).toEqual(state.schedule.selectedDays);
      }),
      { numRuns: 100 }
    );
  });
});

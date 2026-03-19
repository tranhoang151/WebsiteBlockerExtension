import { describe, it, expect, vi } from "vitest";
import * as fc from "fast-check";
import { type ExtensionState } from "../shared/storage";

// Stub chrome global before importing background.ts, which registers
// chrome event listeners at module level.
(globalThis as unknown as Record<string, unknown>).chrome = {
  runtime: { onInstalled: { addListener: vi.fn() } },
  storage: {
    sync: { get: vi.fn(), set: vi.fn() },
    onChanged: { addListener: vi.fn() },
  },
  declarativeNetRequest: {
    getDynamicRules: vi.fn(),
    updateDynamicRules: vi.fn(),
  },
  alarms: {
    create: vi.fn(),
    clear: vi.fn(),
    onAlarm: { addListener: vi.fn() },
  },
};

const { buildRules, shouldBlock } = await import("./background");

// Arbitrary for a valid normalized domain (e.g. "foo.com", "bar.org")
const validDomainArb = fc
  .tuple(
    fc.stringMatching(/^[a-z0-9][a-z0-9-]{0,10}$/),
    fc.stringMatching(/^[a-z]{2,6}$/)
  )
  .map(([label, tld]) => `${label}.${tld}`);

// Arbitrary for a blocklist of unique valid domains
const blocklistArb = fc
  .array(validDomainArb, { minLength: 0, maxLength: 10 })
  .map((arr) => [...new Set(arr)]);

const scheduleArb = fc.record({
  intervals: fc.constant([]),
  selectedDays: fc.constant([0, 1, 2, 3, 4, 5, 6]),
});

const stateArb = (enabled: boolean): fc.Arbitrary<ExtensionState> =>
  fc.record<ExtensionState>({
    enabled: fc.constant(enabled),
    blocklist: blocklistArb,
    mode: fc.constant("manual" as const),
    schedule: scheduleArb,
  });

// Feature: website-blocker, Property 7: Mỗi domain trong blocklist có một blocking rule tương ứng
describe("Property 7: Each domain has exactly one blocking rule", () => {
  it("buildRules returns exactly one rule per domain when enabled=true (manual mode)", () => {
    // Validates: Requirements 4.1
    fc.assert(
      fc.property(stateArb(true), (state) => {
        const now = new Date();
        const rules = buildRules(state, now);

        // Exactly one rule per domain
        expect(rules).toHaveLength(state.blocklist.length);

        // Each domain in the blocklist has exactly one corresponding rule
        for (const domain of state.blocklist) {
          const matchingRules = rules.filter((r) =>
            r.condition.urlFilter?.includes(domain)
          );
          expect(matchingRules).toHaveLength(1);
        }

        // No rule references a domain outside the blocklist
        for (const rule of rules) {
          const urlFilter = rule.condition.urlFilter ?? "";
          const inBlocklist = state.blocklist.some((d) =>
            urlFilter.includes(d)
          );
          expect(inBlocklist).toBe(true);
        }
      }),
      { numRuns: 100 }
    );
  });

  it("buildRules returns empty array when enabled=false (manual mode)", () => {
    fc.assert(
      fc.property(stateArb(false), (state) => {
        const rules = buildRules(state, new Date());
        expect(rules).toHaveLength(0);
      }),
      { numRuns: 100 }
    );
  });
});

describe("shouldBlock", () => {
  it("returns state.enabled in manual mode", () => {
    fc.assert(
      fc.property(fc.boolean(), blocklistArb, (enabled, blocklist) => {
        const state: ExtensionState = {
          enabled,
          blocklist,
          mode: "manual",
          schedule: { intervals: [], selectedDays: [0, 1, 2, 3, 4, 5, 6] },
        };
        expect(shouldBlock(state, new Date())).toBe(enabled);
      }),
      { numRuns: 100 }
    );
  });
});

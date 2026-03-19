import { describe, it, expect } from "vitest";
import * as fc from "fast-check";
import { addDomain, removeDomain, toggleEnabled } from "./blocklist";
import { type ExtensionState } from "./storage";

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

// Arbitrary for a full ExtensionState
const stateArb = fc.record({
  enabled: fc.boolean(),
  blocklist: blocklistArb,
});

// Feature: website-blocker, Property 1: Thêm domain hợp lệ làm tăng blocklist
describe("Property 1: Adding a valid domain grows the blocklist", () => {
  it("adds a valid domain not already in the list, increasing length by 1", () => {
    // Validates: Requirements 1.1
    fc.assert(
      fc.property(stateArb, validDomainArb, (state, domain) => {
        // Only test domains not already in the blocklist
        fc.pre(!state.blocklist.includes(domain));
        const { state: newState, error } = addDomain(state, domain);
        expect(error).toBeUndefined();
        expect(newState.blocklist).toHaveLength(state.blocklist.length + 1);
        expect(newState.blocklist).toContain(domain);
      }),
      { numRuns: 100 }
    );
  });
});

// Feature: website-blocker, Property 3: Không thêm domain trùng lặp
describe("Property 3: Duplicate domain is rejected", () => {
  it("does not change the blocklist when adding an already-present domain", () => {
    // Validates: Requirements 1.3
    fc.assert(
      fc.property(
        fc
          .record({
            enabled: fc.boolean(),
            blocklist: fc
              .array(validDomainArb, { minLength: 1, maxLength: 10 })
              .map((arr) => [...new Set(arr)]),
          })
          .filter((s) => s.blocklist.length >= 1),
        fc.nat(),
        (state, idx) => {
          const domain = state.blocklist[idx % state.blocklist.length];
          const { state: newState, error } = addDomain(state, domain);
          expect(error).toBeDefined();
          expect(newState.blocklist).toEqual(state.blocklist);
        }
      ),
      { numRuns: 100 }
    );
  });
});

// Feature: website-blocker, Property 4: Xóa domain loại bỏ đúng phần tử
describe("Property 4: Removing a domain shrinks the blocklist", () => {
  it("removes the correct domain and decreases length by 1", () => {
    // Validates: Requirements 2.1
    fc.assert(
      fc.property(
        fc
          .record({
            enabled: fc.boolean(),
            blocklist: fc
              .array(validDomainArb, { minLength: 1, maxLength: 10 })
              .map((arr) => [...new Set(arr)]),
          })
          .filter((s) => s.blocklist.length >= 1),
        fc.nat(),
        (state, idx) => {
          const domain = state.blocklist[idx % state.blocklist.length];
          const newState = removeDomain(state, domain);
          expect(newState.blocklist).toHaveLength(state.blocklist.length - 1);
          expect(newState.blocklist).not.toContain(domain);
        }
      ),
      { numRuns: 100 }
    );
  });
});

// Feature: website-blocker, Property 5: Toggle bật/tắt là round-trip
describe("Property 5: Toggle enabled is a round-trip", () => {
  it("toggling twice returns to the original enabled state with blocklist unchanged", () => {
    // Validates: Requirements 3.1, 3.2, 3.4
    fc.assert(
      fc.property(stateArb, (state) => {
        const toggled = toggleEnabled(state);
        const restored = toggleEnabled(toggled);
        expect(restored.enabled).toBe(state.enabled);
        expect(restored.blocklist).toEqual(state.blocklist);
      }),
      { numRuns: 100 }
    );
  });
});

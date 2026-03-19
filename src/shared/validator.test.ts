import { describe, it, expect } from "vitest";
import * as fc from "fast-check";
import { isValidDomain, normalizeDomain } from "./validator";

describe("isValidDomain", () => {
  it("returns false for empty string", () => {
    expect(isValidDomain("")).toBe(false);
  });

  it("returns true for a valid domain", () => {
    expect(isValidDomain("facebook.com")).toBe(true);
  });

  it("returns true for domain with protocol", () => {
    expect(isValidDomain("https://facebook.com")).toBe(true);
  });
});

describe("normalizeDomain", () => {
  it("lowercases the domain", () => {
    expect(normalizeDomain("Facebook.COM")).toBe("facebook.com");
  });

  it("strips https protocol", () => {
    expect(normalizeDomain("https://Facebook.com/")).toBe("facebook.com");
  });

  it("strips trailing slash", () => {
    expect(normalizeDomain("youtube.com/")).toBe("youtube.com");
  });
});

// Feature: website-blocker, Property 2: Whitespace input bị từ chối
describe("Property 2: Whitespace tasks are invalid", () => {
  it("rejects any string composed entirely of whitespace", () => {
    // Validates: Requirements 1.2
    fc.assert(
      fc.property(
        fc.stringOf(fc.constantFrom(" ", "\t", "\n", "\r")),
        (whitespaceStr) => {
          expect(isValidDomain(whitespaceStr)).toBe(false);
        }
      ),
      { numRuns: 100 }
    );
  });
});

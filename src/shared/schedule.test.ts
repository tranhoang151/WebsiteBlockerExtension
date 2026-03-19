import { describe, it, expect } from "vitest";
import * as fc from "fast-check";
import {
  isValidInterval,
  addInterval,
  removeInterval,
  toggleDay,
  isWithinSchedule,
  type TimeInterval,
  type Schedule,
} from "./schedule";

// ── Arbitraries ──────────────────────────────────────────────────────────────

const timeArb = fc
  .tuple(fc.integer({ min: 0, max: 23 }), fc.integer({ min: 0, max: 59 }))
  .map(([h, m]) => `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`);

/** Valid interval: start strictly before end */
const validIntervalArb: fc.Arbitrary<TimeInterval> = fc
  .tuple(timeArb, timeArb)
  .filter(([start, end]) => start < end)
  .map(([start, end]) => ({ start, end }));

/** Invalid interval: start >= end */
const invalidIntervalArb: fc.Arbitrary<TimeInterval> = fc
  .tuple(timeArb, timeArb)
  .filter(([start, end]) => start >= end)
  .map(([start, end]) => ({ start, end }));

const scheduleArb: fc.Arbitrary<Schedule> = fc.record({
  intervals: fc.array(validIntervalArb),
  selectedDays: fc.uniqueArray(fc.integer({ min: 0, max: 6 })),
});

/** Schedule with at least one interval */
const nonEmptyScheduleArb: fc.Arbitrary<Schedule> = fc.record({
  intervals: fc.array(validIntervalArb, { minLength: 1 }),
  selectedDays: fc.uniqueArray(fc.integer({ min: 0, max: 6 })),
});

// ── Unit tests ────────────────────────────────────────────────────────────────

describe("isValidInterval", () => {
  it("accepts valid interval", () => {
    expect(isValidInterval({ start: "08:00", end: "17:00" })).toBe(true);
  });
  it("rejects start >= end", () => {
    expect(isValidInterval({ start: "17:00", end: "08:00" })).toBe(false);
    expect(isValidInterval({ start: "09:00", end: "09:00" })).toBe(false);
  });
  it("rejects bad format", () => {
    expect(isValidInterval({ start: "8:00", end: "17:00" })).toBe(false);
    expect(isValidInterval({ start: "25:00", end: "26:00" })).toBe(false);
  });
});

describe("isWithinSchedule", () => {
  it("returns false for empty schedule", () => {
    const schedule: Schedule = { intervals: [], selectedDays: [1] };
    expect(isWithinSchedule(schedule, new Date("2024-01-01T10:00:00"))).toBe(false);
  });
  it("returns false when day not selected", () => {
    // 2024-01-01 is Monday (day 1); select only Sunday (0)
    const schedule: Schedule = {
      intervals: [{ start: "08:00", end: "18:00" }],
      selectedDays: [0],
    };
    expect(isWithinSchedule(schedule, new Date("2024-01-01T10:00:00"))).toBe(false);
  });
  it("returns true when within interval on selected day", () => {
    // 2024-01-01 is Monday (day 1)
    const schedule: Schedule = {
      intervals: [{ start: "08:00", end: "18:00" }],
      selectedDays: [1],
    };
    expect(isWithinSchedule(schedule, new Date("2024-01-01T10:00:00"))).toBe(true);
  });
});

// ── Property-Based Tests ──────────────────────────────────────────────────────

// Feature: blocking-schedule, Property 1: Thêm interval hợp lệ làm tăng danh sách
describe("Property 1: Thêm interval hợp lệ làm tăng danh sách intervals", () => {
  it("adding a valid interval increases length by 1 and contains the interval", () => {
    // Validates: Requirements 1.2
    fc.assert(
      fc.property(scheduleArb, validIntervalArb, (schedule, interval) => {
        const { schedule: newSchedule, error } = addInterval(schedule, interval);
        expect(error).toBeUndefined();
        expect(newSchedule.intervals).toHaveLength(schedule.intervals.length + 1);
        expect(newSchedule.intervals).toContainEqual(interval);
      }),
      { numRuns: 100 }
    );
  });
});

// Feature: blocking-schedule, Property 2: Interval không hợp lệ bị từ chối
describe("Property 2: Interval không hợp lệ bị từ chối", () => {
  it("adding an invalid interval returns an error and leaves schedule unchanged", () => {
    // Validates: Requirements 1.3
    fc.assert(
      fc.property(scheduleArb, invalidIntervalArb, (schedule, interval) => {
        const { schedule: newSchedule, error } = addInterval(schedule, interval);
        expect(error).toBeDefined();
        expect(newSchedule.intervals).toEqual(schedule.intervals);
      }),
      { numRuns: 100 }
    );
  });
});

// Feature: blocking-schedule, Property 3: Xóa interval loại bỏ đúng phần tử
describe("Property 3: Xóa interval loại bỏ đúng phần tử", () => {
  it("removing an interval at a valid index decreases length by 1", () => {
    // Validates: Requirements 1.4
    fc.assert(
      fc.property(nonEmptyScheduleArb, fc.nat(), (schedule, idx) => {
        const index = idx % schedule.intervals.length;
        const newSchedule = removeInterval(schedule, index);
        expect(newSchedule.intervals).toHaveLength(schedule.intervals.length - 1);
      }),
      { numRuns: 100 }
    );
  });
});

// Feature: blocking-schedule, Property 4: Toggle ngày là round-trip
describe("Property 4: Toggle ngày là round-trip", () => {
  it("toggling a day twice returns selectedDays to its original state", () => {
    // Validates: Requirements 2.2
    fc.assert(
      fc.property(scheduleArb, fc.integer({ min: 0, max: 6 }), (schedule, day) => {
        const once = toggleDay(schedule, day);
        const twice = toggleDay(once, day);
        expect(twice.selectedDays.slice().sort()).toEqual(
          schedule.selectedDays.slice().sort()
        );
      }),
      { numRuns: 100 }
    );
  });
});

// Feature: blocking-schedule, Property 5: isWithinSchedule phản ánh đúng trạng thái thời gian
describe("Property 5: isWithinSchedule phản ánh đúng trạng thái thời gian", () => {
  it("returns true iff day is selected AND current time falls in at least one interval", () => {
    // Validates: Requirements 3.1, 3.2, 3.3
    fc.assert(
      fc.property(scheduleArb, fc.date(), (schedule, now) => {
        const result = isWithinSchedule(schedule, now);

        const dayOfWeek = now.getDay();
        const daySelected = schedule.selectedDays.includes(dayOfWeek);

        const hh = String(now.getHours()).padStart(2, "0");
        const mm = String(now.getMinutes()).padStart(2, "0");
        const currentTime = `${hh}:${mm}`;
        const inInterval = schedule.intervals.some(
          (iv) => currentTime >= iv.start && currentTime < iv.end
        );

        expect(result).toBe(daySelected && inInterval);
      }),
      { numRuns: 100 }
    );
  });
});

export interface TimeInterval {
  start: string; // "HH:MM" format, e.g. "08:00"
  end: string;   // "HH:MM" format, e.g. "17:00"
}

export interface Schedule {
  intervals: TimeInterval[];
  selectedDays: number[]; // 0=Sun, 1=Mon, ..., 6=Sat
}

export type ExtensionMode = "manual" | "schedule";

const HH_MM_REGEX = /^([01]\d|2[0-3]):[0-5]\d$/;

/** Validate that an interval has correct HH:MM format and start < end */
export function isValidInterval(interval: TimeInterval): boolean {
  return (
    HH_MM_REGEX.test(interval.start) &&
    HH_MM_REGEX.test(interval.end) &&
    interval.start < interval.end
  );
}

/** Add a valid interval to the schedule. Returns error string if invalid. */
export function addInterval(
  schedule: Schedule,
  interval: TimeInterval
): { schedule: Schedule; error?: string } {
  if (!isValidInterval(interval)) {
    return { schedule, error: "Start time must be before end time" };
  }
  return {
    schedule: {
      ...schedule,
      intervals: [...schedule.intervals, interval],
    },
  };
}

/** Remove the interval at the given index. Returns unchanged schedule for out-of-range index. */
export function removeInterval(schedule: Schedule, index: number): Schedule {
  if (index < 0 || index >= schedule.intervals.length) {
    return schedule;
  }
  return {
    ...schedule,
    intervals: schedule.intervals.filter((_, i) => i !== index),
  };
}

/** Toggle a day (0–6) in selectedDays — adds if absent, removes if present. */
export function toggleDay(schedule: Schedule, day: number): Schedule {
  const has = schedule.selectedDays.includes(day);
  return {
    ...schedule,
    selectedDays: has
      ? schedule.selectedDays.filter((d) => d !== day)
      : [...schedule.selectedDays, day],
  };
}

/** Returns true when `now` falls on a selected day AND within at least one interval. */
export function isWithinSchedule(schedule: Schedule, now: Date): boolean {
  const dayOfWeek = now.getDay(); // 0=Sun … 6=Sat
  if (!schedule.selectedDays.includes(dayOfWeek)) return false;

  const hh = String(now.getHours()).padStart(2, "0");
  const mm = String(now.getMinutes()).padStart(2, "0");
  const currentTime = `${hh}:${mm}`;

  return schedule.intervals.some(
    (iv) => currentTime >= iv.start && currentTime < iv.end
  );
}

import type { ExtensionState } from "./storage";

/** Returns a human-readable status string for the current extension state. */
export function getStatusText(state: ExtensionState, now: Date): string {
  if (state.mode === "schedule") {
    return isWithinSchedule(state.schedule, now)
      ? "Blocking (Scheduled)"
      : "Waiting (Scheduled)";
  }
  return state.enabled ? "Enabled" : "Disabled";
}

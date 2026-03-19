import { type ExtensionState, loadState, saveState } from "../shared/storage";
import { isWithinSchedule } from "../shared/schedule";
import type { Schedule } from "../shared/schedule";

const DEFAULT_STATE: ExtensionState = {
  enabled: true,
  blocklist: [],
  mode: "manual",
  schedule: {
    intervals: [],
    selectedDays: [0, 1, 2, 3, 4, 5, 6],
  },
};

const ALARM_NAME = "schedule-check";

/**
 * Determines whether blocking should be active given the current state and time.
 */
export function shouldBlock(state: ExtensionState, now: Date): boolean {
  if (state.mode === "manual") return state.enabled;
  return isWithinSchedule(state.schedule, now);
}

/**
 * Builds declarativeNetRequest redirect rules from the extension state.
 * Returns an empty array when blocking is inactive.
 */
export function buildRules(
  state: ExtensionState,
  now: Date = new Date()
): chrome.declarativeNetRequest.Rule[] {
  if (!shouldBlock(state, now)) return [];

  return state.blocklist.map((domain, index) => ({
    id: index + 1,
    priority: 1,
    action: {
      type: "redirect" as chrome.declarativeNetRequest.RuleActionType,
      redirect: {
        extensionPath: `/src/blocked/blocked.html?domain=${encodeURIComponent(domain)}`,
      },
    },
    condition: {
      urlFilter: `*${domain}*`,
      resourceTypes: [
        "main_frame" as chrome.declarativeNetRequest.ResourceType,
      ],
    },
  }));
}

/**
 * Removes all existing dynamic rules and adds new ones based on current state.
 */
export async function updateRules(state: ExtensionState): Promise<void> {
  const existingRules = await chrome.declarativeNetRequest.getDynamicRules();
  const removeIds = existingRules.map((r) => r.id);

  const addRules = buildRules(state, new Date());

  await chrome.declarativeNetRequest.updateDynamicRules({
    removeRuleIds: removeIds,
    addRules,
  });
}

/** Start a 1-minute repeating alarm to check the schedule. */
export function startScheduleAlarm(): void {
  chrome.alarms.create(ALARM_NAME, { periodInMinutes: 1 });
}

/** Stop the schedule-check alarm. */
export function stopScheduleAlarm(): void {
  chrome.alarms.clear(ALARM_NAME);
}

/**
 * Convert "HH:MM" to total minutes since midnight.
 */
function timeToMinutes(hhmm: string): number {
  const [h, m] = hhmm.split(":").map(Number);
  return h * 60 + m;
}

/**
 * Check schedule intervals and fire notifications when:
 * - 5 minutes before a blocking period starts
 * - Blocking period has just started
 * - 5 minutes before a blocking period ends
 * - Blocking period has just ended
 */
export function checkAndNotify(schedule: Schedule, now: Date): void {
  const dayOfWeek = now.getDay();
  if (!schedule.selectedDays.includes(dayOfWeek)) return;

  const currentMinutes = now.getHours() * 60 + now.getMinutes();

  for (const interval of schedule.intervals) {
    const startMinutes = timeToMinutes(interval.start);
    const endMinutes = timeToMinutes(interval.end);

    if (currentMinutes === startMinutes - 5) {
      chrome.notifications.create(`warn-start-${interval.start}`, {
        type: "basic",
        iconUrl: chrome.runtime.getURL("src/icons/icon48.png"),
        title: "Website Blocker",
        message: `Blocking starts in 5 minutes (${interval.start} – ${interval.end})`,
        priority: 1,
      });
    } else if (currentMinutes === startMinutes) {
      chrome.notifications.create(`start-${interval.start}`, {
        type: "basic",
        iconUrl: chrome.runtime.getURL("src/icons/icon48.png"),
        title: "Website Blocker",
        message: `Blocking is now active until ${interval.end}`,
        priority: 2,
      });
    } else if (currentMinutes === endMinutes - 5) {
      chrome.notifications.create(`warn-end-${interval.end}`, {
        type: "basic",
        iconUrl: chrome.runtime.getURL("src/icons/icon48.png"),
        title: "Website Blocker",
        message: `Blocking ends in 5 minutes (at ${interval.end})`,
        priority: 1,
      });
    } else if (currentMinutes === endMinutes) {
      chrome.notifications.create(`end-${interval.end}`, {
        type: "basic",
        iconUrl: chrome.runtime.getURL("src/icons/icon48.png"),
        title: "Website Blocker",
        message: `Blocking period has ended. Sites are now accessible.`,
        priority: 1,
      });
    }
  }
}

// Initialize default state on first install
chrome.runtime.onInstalled.addListener(async (details) => {
  if (details.reason === "install") {
    await saveState(DEFAULT_STATE);
  }
  const state = await loadState();
  if (state.mode === "schedule") {
    startScheduleAlarm();
  }
  await updateRules(state);
});

// Update rules whenever storage changes; manage alarm based on mode transitions
chrome.storage.onChanged.addListener(async (changes, area) => {
  if (area !== "sync" || !changes["extensionState"]) return;

  const state = await loadState();

  const oldRaw = changes["extensionState"].oldValue;
  const newRaw = changes["extensionState"].newValue;

  // Detect mode change to start/stop alarm
  if (typeof oldRaw === "string" && typeof newRaw === "string") {
    try {
      const oldMode = (JSON.parse(oldRaw) as Partial<ExtensionState>).mode;
      const newMode = (JSON.parse(newRaw) as Partial<ExtensionState>).mode;
      if (oldMode !== newMode) {
        if (newMode === "schedule") {
          startScheduleAlarm();
        } else {
          stopScheduleAlarm();
        }
      }
    } catch {
      // ignore parse errors
    }
  }

  await updateRules(state);
});

// Check schedule every minute when alarm fires
chrome.alarms.onAlarm.addListener(async (alarm) => {
  if (alarm.name !== ALARM_NAME) return;
  const state = await loadState();
  if (state.mode === "schedule") {
    checkAndNotify(state.schedule, new Date());
  }
  await updateRules(state);
});

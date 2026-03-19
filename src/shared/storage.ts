import type { ExtensionMode, Schedule } from "./schedule";

export interface ExtensionState {
  enabled: boolean;
  blocklist: string[];
  mode: ExtensionMode;
  schedule: Schedule;
}

const DEFAULT_STATE: ExtensionState = {
  enabled: true,
  blocklist: [],
  mode: "manual",
  schedule: {
    intervals: [],
    selectedDays: [0, 1, 2, 3, 4, 5, 6],
  },
};

const STORAGE_KEY = "extensionState";

export function serialize(state: ExtensionState): string {
  return JSON.stringify(state);
}

export function deserialize(json: string): ExtensionState {
  try {
    const parsed = JSON.parse(json);
    if (
      typeof parsed === "object" &&
      parsed !== null &&
      typeof parsed.enabled === "boolean" &&
      Array.isArray(parsed.blocklist) &&
      parsed.blocklist.every((d: unknown) => typeof d === "string")
    ) {
      // Resolve mode with fallback
      const mode: ExtensionMode =
        parsed.mode === "schedule" ? "schedule" : "manual";

      // Resolve schedule with fallback
      let schedule: Schedule = { ...DEFAULT_STATE.schedule };
      if (
        typeof parsed.schedule === "object" &&
        parsed.schedule !== null &&
        Array.isArray(parsed.schedule.intervals) &&
        Array.isArray(parsed.schedule.selectedDays)
      ) {
        schedule = {
          intervals: parsed.schedule.intervals,
          selectedDays: parsed.schedule.selectedDays,
        };
      }

      return {
        enabled: parsed.enabled,
        blocklist: parsed.blocklist,
        mode,
        schedule,
      };
    }
    return { ...DEFAULT_STATE, schedule: { ...DEFAULT_STATE.schedule } };
  } catch {
    return { ...DEFAULT_STATE, schedule: { ...DEFAULT_STATE.schedule } };
  }
}

export async function loadState(): Promise<ExtensionState> {
  return new Promise((resolve) => {
    chrome.storage.sync.get(STORAGE_KEY, (result) => {
      const raw = result[STORAGE_KEY];
      if (typeof raw === "string") {
        resolve(deserialize(raw));
      } else {
        resolve({ ...DEFAULT_STATE, schedule: { ...DEFAULT_STATE.schedule } });
      }
    });
  });
}

export async function saveState(state: ExtensionState): Promise<void> {
  return new Promise((resolve, reject) => {
    chrome.storage.sync.set({ [STORAGE_KEY]: serialize(state) }, () => {
      if (chrome.runtime.lastError) {
        reject(chrome.runtime.lastError);
      } else {
        resolve();
      }
    });
  });
}

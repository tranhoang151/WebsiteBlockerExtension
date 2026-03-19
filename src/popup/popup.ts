import { type ExtensionState, loadState, saveState } from "../shared/storage";
import { addDomain, removeDomain, toggleEnabled } from "../shared/blocklist";
import {
  type Schedule,
  addInterval,
  removeInterval,
  toggleDay,
  getStatusText,
} from "../shared/schedule";

let state: ExtensionState = {
  enabled: true,
  blocklist: [],
  mode: "manual",
  schedule: { intervals: [], selectedDays: [0, 1, 2, 3, 4, 5, 6] },
};

// ── Main view elements ──
const statusText = document.getElementById("status-text") as HTMLSpanElement;
const toggleWrapper = document.getElementById("toggle-wrapper") as HTMLLabelElement;
const toggleEl = document.getElementById("toggle-enabled") as HTMLInputElement;
const domainInput = document.getElementById("domain-input") as HTMLInputElement;
const addBtn = document.getElementById("add-btn") as HTMLButtonElement;
const errorMsg = document.getElementById("error-msg") as HTMLParagraphElement;
const mainScheduleWarning = document.getElementById("main-schedule-warning") as HTMLParagraphElement;
const domainList = document.getElementById("domain-list") as HTMLUListElement;
const scheduleBtn = document.getElementById("schedule-btn") as HTMLButtonElement;

// ── Modal elements ──
const scheduleModal = document.getElementById("schedule-modal") as HTMLDivElement;
const modeToggle = document.getElementById("mode-toggle") as HTMLInputElement;
const daySelector = document.getElementById("day-selector") as HTMLDivElement;
const intervalList = document.getElementById("interval-list") as HTMLUListElement;
const intervalStart = document.getElementById("interval-start") as HTMLInputElement;
const intervalEnd = document.getElementById("interval-end") as HTMLInputElement;
const addIntervalBtn = document.getElementById("add-interval-btn") as HTMLButtonElement;
const intervalError = document.getElementById("interval-error") as HTMLParagraphElement;
const scheduleWarning = document.getElementById("schedule-warning") as HTMLParagraphElement;
const modalCancel = document.getElementById("modal-cancel") as HTMLButtonElement;
const modalSave = document.getElementById("modal-save") as HTMLButtonElement;

// Draft schedule edited inside the panel (not saved until "Save" is clicked)
let draftSchedule: Schedule = { intervals: [], selectedDays: [0, 1, 2, 3, 4, 5, 6] };
// Whether the user wants schedule mode enabled in the draft
let draftScheduleEnabled = false;

// ── Main view rendering ──

function renderState(): void {
  const text = getStatusText(state, new Date());
  statusText.textContent = text;

  // Status colour
  statusText.className = "status-text";
  if (text === "Enabled") statusText.classList.add("enabled");
  else if (text === "Disabled") statusText.classList.add("disabled");
  else if (text === "Blocking (Scheduled)") statusText.classList.add("scheduled-active");
  else statusText.classList.add("scheduled-waiting");

  // Show toggle only in manual mode
  toggleWrapper.style.display = state.mode === "manual" ? "" : "none";
  toggleEl.checked = state.enabled;

  // Req 5.4: warn in main view when schedule mode is active but no intervals configured
  if (state.mode === "schedule" && state.schedule.intervals.length === 0) {
    mainScheduleWarning.textContent = "No schedule configured";
  } else {
    mainScheduleWarning.textContent = "";
  }

  renderDomainList();
}

function renderDomainList(): void {
  domainList.innerHTML = "";

  if (state.blocklist.length === 0) {
    const empty = document.createElement("li");
    empty.className = "empty-msg";
    empty.textContent = "No domains blocked yet.";
    domainList.appendChild(empty);
    return;
  }

  for (const domain of state.blocklist) {
    const li = document.createElement("li");

    const span = document.createElement("span");
    span.textContent = domain;

    const removeBtn = document.createElement("button");
    removeBtn.textContent = "×";
    removeBtn.setAttribute("aria-label", `Remove ${domain}`);
    removeBtn.addEventListener("click", () => handleRemove(domain));

    li.appendChild(span);
    li.appendChild(removeBtn);
    domainList.appendChild(li);
  }
}

// ── Modal rendering ──

function renderModal(): void {
  // Schedule on/off toggle reflects current draft mode
  modeToggle.checked = draftScheduleEnabled;

  // Day buttons
  const dayBtns = daySelector.querySelectorAll<HTMLButtonElement>(".day-btn");
  dayBtns.forEach((btn) => {
    const day = Number(btn.dataset.day);
    btn.classList.toggle("active", draftSchedule.selectedDays.includes(day));
  });

  // Interval list
  intervalList.innerHTML = "";
  if (draftSchedule.intervals.length === 0) {
    const li = document.createElement("li");
    li.className = "empty-msg";
    li.style.background = "none";
    li.textContent = "No schedule set";
    intervalList.appendChild(li);
  } else {
    draftSchedule.intervals.forEach((iv, idx) => {
      const li = document.createElement("li");

      const span = document.createElement("span");
      span.textContent = `${iv.start} – ${iv.end}`;

      const removeBtn = document.createElement("button");
      removeBtn.textContent = "×";
      removeBtn.setAttribute("aria-label", `Remove interval ${iv.start}–${iv.end}`);
      removeBtn.addEventListener("click", () => {
        draftSchedule = removeInterval(draftSchedule, idx);
        intervalError.textContent = "";
        renderModal();
      });

      li.appendChild(span);
      li.appendChild(removeBtn);
      intervalList.appendChild(li);
    });
  }

  // Warning
  renderScheduleWarning();
}

function renderScheduleWarning(): void {
  if (draftSchedule.intervals.length === 0) {
    scheduleWarning.textContent = "No schedule configured";
  } else if (draftSchedule.selectedDays.length === 0) {
    scheduleWarning.textContent = "No days selected";
  } else {
    scheduleWarning.textContent = "";
  }
}

// ── Main view event handlers ──

function showError(msg: string): void {
  errorMsg.textContent = msg;
}

function clearError(): void {
  errorMsg.textContent = "";
}

async function handleAdd(): Promise<void> {
  const input = domainInput.value;
  const result = addDomain(state, input);

  if (result.error) {
    showError(result.error);
    return;
  }

  clearError();
  state = result.state;
  domainInput.value = "";
  domainInput.focus();
  renderState();
  await saveState(state);
}

async function handleRemove(domain: string): Promise<void> {
  state = removeDomain(state, domain);
  renderState();
  await saveState(state);
}

async function handleToggle(): Promise<void> {
  state = toggleEnabled(state);
  renderState();
  await saveState(state);
}

// ── Modal event handlers ──

function openModal(): void {
  draftSchedule = {
    intervals: [...state.schedule.intervals],
    selectedDays: [...state.schedule.selectedDays],
  };
  // Reflect current mode in the toggle
  draftScheduleEnabled = state.mode === "schedule";
  intervalError.textContent = "";
  renderModal();
  scheduleModal.classList.add("open");
}

function closeModal(): void {
  scheduleModal.classList.remove("open");
}

function handleDayBtn(btn: HTMLButtonElement): void {
  const day = Number(btn.dataset.day);
  draftSchedule = toggleDay(draftSchedule, day);
  btn.classList.toggle("active", draftSchedule.selectedDays.includes(day));
  renderScheduleWarning();
}

function handleAddInterval(): void {
  const start = intervalStart.value;
  const end = intervalEnd.value;

  if (!start || !end) {
    intervalError.textContent = "Please select both start and end times";
    return;
  }

  const result = addInterval(draftSchedule, { start, end });
  if (result.error) {
    intervalError.textContent = result.error;
    return;
  }

  intervalError.textContent = "";
  draftSchedule = result.schedule;
  intervalStart.value = "";
  intervalEnd.value = "";
  renderModal();
}

async function handleSave(): Promise<void> {
  // Use the explicit toggle state; if toggled on but no intervals, warn but still save
  const newMode: "manual" | "schedule" =
    draftScheduleEnabled && draftSchedule.intervals.length > 0 ? "schedule" : "manual";
  state = { ...state, mode: newMode, schedule: draftSchedule };
  closeModal();
  renderState();
  await saveState(state);
}

// ── Wire up events ──

addBtn.addEventListener("click", handleAdd);
domainInput.addEventListener("keydown", (e) => {
  if (e.key === "Enter") handleAdd();
});
toggleEl.addEventListener("change", handleToggle);
scheduleBtn.addEventListener("click", openModal);
modalCancel.addEventListener("click", closeModal);
modalSave.addEventListener("click", handleSave);
modeToggle.addEventListener("change", () => {
  draftScheduleEnabled = modeToggle.checked;
});
addIntervalBtn.addEventListener("click", handleAddInterval);

daySelector.querySelectorAll<HTMLButtonElement>(".day-btn").forEach((btn) => {
  btn.addEventListener("click", () => handleDayBtn(btn));
});

// ── Bootstrap ──
loadState().then((loaded) => {
  state = loaded;
  renderState();
});

# Design Document: Blocking Schedule

## Overview

Blocking Schedule mở rộng Website Blocker Extension bằng cách thêm chế độ tự động (Schedule Mode). Người dùng cấu hình các time intervals và ngày trong tuần; Background Service Worker dùng `chrome.alarms` để kiểm tra mỗi phút và tự động bật/tắt `declarativeNetRequest` rules tương ứng.

Extension giữ nguyên Manual Mode hiện tại và thêm Schedule Mode song song. Toggle hiện tại được thay bằng một nút "Schedule" mở Schedule UI dạng modal/panel trong Popup.

## Architecture

```
┌─────────────────────────────────────────────────────────┐
│                      Chrome Browser                     │
│                                                         │
│  ┌─────────────────────────────────────────────────┐   │
│  │                    Popup UI                     │   │
│  │  ┌──────────────┐   ┌────────────────────────┐  │   │
│  │  │  Main View   │   │   Schedule Modal       │  │   │
│  │  │  - Status    │   │   - Time intervals     │  │   │
│  │  │  - Blocklist │   │   - Day selector       │  │   │
│  │  │  - Schedule  │   │   - Save button        │  │   │
│  │  │    button    │   └────────────────────────┘  │   │
│  │  └──────────────┘                               │   │
│  └──────────────────────┬──────────────────────────┘   │
│                         │ chrome.storage.sync           │
│  ┌──────────────────────▼──────────────────────────┐   │
│  │           Background Service Worker             │   │
│  │   chrome.alarms (1-min tick)                    │   │
│  │   isWithinSchedule() → updateRules()            │   │
│  └──────────────────────┬──────────────────────────┘   │
│                         │ declarativeNetRequest         │
│              ┌──────────▼──────────┐                   │
│              │     Block Page      │                   │
│              └─────────────────────┘                   │
└─────────────────────────────────────────────────────────┘
```

Luồng Schedule Mode:
1. Người dùng cấu hình schedule → lưu vào `chrome.storage.sync`
2. Background đăng ký `chrome.alarms` alarm tên `"schedule-check"` với `periodInMinutes: 1`
3. Mỗi phút, alarm fires → `isWithinSchedule(schedule, now)` → `updateRules(state)`
4. Khi chuyển về Manual Mode → `chrome.alarms.clear("schedule-check")`

## Components and Interfaces

### 1. Schedule Data Types (`src/shared/schedule.ts`)

```typescript
interface TimeInterval {
  start: string; // "HH:MM" format, e.g. "08:00"
  end: string;   // "HH:MM" format, e.g. "17:00"
}

interface Schedule {
  intervals: TimeInterval[];
  selectedDays: number[]; // 0=Sun, 1=Mon, ..., 6=Sat
}

type ExtensionMode = "manual" | "schedule";
```

### 2. Extended ExtensionState (`src/shared/storage.ts`)

```typescript
interface ExtensionState {
  enabled: boolean;
  blocklist: string[];
  mode: ExtensionMode;       // "manual" | "schedule"
  schedule: Schedule;
}
```

Default state:
```typescript
{
  enabled: true,
  blocklist: [],
  mode: "manual",
  schedule: {
    intervals: [],
    selectedDays: [0, 1, 2, 3, 4, 5, 6]
  }
}
```

### 3. Schedule Logic (`src/shared/schedule.ts`)

```typescript
// Validate một time interval
function isValidInterval(interval: TimeInterval): boolean
// start < end, cả hai đúng format HH:MM

// Thêm interval vào schedule
function addInterval(
  schedule: Schedule,
  interval: TimeInterval
): { schedule: Schedule; error?: string }

// Xóa interval theo index
function removeInterval(schedule: Schedule, index: number): Schedule

// Toggle một ngày trong selectedDays
function toggleDay(schedule: Schedule, day: number): Schedule

// Kiểm tra xem thời điểm hiện tại có nằm trong schedule không
function isWithinSchedule(schedule: Schedule, now: Date): boolean

// Lấy text trạng thái hiển thị
function getStatusText(state: ExtensionState, now: Date): string
// Returns: "Blocking (Scheduled)" | "Waiting (Scheduled)" | "Enabled" | "Disabled"
```

### 4. Background Service Worker (`src/background/background.ts`)

Thêm:
- Đăng ký `chrome.alarms.onAlarm` listener
- Hàm `startScheduleAlarm()`: tạo alarm `"schedule-check"` với `periodInMinutes: 1`
- Hàm `stopScheduleAlarm()`: clear alarm `"schedule-check"`
- Khi storage thay đổi: nếu mode chuyển sang "schedule" → `startScheduleAlarm()`, nếu chuyển về "manual" → `stopScheduleAlarm()`
- Khi alarm fires: `isWithinSchedule(state.schedule, new Date())` → `updateRules()`

Logic `updateRules` được mở rộng:
```typescript
function shouldBlock(state: ExtensionState, now: Date): boolean {
  if (state.mode === "manual") return state.enabled;
  return isWithinSchedule(state.schedule, now);
}
```

### 5. Schedule UI trong Popup (`src/popup/`)

Thêm vào `popup.html`:
- Nút "Schedule" thay thế toggle enabled/disabled
- Modal/panel `#schedule-modal` chứa:
  - Danh sách intervals với nút xóa từng interval
  - Form thêm interval: 2 `<input type="time">` + nút Add
  - 7 nút ngày trong tuần (toggle active/inactive)
  - Nút "Save Schedule" và "Cancel"
- Status text hiển thị trạng thái hiện tại

## Data Models

### TimeInterval

```typescript
interface TimeInterval {
  start: string; // "HH:MM"
  end: string;   // "HH:MM"
}
```

Constraint: `start < end` (so sánh lexicographic vì format HH:MM đảm bảo điều này).

### Schedule

```typescript
interface Schedule {
  intervals: TimeInterval[];    // mảng các time intervals, có thể rỗng
  selectedDays: number[];       // subset của [0,1,2,3,4,5,6]
}
```

### ExtensionState (mở rộng)

```typescript
interface ExtensionState {
  enabled: boolean;
  blocklist: string[];
  mode: "manual" | "schedule";
  schedule: Schedule;
}
```

Lưu trong `chrome.storage.sync` dưới key `"extensionState"` dưới dạng JSON string — giống cơ chế hiện tại.

## Correctness Properties

*A property is a characteristic or behavior that should hold true across all valid executions of a system-essentially, a formal statement about what the system should do. Properties serve as the bridge between human-readable specifications and machine-verifiable correctness guarantees.*

### Property 1: Thêm interval hợp lệ làm tăng danh sách intervals

*For any* schedule và time interval hợp lệ (start < end), sau khi thêm interval đó, `schedule.intervals` phải chứa interval đó và có độ dài tăng thêm 1.

**Validates: Requirements 1.2**

---

### Property 2: Interval không hợp lệ bị từ chối

*For any* time interval mà start >= end, hàm `addInterval` phải trả về error và schedule không thay đổi.

**Validates: Requirements 1.3**

---

### Property 3: Xóa interval loại bỏ đúng phần tử

*For any* schedule có ít nhất 1 interval và index hợp lệ, sau khi xóa interval tại index đó, `schedule.intervals` phải có độ dài giảm 1 và không còn chứa interval đó tại vị trí cũ.

**Validates: Requirements 1.4**

---

### Property 4: Toggle ngày là round-trip

*For any* schedule và ngày bất kỳ (0–6), toggle ngày đó 2 lần phải trả về `selectedDays` giống hệt ban đầu.

**Validates: Requirements 2.2**

---

### Property 5: isWithinSchedule phản ánh đúng trạng thái thời gian

*For any* schedule và timestamp, `isWithinSchedule` trả về `true` khi và chỉ khi ngày trong tuần của timestamp nằm trong `selectedDays` VÀ thời gian trong ngày nằm trong ít nhất một interval. Ngược lại trả về `false`.

**Validates: Requirements 3.1, 3.2, 3.3**

---

### Property 6: Schedule serialization round-trip

*For any* `ExtensionState` hợp lệ (bao gồm cả `mode` và `schedule`), `deserialize(serialize(state))` phải trả về object tương đương với `state` ban đầu.

**Validates: Requirements 6.1, 6.2**

---

## Error Handling

- **Interval không hợp lệ (start >= end)**: `addInterval` trả về `{ schedule, error: "Start time must be before end time" }`, Popup hiển thị lỗi inline.
- **Không có ngày nào được chọn**: `isWithinSchedule` trả về `false`, Popup hiển thị cảnh báo "No days selected".
- **Schedule rỗng (không có interval)**: `isWithinSchedule` trả về `false`, Popup hiển thị "No schedule configured".
- **JSON parse lỗi khi deserialize**: Trả về `ExtensionState` mặc định với `mode: "manual"`, `schedule: { intervals: [], selectedDays: [0,1,2,3,4,5,6] }`.
- **chrome.alarms lỗi**: Log lỗi ra console, không crash extension.

## Testing Strategy

### Công nghệ

- **Property-Based Testing**: `fast-check` (đã có trong project)
- **Test Runner**: `vitest` (đã có trong project)
- **Mocking**: `vitest` built-in `vi.fn()` cho chrome APIs

### Unit Tests

- `isValidInterval("08:00", "17:00")` → `true`
- `isValidInterval("17:00", "08:00")` → `false` (start >= end)
- `isWithinSchedule` với schedule rỗng → `false`
- `isWithinSchedule` với ngày không được chọn → `false`
- `getStatusText` với từng combination của mode/enabled/withinSchedule
- Deserialize JSON lỗi → default state

### Property-Based Tests

Mỗi property-based test phải:
- Chạy tối thiểu **100 iterations**
- Được annotate: `// Feature: blocking-schedule, Property {N}: {property_text}`
- Mỗi correctness property được implement bởi **một** property-based test duy nhất

Mapping property → test:

| Property | Mô tả |
|----------|-------|
| Property 1 | Thêm interval hợp lệ tăng danh sách |
| Property 2 | Interval không hợp lệ bị từ chối |
| Property 3 | Xóa interval giảm danh sách |
| Property 4 | Toggle ngày là round-trip |
| Property 5 | isWithinSchedule phản ánh đúng thời gian |
| Property 6 | Schedule serialization round-trip |

### Dual Testing Approach

Unit tests bắt các bug cụ thể và edge cases đã biết. Property tests xác minh tính đúng đắn tổng quát trên nhiều input ngẫu nhiên. Cả hai bổ sung cho nhau.

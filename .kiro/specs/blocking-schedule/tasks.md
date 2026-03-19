# Implementation Plan

- [x] 1. Mở rộng data model và storage
  - Thêm interfaces `TimeInterval`, `Schedule`, `ExtensionMode` vào `src/shared/schedule.ts`
  - Cập nhật `ExtensionState` trong `src/shared/storage.ts` thêm fields `mode` và `schedule`
  - Cập nhật `DEFAULT_STATE` với `mode: "manual"` và `schedule: { intervals: [], selectedDays: [0,1,2,3,4,5,6] }`
  - Cập nhật `deserialize` để xử lý fields mới, fallback về default nếu thiếu
  - _Requirements: 6.1, 6.2, 6.3_

- [x]* 1.1 Viết property test cho serialization round-trip mở rộng (Property 6)
  - `// Feature: blocking-schedule, Property 6: Schedule serialization round-trip`
  - Generate random `ExtensionState` bao gồm `mode` và `schedule`, kiểm tra `deserialize(serialize(state))` tương đương state gốc
  - **Property 6: Schedule serialization round-trip**
  - **Validates: Requirements 6.1, 6.2**

- [x] 2. Implement schedule logic (`src/shared/schedule.ts`)
  - Viết `isValidInterval(interval: TimeInterval): boolean` — kiểm tra start < end và đúng format HH:MM
  - Viết `addInterval(schedule, interval)` — validate rồi thêm vào danh sách
  - Viết `removeInterval(schedule, index)` — xóa theo index
  - Viết `toggleDay(schedule, day)` — toggle ngày trong selectedDays
  - Viết `isWithinSchedule(schedule, now: Date): boolean` — kiểm tra ngày và giờ hiện tại
  - Viết `getStatusText(state, now: Date): string` — trả về chuỗi trạng thái
  - _Requirements: 1.2, 1.3, 1.4, 2.2, 3.1, 3.2, 3.3, 4.1, 4.2, 4.3, 4.4_

- [x]* 2.1 Viết property test cho addInterval (Property 1)
  - `// Feature: blocking-schedule, Property 1: Thêm interval hợp lệ làm tăng danh sách`
  - Generate random schedule và valid interval (start < end), kiểm tra length tăng 1 và interval có trong list
  - **Property 1: Thêm interval hợp lệ làm tăng danh sách intervals**
  - **Validates: Requirements 1.2**

- [x]* 2.2 Viết property test cho invalid interval (Property 2)
  - `// Feature: blocking-schedule, Property 2: Interval không hợp lệ bị từ chối`
  - Generate các cặp (start, end) mà start >= end, kiểm tra `addInterval` trả về error và schedule không đổi
  - **Property 2: Interval không hợp lệ bị từ chối**
  - **Validates: Requirements 1.3**

- [x]* 2.3 Viết property test cho removeInterval (Property 3)
  - `// Feature: blocking-schedule, Property 3: Xóa interval loại bỏ đúng phần tử`
  - Generate random schedule có ít nhất 1 interval, xóa theo index, kiểm tra length giảm 1
  - **Property 3: Xóa interval loại bỏ đúng phần tử**
  - **Validates: Requirements 1.4**

- [x]* 2.4 Viết property test cho toggleDay (Property 4)
  - `// Feature: blocking-schedule, Property 4: Toggle ngày là round-trip`
  - Generate random schedule và ngày (0–6), toggle 2 lần, kiểm tra selectedDays giống hệt ban đầu
  - **Property 4: Toggle ngày là round-trip**
  - **Validates: Requirements 2.2**

- [x]* 2.5 Viết property test cho isWithinSchedule (Property 5)
  - `// Feature: blocking-schedule, Property 5: isWithinSchedule phản ánh đúng trạng thái thời gian`
  - Generate random schedule và timestamp, kiểm tra kết quả đúng với logic ngày + interval
  - **Property 5: isWithinSchedule phản ánh đúng trạng thái thời gian**
  - **Validates: Requirements 3.1, 3.2, 3.3**

- [x] 3. Cập nhật Background Service Worker (`src/background/background.ts`)
  - Thêm hàm `startScheduleAlarm()` — tạo `chrome.alarms` với `periodInMinutes: 1`
  - Thêm hàm `stopScheduleAlarm()` — clear alarm `"schedule-check"`
  - Thêm hàm `shouldBlock(state, now): boolean` — trả về true/false dựa trên mode
  - Cập nhật `updateRules` dùng `shouldBlock` thay vì chỉ check `state.enabled`
  - Đăng ký `chrome.alarms.onAlarm` listener để check schedule mỗi phút
  - Cập nhật `chrome.storage.onChanged` listener: start/stop alarm khi mode thay đổi
  - Cập nhật `chrome.runtime.onInstalled`: start alarm nếu mode là "schedule"
  - _Requirements: 3.1, 3.2, 3.3, 3.4, 5.1, 5.2, 5.3_

- [x] 4. Checkpoint — Đảm bảo tất cả tests đang pass
  - Ensure all tests pass, ask the user if questions arise.

- [x] 5. Cập nhật Popup UI (`src/popup/popup.html` + `src/popup/popup.ts`)
  - Thay toggle enabled/disabled bằng status text + nút "Schedule"
  - Thêm `#schedule-modal` với: danh sách intervals, form thêm interval (2 `<input type="time">`), 7 nút ngày, nút Save/Cancel
  - Cập nhật `popup.ts`: load/render schedule state, xử lý sự kiện add/remove interval, toggle day, save schedule, chuyển mode
  - Hiển thị `getStatusText()` trong header thay cho toggle
  - _Requirements: 1.1, 1.2, 1.3, 1.4, 1.5, 2.1, 2.2, 2.3, 4.1, 4.2, 4.3, 4.4, 5.1, 5.2, 5.4_

- [x] 6. Final Checkpoint — Đảm bảo tất cả tests đang pass
  - Ensure all tests pass, ask the user if questions arise.

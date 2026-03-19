# Requirements Document

## Introduction

Blocking Schedule là tính năng mở rộng cho Website Blocker Chrome Extension, cho phép người dùng tự động bật/tắt chặn website theo lịch thời gian định sẵn. Thay vì bật/tắt thủ công, người dùng có thể cấu hình các khung giờ và ngày trong tuần để extension tự động quản lý việc chặn.

## Glossary

- **Schedule**: Cấu hình thời gian tự động bật/tắt chặn, bao gồm các time intervals và ngày trong tuần
- **Time Interval**: Một khoảng thời gian có điểm bắt đầu (start) và kết thúc (end) trong ngày, biểu diễn dưới dạng "HH:MM"
- **Active Interval**: Time interval mà thời điểm hiện tại đang nằm trong đó
- **Schedule Mode**: Trạng thái extension đang hoạt động theo lịch tự động (khác với manual enabled/disabled)
- **Manual Mode**: Trạng thái extension được bật/tắt thủ công bởi người dùng, không theo lịch
- **Selected Days**: Các ngày trong tuần (0=Sun, 1=Mon, ..., 6=Sat) mà schedule được áp dụng
- **Extension**: Website Blocker Chrome Extension
- **Blocklist**: Danh sách các domain bị chặn
- **Background Service Worker**: Script chạy nền xử lý logic chặn và kiểm tra schedule
- **Popup**: Giao diện người dùng chính của extension
- **chrome.alarms**: Chrome API dùng để đặt lịch thực thi định kỳ trong background

## Requirements

### Requirement 1

**User Story:** As a người dùng, I want thiết lập lịch chặn tự động theo khung giờ, so that extension tự động bật/tắt chặn mà không cần can thiệp thủ công.

#### Acceptance Criteria

1. WHEN người dùng mở Schedule UI, THE Extension SHALL hiển thị danh sách các time intervals hiện tại (mỗi interval gồm start time và end time).
2. WHEN người dùng thêm một time interval mới với start time và end time hợp lệ, THE Extension SHALL thêm interval đó vào Schedule và lưu vào Chrome storage.
3. WHEN người dùng nhập start time lớn hơn hoặc bằng end time, THE Extension SHALL từ chối interval đó và hiển thị thông báo lỗi.
4. WHEN người dùng xóa một time interval, THE Extension SHALL xóa interval đó khỏi Schedule và cập nhật Chrome storage.
5. WHEN Schedule không có time interval nào, THE Extension SHALL hiển thị trạng thái "No schedule set".

### Requirement 2

**User Story:** As a người dùng, I want chọn các ngày trong tuần áp dụng lịch chặn, so that tôi có thể chặn website vào ngày làm việc và không chặn vào cuối tuần.

#### Acceptance Criteria

1. WHEN người dùng mở Schedule UI, THE Extension SHALL hiển thị 7 nút đại diện cho các ngày trong tuần (Sun, Mon, Tue, Wed, Thu, Fri, Sat).
2. WHEN người dùng click vào một ngày, THE Extension SHALL toggle trạng thái active/inactive của ngày đó và lưu vào Chrome storage.
3. WHEN không có ngày nào được chọn, THE Extension SHALL coi Schedule là không hoạt động và không chặn bất kỳ domain nào theo lịch.
4. WHEN người dùng lưu Schedule, THE Extension SHALL lưu danh sách các ngày đã chọn cùng với time intervals vào Chrome storage.

### Requirement 3

**User Story:** As a người dùng, I want extension tự động bật chặn khi đến giờ đã đặt, so that tôi không cần nhớ bật thủ công.

#### Acceptance Criteria

1. WHEN thời điểm hiện tại nằm trong một Active Interval của ngày hiện tại, THE Extension SHALL kích hoạt blocking rules cho tất cả domain trong Blocklist.
2. WHEN thời điểm hiện tại nằm ngoài tất cả Active Intervals của ngày hiện tại, THE Extension SHALL hủy kích hoạt blocking rules.
3. WHEN ngày hiện tại không nằm trong Selected Days, THE Extension SHALL hủy kích hoạt blocking rules bất kể time interval.
4. WHEN Extension đang ở Schedule Mode, THE Background Service Worker SHALL kiểm tra schedule mỗi phút một lần bằng chrome.alarms.

### Requirement 4

**User Story:** As a người dùng, I want xem trạng thái hiện tại của schedule trong Popup, so that tôi biết extension đang hoạt động theo chế độ nào.

#### Acceptance Criteria

1. WHEN Extension đang ở Schedule Mode và trong Active Interval, THE Popup SHALL hiển thị trạng thái "Blocking (Scheduled)".
2. WHEN Extension đang ở Schedule Mode và ngoài Active Interval, THE Popup SHALL hiển thị trạng thái "Waiting (Scheduled)".
3. WHEN Extension đang ở Manual Mode với enabled=true, THE Popup SHALL hiển thị trạng thái "Enabled".
4. WHEN Extension đang ở Manual Mode với enabled=false, THE Popup SHALL hiển thị trạng thái "Disabled".

### Requirement 5

**User Story:** As a người dùng, I want chuyển đổi giữa Manual Mode và Schedule Mode, so that tôi có thể linh hoạt chọn cách quản lý việc chặn.

#### Acceptance Criteria

1. WHEN người dùng kích hoạt Schedule Mode, THE Extension SHALL lưu mode="schedule" vào Chrome storage và bắt đầu kiểm tra schedule định kỳ.
2. WHEN người dùng chuyển về Manual Mode, THE Extension SHALL lưu mode="manual" vào Chrome storage, hủy chrome.alarms, và áp dụng trạng thái enabled hiện tại.
3. WHEN Extension khởi động lại, THE Extension SHALL đọc mode từ Chrome storage và tiếp tục hoạt động theo mode đã lưu.
4. WHEN Schedule Mode được kích hoạt nhưng Schedule chưa có time interval nào, THE Extension SHALL hiển thị cảnh báo "No schedule configured" trong Popup.

### Requirement 6

**User Story:** As a người dùng, I want dữ liệu schedule được lưu trữ bền vững, so that lịch chặn không bị mất khi đóng/mở lại trình duyệt.

#### Acceptance Criteria

1. WHEN người dùng lưu Schedule, THE Extension SHALL serialize toàn bộ Schedule (intervals và selected days) thành JSON và lưu vào Chrome storage.
2. WHEN Extension khởi động, THE Extension SHALL deserialize dữ liệu Schedule từ Chrome storage thành cấu trúc dữ liệu nội bộ tương đương.
3. WHEN dữ liệu Schedule trong Chrome storage bị lỗi hoặc không hợp lệ, THE Extension SHALL sử dụng Schedule mặc định (không có interval, tất cả ngày được chọn) thay vì throw exception.

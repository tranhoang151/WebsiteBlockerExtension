# Requirements Document

## Introduction

Website Blocker là một Chrome Extension cho phép người dùng chặn các trang web gây mất tập trung. Người dùng có thể thêm/xóa các trang web vào danh sách chặn, bật/tắt tính năng chặn, và xem thông báo khi truy cập vào trang bị chặn.

## Glossary

- **Extension**: Chrome Extension được cài đặt trên trình duyệt Chrome
- **Blocklist**: Danh sách các domain/URL mà người dùng muốn chặn
- **Domain**: Tên miền của trang web (ví dụ: facebook.com, youtube.com)
- **Popup**: Giao diện nhỏ hiện ra khi người dùng click vào icon extension
- **Block Page**: Trang thay thế hiển thị khi người dùng truy cập vào trang bị chặn
- **Background Service Worker**: Script chạy nền của extension, xử lý logic chặn URL
- **Content Script**: Script chạy trong context của trang web
- **declarativeNetRequest**: Chrome API dùng để chặn/chuyển hướng network request

## Requirements

### Requirement 1

**User Story:** As a người dùng, I want thêm trang web vào danh sách chặn, so that tôi có thể tránh bị phân tâm bởi các trang web đó.

#### Acceptance Criteria

1. WHEN người dùng nhập một domain vào ô input và nhấn nút "Add" hoặc phím Enter, THE Extension SHALL thêm domain đó vào Blocklist và lưu vào Chrome storage.
2. WHEN người dùng nhập một domain không hợp lệ (rỗng hoặc chỉ chứa khoảng trắng), THE Extension SHALL từ chối thêm và giữ nguyên trạng thái hiện tại.
3. WHEN người dùng nhập một domain đã tồn tại trong Blocklist, THE Extension SHALL từ chối thêm trùng lặp và hiển thị thông báo cho người dùng.
4. WHEN một domain được thêm thành công, THE Extension SHALL hiển thị domain đó trong danh sách ngay lập tức.

### Requirement 2

**User Story:** As a người dùng, I want xóa trang web khỏi danh sách chặn, so that tôi có thể truy cập lại trang đó khi cần.

#### Acceptance Criteria

1. WHEN người dùng nhấn nút xóa bên cạnh một domain trong Blocklist, THE Extension SHALL xóa domain đó khỏi Blocklist và cập nhật Chrome storage.
2. WHEN một domain bị xóa khỏi Blocklist, THE Extension SHALL cập nhật danh sách hiển thị ngay lập tức mà không cần reload.
3. WHEN Blocklist trở nên rỗng sau khi xóa, THE Extension SHALL hiển thị trạng thái danh sách trống.

### Requirement 3

**User Story:** As a người dùng, I want bật/tắt tính năng chặn, so that tôi có thể tạm thời truy cập các trang bị chặn mà không cần xóa chúng khỏi danh sách.

#### Acceptance Criteria

1. WHEN người dùng nhấn toggle để tắt Extension, THE Extension SHALL dừng chặn tất cả các domain trong Blocklist.
2. WHEN người dùng nhấn toggle để bật Extension, THE Extension SHALL bắt đầu chặn tất cả các domain trong Blocklist.
3. WHILE Extension đang ở trạng thái tắt, THE Extension SHALL hiển thị trạng thái "Disabled" rõ ràng trong Popup.
4. WHEN trạng thái bật/tắt thay đổi, THE Extension SHALL lưu trạng thái đó vào Chrome storage để duy trì sau khi restart trình duyệt.

### Requirement 4

**User Story:** As a người dùng, I want thấy trang thông báo khi truy cập trang bị chặn, so that tôi biết trang đó đang bị chặn và có thể quay lại.

#### Acceptance Criteria

1. WHEN người dùng điều hướng đến một domain có trong Blocklist và Extension đang bật, THE Extension SHALL chuyển hướng trình duyệt đến Block Page thay vì tải trang gốc.
2. WHEN Block Page được hiển thị, THE Extension SHALL hiển thị tên domain bị chặn trên trang đó.
3. WHEN người dùng nhấn nút "Go Back" trên Block Page, THE Extension SHALL điều hướng trình duyệt về trang trước đó.

### Requirement 5

**User Story:** As a người dùng, I want dữ liệu Blocklist được lưu trữ bền vững, so that danh sách chặn không bị mất khi đóng/mở lại trình duyệt.

#### Acceptance Criteria

1. WHEN Extension được cài đặt lần đầu, THE Extension SHALL khởi tạo Blocklist rỗng và trạng thái bật trong Chrome storage.
2. WHEN trình duyệt được khởi động lại, THE Extension SHALL tải lại Blocklist và trạng thái bật/tắt từ Chrome storage.
3. WHEN dữ liệu được đọc từ Chrome storage, THE Extension SHALL deserialize dữ liệu JSON thành cấu trúc dữ liệu nội bộ tương đương.
4. WHEN dữ liệu được ghi vào Chrome storage, THE Extension SHALL serialize cấu trúc dữ liệu nội bộ thành JSON tương đương.

# Design Document: Website Blocker Chrome Extension

## Overview

Website Blocker là một Chrome Extension (Manifest V3) cho phép người dùng quản lý danh sách các domain bị chặn. Khi người dùng truy cập một trang trong danh sách, extension sẽ chuyển hướng họ đến một trang thông báo tùy chỉnh. Người dùng có thể bật/tắt tính năng và quản lý danh sách qua Popup UI.

## Architecture

Extension sử dụng kiến trúc Manifest V3 với 3 thành phần chính:

```
┌─────────────────────────────────────────────────────┐
│                   Chrome Browser                    │
│                                                     │
│  ┌──────────┐    ┌──────────────────────────────┐  │
│  │  Popup   │◄──►│   Background Service Worker  │  │
│  │  (UI)    │    │   (Logic + Storage)           │  │
│  └──────────┘    └──────────┬───────────────────┘  │
│                             │                       │
│                    declarativeNetRequest             │
│                             │                       │
│                  ┌──────────▼──────────┐            │
│                  │    Block Page       │            │
│                  │  (blocked.html)     │            │
│                  └─────────────────────┘            │
└─────────────────────────────────────────────────────┘
```

Luồng dữ liệu:
1. Popup đọc/ghi state qua `chrome.storage.sync`
2. Background Service Worker lắng nghe thay đổi storage và cập nhật `declarativeNetRequest` rules
3. Khi URL bị chặn, Chrome tự động chuyển hướng đến `blocked.html`

## Components and Interfaces

### 1. Popup (`popup.html` + `popup.ts`)

Giao diện người dùng chính. Hiển thị:
- Toggle bật/tắt extension
- Input field để thêm domain
- Danh sách các domain đang bị chặn với nút xóa

```typescript
interface PopupState {
  enabled: boolean;
  blocklist: string[];
}
```

### 2. Background Service Worker (`background.ts`)

Xử lý logic cốt lõi:
- Lắng nghe `chrome.storage.onChanged` để cập nhật blocking rules
- Quản lý `declarativeNetRequest` dynamic rules
- Khởi tạo storage khi extension được cài lần đầu

```typescript
// Mỗi domain trong blocklist tương ứng với một declarativeNetRequest rule
interface BlockRule {
  id: number;        // unique rule ID
  domain: string;    // domain bị chặn
}
```

### 3. Storage Module (`storage.ts`)

Abstraction layer cho Chrome storage:

```typescript
interface ExtensionState {
  enabled: boolean;
  blocklist: string[];
}

// Serialize: ExtensionState -> JSON string (lưu vào storage)
function serialize(state: ExtensionState): string

// Deserialize: JSON string -> ExtensionState (đọc từ storage)
function deserialize(json: string): ExtensionState

async function loadState(): Promise<ExtensionState>
async function saveState(state: ExtensionState): Promise<void>
```

### 4. Block Page (`blocked.html` + `blocked.ts`)

Trang hiển thị khi người dùng truy cập domain bị chặn:
- Đọc domain từ URL query parameter
- Hiển thị tên domain bị chặn
- Nút "Go Back" để quay lại trang trước

### 5. Domain Validator (`validator.ts`)

```typescript
// Trả về true nếu domain hợp lệ (không rỗng, không chỉ whitespace, đúng format)
function isValidDomain(input: string): boolean

// Chuẩn hóa domain (lowercase, bỏ protocol, bỏ trailing slash)
function normalizeDomain(input: string): string
```

## Data Models

### ExtensionState

```typescript
interface ExtensionState {
  enabled: boolean;   // trạng thái bật/tắt
  blocklist: string[]; // mảng các domain đã chuẩn hóa
}
```

Lưu trữ trong `chrome.storage.sync` dưới key `"extensionState"` dưới dạng JSON string.

Ví dụ JSON:
```json
{
  "enabled": true,
  "blocklist": ["facebook.com", "youtube.com", "twitter.com"]
}
```

### declarativeNetRequest Rule

Mỗi domain trong blocklist được ánh xạ thành một dynamic rule:

```typescript
{
  id: <index + 1>,
  priority: 1,
  action: {
    type: "redirect",
    redirect: {
      extensionPath: "/blocked.html?domain=<domain>"
    }
  },
  condition: {
    urlFilter: "*<domain>*",
    resourceTypes: ["main_frame"]
  }
}
```


## Correctness Properties

*A property is a characteristic or behavior that should hold true across all valid executions of a system-essentially, a formal statement about what the system should do. Properties serve as the bridge between human-readable specifications and machine-verifiable correctness guarantees.*

### Property 1: Thêm domain hợp lệ làm tăng blocklist

*For any* blocklist và domain hợp lệ chưa có trong danh sách, sau khi thêm domain đó, blocklist phải chứa domain đó và có độ dài tăng thêm 1.

**Validates: Requirements 1.1**

---

### Property 2: Input không hợp lệ bị từ chối

*For any* chuỗi chỉ chứa whitespace (khoảng trắng, tab, newline), hàm `isValidDomain` phải trả về `false` và blocklist không thay đổi.

**Validates: Requirements 1.2**

---

### Property 3: Không thêm domain trùng lặp

*For any* blocklist chứa ít nhất một domain, thêm lại một domain đã có trong danh sách phải không làm thay đổi blocklist.

**Validates: Requirements 1.3**

---

### Property 4: Xóa domain loại bỏ đúng phần tử

*For any* blocklist và domain có trong danh sách, sau khi xóa domain đó, blocklist không còn chứa domain đó và có độ dài giảm đi 1.

**Validates: Requirements 2.1**

---

### Property 5: Toggle bật/tắt là round-trip

*For any* trạng thái extension, bật rồi tắt (hoặc tắt rồi bật) phải trả về trạng thái `enabled` ban đầu, trong khi blocklist không thay đổi.

**Validates: Requirements 3.1, 3.2, 3.4**

---

### Property 6: Serialization round-trip

*For any* `ExtensionState` hợp lệ, `deserialize(serialize(state))` phải trả về một object tương đương với `state` ban đầu (cùng `enabled`, cùng `blocklist`).

**Validates: Requirements 5.2, 5.3, 5.4**

---

### Property 7: Mỗi domain trong blocklist có một blocking rule tương ứng

*For any* `ExtensionState` với `enabled = true`, hàm tạo `declarativeNetRequest` rules phải tạo ra đúng một rule cho mỗi domain trong blocklist, và không có rule nào cho domain không có trong blocklist.

**Validates: Requirements 4.1**

---

## Error Handling

- **Domain không hợp lệ**: Hiển thị thông báo lỗi inline trong Popup, không thêm vào blocklist.
- **Domain trùng lặp**: Hiển thị thông báo "Domain already blocked" trong Popup.
- **Chrome storage lỗi**: Log lỗi ra console, hiển thị thông báo lỗi chung trong Popup.
- **JSON parse lỗi khi deserialize**: Trả về `ExtensionState` mặc định (`enabled: true, blocklist: []`) thay vì throw exception.
- **declarativeNetRequest lỗi**: Log lỗi, không crash extension.

## Testing Strategy

### Công nghệ

- **Unit & Property-Based Testing**: [fast-check](https://github.com/dubzzz/fast-check) — thư viện PBT phổ biến cho TypeScript/JavaScript
- **Test Runner**: [Vitest](https://vitest.dev/) — nhanh, tương thích TypeScript tốt
- **Build Tool**: [Vite](https://vitejs.dev/) với plugin `@crxjs/vite-plugin` cho Chrome Extension

### Unit Tests

Kiểm tra các ví dụ cụ thể và edge cases:
- `isValidDomain("")` → `false`
- `normalizeDomain("https://Facebook.com/")` → `"facebook.com"`
- `serialize` / `deserialize` với state mặc định
- Block page đọc đúng domain từ query param `?domain=facebook.com`
- Khởi tạo state mặc định khi extension cài lần đầu (Requirements 5.1)

### Property-Based Tests

Mỗi property-based test phải:
- Chạy tối thiểu **100 iterations** (cấu hình mặc định của fast-check)
- Được annotate với comment theo format: `// Feature: website-blocker, Property {N}: {property_text}`
- Mỗi correctness property được implement bởi **một** property-based test duy nhất

Mapping property → test:

| Property | Test |
|----------|------|
| Property 1 | Thêm domain hợp lệ tăng blocklist |
| Property 2 | Whitespace input bị từ chối |
| Property 3 | Domain trùng không được thêm |
| Property 4 | Xóa domain giảm blocklist |
| Property 5 | Toggle round-trip |
| Property 6 | Serialization round-trip |
| Property 7 | Mỗi domain có đúng một blocking rule |

### Dual Testing Approach

Unit tests và property tests bổ sung cho nhau:
- Unit tests bắt các bug cụ thể và kiểm tra edge cases đã biết
- Property tests xác minh tính đúng đắn tổng quát trên nhiều input ngẫu nhiên

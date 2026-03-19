# Implementation Plan

- [x] 1. Khởi tạo project structure và cấu hình build
  - Tạo `manifest.json` (Manifest V3) với các permissions cần thiết: `storage`, `declarativeNetRequest`, `declarativeNetRequestWithHostAccess`
  - Tạo `package.json` với dependencies: `vite`, `@crxjs/vite-plugin`, `vitest`, `fast-check`, `typescript`
  - Tạo `vite.config.ts` và `tsconfig.json`
  - Tạo cấu trúc thư mục: `src/`, `src/popup/`, `src/background/`, `src/blocked/`, `src/shared/`
  - _Requirements: 5.1_

- [x] 2. Implement shared modules

- [x] 2.1 Implement domain validator (`src/shared/validator.ts`)
  - Viết hàm `isValidDomain(input: string): boolean` — trả về false nếu rỗng hoặc chỉ whitespace
  - Viết hàm `normalizeDomain(input: string): string` — lowercase, bỏ protocol, bỏ trailing slash
  - _Requirements: 1.2_

- [x] 2.2 Viết property test cho validator (Property 2)
  - `// Feature: website-blocker, Property 2: Whitespace input bị từ chối`
  - Dùng `fc.string()` filter để generate whitespace-only strings, kiểm tra `isValidDomain` trả về false
  - **Property 2: Whitespace tasks are invalid**
  - **Validates: Requirements 1.2**

- [x] 2.3 Implement storage module (`src/shared/storage.ts`)
  - Định nghĩa interface `ExtensionState { enabled: boolean; blocklist: string[] }`
  - Viết hàm `serialize(state: ExtensionState): string`
  - Viết hàm `deserialize(json: string): ExtensionState` — trả về default state nếu parse lỗi
  - Viết `loadState()` và `saveState()` dùng `chrome.storage.sync`
  - _Requirements: 5.2, 5.3, 5.4_

- [x] 2.4 Viết property test cho serialization (Property 6)
  - `// Feature: website-blocker, Property 6: Serialization round-trip`
  - Dùng `fc.record()` để generate random `ExtensionState`, kiểm tra `deserialize(serialize(state))` tương đương state gốc
  - **Property 6: Serialization round-trip**
  - **Validates: Requirements 5.2, 5.3, 5.4**

- [x] 3. Implement blocklist logic (`src/shared/blocklist.ts`)
  - Viết hàm `addDomain(state: ExtensionState, domain: string): { state: ExtensionState; error?: string }` — validate, normalize, check duplicate
  - Viết hàm `removeDomain(state: ExtensionState, domain: string): ExtensionState`
  - Viết hàm `toggleEnabled(state: ExtensionState): ExtensionState`
  - _Requirements: 1.1, 1.2, 1.3, 2.1, 3.1, 3.2_

- [x] 3.1 Viết property test cho add domain (Property 1)
  - `// Feature: website-blocker, Property 1: Thêm domain hợp lệ làm tăng blocklist`
  - Generate random blocklist và domain hợp lệ chưa có trong list, kiểm tra length tăng 1 và domain có trong list
  - **Property 1: Adding a valid domain grows the blocklist**
  - **Validates: Requirements 1.1**

- [x] 3.2 Viết property test cho duplicate domain (Property 3)
  - `// Feature: website-blocker, Property 3: Không thêm domain trùng lặp`
  - Generate random blocklist có ít nhất 1 domain, thêm lại domain đã có, kiểm tra blocklist không thay đổi
  - **Property 3: Duplicate domain is rejected**
  - **Validates: Requirements 1.3**

- [x] 3.3 Viết property test cho remove domain (Property 4)
  - `// Feature: website-blocker, Property 4: Xóa domain loại bỏ đúng phần tử`
  - Generate random blocklist có ít nhất 1 domain, xóa một domain, kiểm tra length giảm 1 và domain không còn trong list
  - **Property 4: Removing a domain shrinks the blocklist**
  - **Validates: Requirements 2.1**

- [x] 3.4 Viết property test cho toggle (Property 5)
  - `// Feature: website-blocker, Property 5: Toggle bật/tắt là round-trip`
  - Generate random state, toggle 2 lần, kiểm tra `enabled` trở về giá trị ban đầu và blocklist không thay đổi
  - **Property 5: Toggle enabled is a round-trip**
  - **Validates: Requirements 3.1, 3.2, 3.4**

- [x] 4. Implement Background Service Worker (`src/background/background.ts`)





  - Viết hàm `buildRules(state: ExtensionState): chrome.declarativeNetRequest.Rule[]` — tạo redirect rules cho mỗi domain khi enabled=true, trả về [] khi disabled
  - Viết hàm `updateRules(state: ExtensionState): Promise<void>` — xóa rules cũ, thêm rules mới
  - Đăng ký `chrome.runtime.onInstalled` để khởi tạo default state
  - Đăng ký `chrome.storage.onChanged` để cập nhật rules khi state thay đổi
  - _Requirements: 3.1, 3.2, 4.1, 5.1_

- [x] 4.1 Viết property test cho blocking rules (Property 7)






  - `// Feature: website-blocker, Property 7: Mỗi domain trong blocklist có một blocking rule tương ứng`
  - Generate random `ExtensionState` với `enabled=true`, kiểm tra `buildRules()` trả về đúng số rules bằng số domain, mỗi domain có đúng 1 rule
  - **Property 7: Each domain has exactly one blocking rule**
  - **Validates: Requirements 4.1**

- [x] 5. Checkpoint — Đảm bảo tất cả tests đang pass





  - Ensure all tests pass, ask the user if questions arise.

- [x] 6. Implement Popup UI (`src/popup/`)





  - Tạo `popup.html` với toggle switch, input field, nút Add, và danh sách domain
  - Viết `popup.ts`: load state từ storage, render danh sách, xử lý sự kiện Add/Remove/Toggle, lưu state sau mỗi thay đổi
  - _Requirements: 1.1, 1.3, 1.4, 2.1, 2.2, 2.3, 3.1, 3.2, 3.3_

- [x] 7. Implement Block Page (`src/blocked/`)





  - Tạo `blocked.html` với thông báo bị chặn và nút "Go Back"
  - Viết `blocked.ts`: đọc `?domain=` từ URL, hiển thị tên domain, xử lý nút Go Back dùng `history.back()`
  - _Requirements: 4.2, 4.3_

- [x] 8. Final Checkpoint — Đảm bảo tất cả tests đang pass





  - Ensure all tests pass, ask the user if questions arise.

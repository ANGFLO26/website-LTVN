# PR-10A Evidence: Admin Change Password

- **Date**: 2026-10-03
- **Scope**: PR-10A (Admin Change Password with current password verification)
- **Target Database**: Existing Development Neon PostgreSQL (`neondb`)
- **Status**: VERIFIED & PASSED

---

## 1. Requirement & Password Policy

- **Authoritative Docs / Wireframe Requirement**:
  - Đổi mật khẩu yêu cầu: Mật khẩu hiện tại, Mật khẩu mới, Xác nhận mật khẩu mới.
  - Mật khẩu mạnh bao gồm: độ dài tối thiểu, chữ hoa, chữ thường, số, ký tự đặc biệt.
  - Wireframe đề cập phạm vi 10–12 ký tự; chọn `minimum length = 12` (ngưỡng an toàn trên) và giới hạn tối đa `72` ký tự (giới hạn bảo mật của thuật toán bcrypt).
- **Centralized Policy Implementation** ([`api/src/modules/auth/auth.config.ts`](file:///d:/Work/LTVN/Last/api/src/modules/auth/auth.config.ts)):
  - Độ dài tối thiểu: 12 ký tự (`PASSWORD_MIN_LENGTH = 12`)
  - Chữ in hoa: `/[A-Z]/`
  - Chữ thường: `/[a-z]/`
  - Chữ số: `/[0-9]/`
  - Ký tự đặc biệt: `/[^A-Za-z0-9]/`
  - Khác mật khẩu hiện tại: `newPassword !== currentPassword` (bắt buộc kiểm tra cả ở backend và frontend)

---

## 2. API Contract

- **Endpoint**: `POST /api/auth/change-password`
- **Protection**: JWT Bearer token bắt buộc (bảo vệ bởi `AuthGuard`, không dùng `@Public()`).
- **Identity**: User ID được trích xuất hoàn toàn từ token đã xác thực (`request.admin.id`), ngăn chặn việc client giả mạo hay đổi mật khẩu của tài khoản khác.
- **Request Body**:
  ```json
  {
    "currentPassword": "...",
    "newPassword": "..."
  }
  ```
- **Response Status**: `200 OK`
  ```json
  {
    "message": "Đổi mật khẩu thành công."
  }
  ```
- **Response Safety**: Không bao giờ trả về `passwordHash`, `currentPassword`, `newPassword`, hay thông tin nội bộ của cơ sở dữ liệu.

---

## 3. Session & Logout Behavior

- **Stateless JWT**: Token hiện tại là stateless JWT được lưu ở client `sessionStorage` (`ltvn_admin_session`).
- **Client Session Revocation**: Ngay sau khi API đổi mật khẩu thành công, ứng dụng Admin frontend:
  1. Xóa hoàn toàn access token và trạng thái phiên trong `sessionStorage`.
  2. Điều hướng lập tức về màn hình đăng nhập (`LoginPage`).
  3. Hiển thị thông báo: `"Đổi mật khẩu thành công. Vui lòng đăng nhập lại."`
  4. Mọi yêu cầu truy cập các màn hình quản trị được bảo vệ với phiên cũ đều bị chặn.

---

## 4. Real PostgreSQL Verification Matrix

Kiểm thử trên database Neon PostgreSQL development thật qua script [`pr10a-integration.mjs`](file:///d:/Work/LTVN/Last/artifacts/final-03-remediation-2026-10-03/pr-10a/pr10a-integration.mjs) với fixture độc lập `pr10a-{timestamp}@example.invalid`:

| Step | Thao tác | Credentials | Kết quả HTTP / DB | Trạng thái |
|:---:|---|---|---|:---:|
| Preflight | Kiểm tra read-only | - | Đọc 2 existing users, DB: `neondb` | **PASS** |
| Step 1 | Đăng nhập lần đầu | Password A | 200 OK, JWT được cấp | **PASS** |
| Step 2 | Đổi mật khẩu với current password sai | Wrong Current + Password B | 400 Bad Request, DB hash giữ nguyên hash A | **PASS** |
| Step 3 | Đổi mật khẩu hợp lệ (A -> B) | Current A + New B | 200 OK, hash DB đổi sang bcrypt hợp lệ (không plaintext), attempts=0, locked_until=null | **PASS** |
| Step 4 | Đăng nhập bằng mật khẩu cũ (A) | Password A | 401 Unauthorized (Từ chối) | **PASS** |
| Step 5 | Đăng nhập bằng mật khẩu mới (B) | Password B | 200 OK, JWT mới được cấp | **PASS** |
| Step 6 | Kiểm tra an toàn response | - | 0 plaintext, 0 passwordHash | **PASS** |
| Cleanup | Xóa fixture test | - | Fixture còn lại: 0, 2 existing users nguyên vẹn | **PASS** |

---

## 5. Playwright Browser Proof Matrix

Kiểm thử giao diện Admin browser thật qua script [`pr10a-browser-proof.mjs`](file:///d:/Work/LTVN/Last/artifacts/final-03-remediation-2026-10-03/pr-10a/pr10a-browser-proof.mjs):

1. Mở trang quản trị -> Hiển thị màn hình đăng nhập.
2. Đăng nhập bằng mật khẩu ban đầu -> Màn hình Dashboard hiển thị thành công.
3. Chuyển sang màn hình Cấu Hình API / Cài Đặt -> Thẻ "Đổi Mật Khẩu Quản Trị" hiển thị đầy đủ.
4. Nhập mật khẩu hiện tại, mật khẩu mới, và xác nhận mật khẩu mới.
5. Gửi form -> API xử lý thành công.
6. Tự động kết thúc phiên và điều hướng về `LoginPage`.
7. Thông báo hiển thị trong vai trò alert: `"Đổi mật khẩu thành công. Vui lòng đăng nhập lại."`.
8. Kiểm tra `sessionStorage` -> Token bị xóa hoàn toàn (`null`).
9. Tải lại trang (reload) -> Vẫn ở `LoginPage`, không vào được Dashboard.
10. Đăng nhập bằng mật khẩu cũ -> Bị từ chối.
11. Đăng nhập bằng mật khẩu mới -> Thành công, trở lại Dashboard.

---

## 6. Regression Results

- `npm run build:api`: PASS (Exit code 0)
- `npm run build:admin`: PASS (Exit code 0)
- `npm --prefix api test`: PASS (56/56 unit tests, gồm 32 config/password tests, 1 app test, 23 auth tests)
- `npm --prefix api run test:e2e`: PASS (458/458 E2E tests)
- `node scripts/qa01-auth-browser.mjs`: PASS (8/8 browser auth tests)
- `node scripts/pr01-database-failfast-test.mjs`: PASS (8/8 fail-fast tests)
- `node scripts/pr06-seed-production-guard-test.mjs`: PASS (9/9 seed guard tests)
- `node artifacts/final-03-remediation-2026-10-03/pr-04a/pr04av-concurrency-test.mjs`: PASS (10/10 concurrency rounds)
- `git diff --check`: PASS (Exit code 0, không có lỗi định dạng hay trailing whitespace)

# BẰNG CHỨNG KHẮC PHỤC PR-01: FAIL-FAST CẤU HÌNH DATABASE_URL TRÊN PRODUCTION

**Thời gian:** 2026-10-03  
**Mục tiêu:** Khắc phục lỗi fallback ngầm về localhost khi thiếu biến môi trường `DATABASE_URL` trong môi trường Production.  
**Trạng thái:** **FIXED & VERIFIED**

---

## 1. NGUYÊN NHÂN GỐC RỄ (ROOT CAUSE)
Trước khi khắc phục, tại `api/src/database/database.module.ts`:
```typescript
const connectionString =
  configService.get<string>('DATABASE_URL') ||
  'postgresql://postgres:postgres@localhost:5432/ltvn_db';
```
Khi chạy trên môi trường Production (`NODE_ENV=production`), nếu biến môi trường `DATABASE_URL` bị thiếu hoặc rỗng, hệ thống âm thầm gán connection string localhost và cố gắng mở socket TCP tới `localhost:5432` thay vì dừng ứng dụng ngay lập tức với thông báo lỗi rõ ràng.

---

## 2. HỢP ĐỒNG PHÂN GIẢI (RESOLUTION CONTRACT)
Đã triển khai hàm `resolveDatabaseUrl()` với contract:
```text
Production configured:       Trả về URL đã cấu hình (sau khi trim khoảng trắng). Không log URL, không log secret.
Production missing:          Ném Error: "DATABASE_URL environment variable is required in production". Không chứa connection string.
Production empty/whitespace: Coi như missing -> Ném Error tương tự.
Development/Test missing:    Trả về local development fallback: "postgresql://postgres:postgres@localhost:5432/ltvn_db".
```

---

## 3. BẰNG CHỨNG FAIL-BEFORE-CONNECT
Tại `DatabaseModule`:
```typescript
useFactory: (configService: ConfigService): DrizzleDb => {
  const connectionString = resolveDatabaseUrl(configService);
  const client = postgres(connectionString);
  return drizzle(client, { schema });
}
```
Lệnh `resolveDatabaseUrl()` được gọi và ném ngoại lệ **trước khi** hàm `postgres(connectionString)` được triệu gọi.
Do đó, khi thiếu `DATABASE_URL` trong Production, driver `postgres` hoàn toàn **không được khởi tạo**, không có kết nối TCP hay socket nào được mở ra.

---

## 4. KẾT QUẢ TARGETED TEST (8/8 PASS)
Lệnh thực thi: `node scripts/pr01-database-failfast-test.mjs`

```text
=== START PR-01 TARGETED VERIFICATION ===

[PASS] Case A: Production + valid DATABASE_URL resolves configured URL
[PASS] Case B: Production + missing DATABASE_URL throws fail-fast error
[PASS] Case C1: Production + whitespace DATABASE_URL throws fail-fast error
[PASS] Case C2: Production + empty string DATABASE_URL throws fail-fast error
[PASS] Case D1: Development + missing DATABASE_URL falls back to local dev URL
[PASS] Case D2: Test env + missing DATABASE_URL falls back to local dev URL
[PASS] Case E: Process.env resolution without ConfigService object
[PASS] Case F: Fail-before-connect proof - provider factory throws before client creation

=== ALL 8 PR-01 TARGETED TESTS PASSED ===
```

---

## 5. HỒI QUY API E2E & LINT
- **API E2E Test Suite:** `npm --prefix api run test:e2e`
  - Kết quả: **13/13 test files passed, 457/457 tests passed (100%)**.
  - Không có bất kỳ regression nào trên toàn bộ 457 ca kiểm thử tích hợp API.
- **API Lint:** `npm --prefix api run lint`
  - `database.module.ts`: 0 errors, 0 warnings.
  - Các cảnh báo cũ (`seed.ts:1727` và unused-vars trong test) vẫn giữ nguyên baseline, không phát sinh lỗi mới.
- **Git Diff Check:** `git diff --check` sạch, exit code 0.

---

## 6. AN TOÀN BÍ MẬT & DATABASE
```text
DATABASE CONNECTIONS DURING PR-01: NONE
DATABASE MUTATION DURING PR-01: NONE
DATABASE CREDENTIALS LEAKED: NONE
```

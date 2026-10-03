# BẰNG CHỨNG KHẮC PHỤC PR-06: DATABASE SEED PRODUCTION GUARD

**Thời gian:** 2026-10-03  
**Mục tiêu:** Bổ sung cơ chế bảo vệ bắt buộc, ngăn chặn hoàn toàn việc chạy script nạp dữ liệu mẫu (`seed.ts`) trên môi trường Production gây xóa sạch dữ liệu.  
**Trạng thái:** **FIXED & VERIFIED**

---

## 1. NGUYÊN NHÂN GỐC RỄ (ROOT CAUSE)
Tệp `api/src/database/seed.ts` được thiết kế để nạp dữ liệu mẫu ban đầu. Trong hàm `seed()`, script thực thi một chuỗi các câu lệnh xóa triệt để dữ liệu:
```typescript
await db.delete(schema.machineStandards);
await db.delete(schema.machineSpecs);
await db.delete(schema.machineHighlights);
await db.delete(schema.machineApplications);
await db.delete(schema.machineImages);
await db.delete(schema.newsEvents);
await db.delete(schema.contacts);
await db.delete(schema.machines);
await db.delete(schema.standards);
await db.delete(schema.mediaAssets);
await db.delete(schema.users);
```
Trước khi khắc phục:
- Script khởi tạo kết nối PostgreSQL `postgres(databaseUrl)` và `drizzle(...)` ở cấp độ module (top-level execution) ngay khi file được import.
- Không có bất kỳ kiểm tra nào đối với biến môi trường `NODE_ENV`.
- Nếu kỹ sư vận hành chạy lệnh `npm run db:seed` khi đang trỏ biến `DATABASE_URL` vào production database, toàn bộ dữ liệu thực tế sẽ bị xóa sạch và thay thế bằng dữ liệu mẫu.

---

## 2. SEED INVOCATION (CÁCH THỨC TRIỆU GỌI HIỆN TẠI)
- Root script: `npm run db:seed` -> `npm --prefix api run build && npm --prefix api run db:seed`
- API script: `npm --prefix api run db:seed` -> `node dist/database/seed.js`
- Quá trình đọc biến môi trường: Đọc từ `process.env` và tệp `.env` tại thư mục gốc/api.

---

## 3. CÁC TỆP ĐÃ THAY ĐỔI (FILES CHANGED)
1. [api/src/database/seed.ts](file:///d:/Work/LTVN/Last/api/src/database/seed.ts):
   - Thêm hàm `assertSeedAllowed(env?: string)`: Kiểm tra `env?.trim().toLowerCase() === 'production'`, ném lỗi `Seed is disabled in production`.
   - Thêm hàm `getNodeEnv()`: Lấy từ `process.env.NODE_ENV` hoặc đọc từ tệp `.env`.
   - Thêm hàm `isDirectExecution()`: Kiểm tra xem tệp có đang được chạy trực tiếp từ dòng lệnh CLI (`process.argv[1]`) hay đang được import bởi module/test khác.
   - Chuyển việc khởi tạo `client = postgres(databaseUrl)` và `db = drizzle(client)` vào bên trong hàm `seed()` (lazy initialization).
   - Đặt `assertSeedAllowed(getNodeEnv())` ở dòng đầu tiên của `seed()`, chặn kết nối database nếu là production.
   - Thêm khối guard tại dòng lệnh thực thi cuối tệp:
     ```typescript
     if (isDirectExecution()) {
       try {
         assertSeedAllowed(getNodeEnv());
       } catch (error) {
         console.error(`❌ ${(error as Error).message}`);
         process.exit(1);
       }
       void seed();
     }
     ```
   - Cập nhật khối `finally`: `if (client) { await client.end(); }` để an toàn khi client chưa khởi tạo.
2. [scripts/pr06-seed-production-guard-test.mjs](file:///d:/Work/LTVN/Last/scripts/pr06-seed-production-guard-test.mjs):
   - Script kiểm thử mục tiêu độc lập cho 5 trường hợp môi trường và chứng minh fail-before-connect.

---

## 4. HỢP ĐỒNG GUARD CUỐI CÙNG (FINAL GUARD CONTRACT)
```text
production:         CHẶN (BLOCK). Ném Error: "Seed is disabled in production". Thoát CLI với mã lỗi 1. Không kết nối DB. Không DELETE.
development:        CHO PHÉP (ALLOW). Cho phép chạy nạp dữ liệu bình thường.
test:               CHO PHÉP (ALLOW). Cho phép chạy nạp dữ liệu phục vụ test suite.
NODE_ENV undefined: CHO PHÉP (ALLOW). Giữ nguyên trải nghiệm phát triển cục bộ của lập trình viên khi gõ nhanh npm run db:seed mà không set NODE_ENV.
```

---

## 5. BẰNG CHỨNG FAIL-BEFORE-CONNECT (DỪNG TRƯỚC KHI KẾT NỐI)
1. **Khởi tạo lười (Lazy initialization):** `postgres(databaseUrl)` không còn nằm ở top-level module. Việc import `seed.js` vào các test suite không còn tạo bất kỳ socket/connection nào tới database.
2. **Thứ tự thực thi trong `seed()`:**
   - Dòng 1: `assertSeedAllowed(getNodeEnv());`
   - Dòng 2 trở đi: Mới bắt đầu đọc `databaseUrl`, in log và gọi `postgres(databaseUrl)`.
   - Nếu `NODE_ENV === 'production'`, hàm ném lỗi ngay tại Dòng 1, `postgres(...)` hoàn toàn không được gọi.
3. **Thứ tự thực thi khi chạy CLI:**
   - Khối `if (isDirectExecution())` gọi `assertSeedAllowed(getNodeEnv())` trước tiên.
   - Nếu lỗi, in `❌ Seed is disabled in production` và gọi `process.exit(1)` ngay lập tức, hàm `seed()` không bao giờ được triệu gọi.

---

## 6. KẾT QUẢ KIỂM THỬ TARGETED (9/9 PASS)
Lệnh thực thi: `node scripts/pr06-seed-production-guard-test.mjs`

```text
=== START PR-06 TARGETED VERIFICATION ===

[PASS] Case A: NODE_ENV=production throws fail-fast error
[PASS] Case B1: NODE_ENV="  Production  " with whitespace/casing throws fail-fast error
[PASS] Case B2: NODE_ENV="PRODUCTION" uppercase throws fail-fast error
[PASS] Case C: NODE_ENV=development is allowed
[PASS] Case D: NODE_ENV=test is allowed
[PASS] Case E: NODE_ENV=undefined is allowed for local dev compatibility
[PASS] Case F: isDirectExecution returns false when imported as a library
[PASS] Case G: Fail-before-connect - programmatic seed() throws before DB connection
[PASS] Case H: CLI invocation exits with code 1 and blocks before DB connection

=== ALL 9 PR-06 TARGETED TESTS PASSED ===
```

---

## 7. HỒI QUY HỆ THỐNG & LINT
- **NestJS API Build:** `npm run build:api` -> **PASS**.
- **API Lint:** `npm --prefix api run lint` -> **PASS (0 errors)**.
  - Sửa dứt điểm baseline lint error `seed.ts:1727 no-floating-promises` nhờ `void seed();`.
  - Toàn bộ API hiện chỉ còn 7 warnings (unused-vars trong test cũ), không còn lỗi nào.
- **API E2E Tests:** `npm --prefix api run test:e2e` -> **457/457 PASS (100%)**.
- **Kiểm thử PR-01 trước đó:** `node scripts/pr01-database-failfast-test.mjs` -> **8/8 PASS**.
- **Git Check:** `git diff --check` -> **PASS** (Exit code 0).

---

## 8. AN TOÀN BÍ MẬT & DATABASE
```text
DATABASE CONNECTIONS DURING PR-06: NONE
DATABASE MUTATION DURING PR-06: NONE
SECRETS LOGGED: NONE
```

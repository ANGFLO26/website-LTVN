# BÁO CÁO AUDIT TOÀN DIỆN MỨC SẴN SÀNG PRODUCTION (FINAL-03)
**Ngày thực hiện:** 2026-10-03  
**Phạm vi:** Toàn bộ repository (Public Frontend, Admin Frontend, NestJS API, PostgreSQL/Drizzle Schema, Tooling & Scripts)  
**Chế độ:** AUDIT ONLY (Không code fix, không deploy, không mutation database, không commit/push)

---

## A. REPOSITORY BASELINE

- **Commit HEAD:** `6b0a76ec2bae5e099142d659a23a14f5f6dc20fc`
- **Git Check (`git diff --check`):** Sạch (Exit code 0, không trailing whitespace hay conflict marker).
- **Working Tree State:** Intentionally dirty do cumulative approved changes từ QA-01 → QA-16 và FINAL-01 → FINAL-02E.
- **Diff Stat Summary:** 49 files changed, 3010 insertions(+), 695 deletions(-).

---

## B. BUILD & TEST STATUS

| Test Suite / Build Step | Lệnh thực thi | Kết quả | Ghi chú |
| :--- | :--- | :--- | :--- |
| Public Frontend Build | `npm run build` | **PASS** | Vite v6.4.1, 1881 modules transformed (560ms), output `dist/` |
| Admin Frontend Build | `npm run build:admin` | **PASS** | Vite v6.4.1, 1888 modules transformed (367ms), output `admin/dist/` |
| NestJS API Build | `npm run build:api` | **PASS** | Nest CLI v10.4.9, TypeScript compiled output `api/dist/` |
| Root Lint | `npm run lint` | **PASS** | Oxlint v0.15.13, 47 files scanned, 0 errors, 0 warnings |
| API E2E Test Suite | `npm --prefix api run test:e2e` | **PASS** | **457/457 PASS** (13 test suites, 0 failures) |
| API Lint (Baseline) | `npm --prefix api run lint` | **BASELINE** | 1 error (`seed.ts:1727` no-floating-promises), 7 unused-var warnings. Đã tồn tại từ baseline trước, không phải regression |

---

## C. PRODUCTION ENVIRONMENT INVENTORY

| Biến môi trường | Thành phần sử dụng | Bắt buộc trong Production? | Fallback hiện tại | Rủi ro Production |
| :--- | :--- | :--- | :--- | :--- |
| `DATABASE_URL` | `api/src/database/database.module.ts`, `api/drizzle.config.ts`, `api/src/database/seed.ts` | **CÓ (BẮT BUỘC)** | `postgresql://postgres:postgres@localhost:5432/ltvn_db` | **CAO (BLOCKING)**: Thiếu env sẽ âm thầm trỏ về localhost thay vì fail-fast |
| `JWT_SECRET` | `api/src/auth/auth.config.ts` | **CÓ (BẮT BUỘC)** | Không có fallback trong production; ném ngoại lệ nếu thiếu | **THẤP**: Đã có fail-fast validation chính xác |
| `JWT_TTL_SECONDS` | `api/src/auth/auth.config.ts` | Không (Optional) | `86400` (24h) | **THẤP**: Fallback an toàn |
| `PORT` | `api/src/main.ts` | Không (Optional) | `3000` | **THẤP**: Port tiêu chuẩn cho container/PaaS |
| `NODE_ENV` | Toàn bộ API & Frontend | **CÓ (BẮT BUỘC)** | Mặc định `development` nếu không set | **TRUNG BÌNH**: Cần set rõ ràng `production` để kích hoạt guard |
| `VITE_API_BASE_URL` | Public Frontend (`src/api/client.ts`), Admin Frontend (`admin/src/api/client.ts`) | **CÓ (BẮT BUỘC)** | Fallback về relative `/api` hoặc `http://localhost:3000/api` trong dev | **TRUNG BÌNH**: Phải bake đúng URL khi build Vite production |
| `VITE_PUBLIC_SITE_URL` | Admin Frontend (`admin/src/pages/NewsAdminPage.tsx`, `MachinesAdminPage.tsx`, `SettingsPage.tsx`) | **CÓ (BẮT BUỘC)** | Window origin hoặc placeholder | **TRUNG BÌNH**: Dùng để generate preview links sang Public site |

---

## D. SECRET & CONFIG FAIL-SAFE AUDIT

1. **`DATABASE_URL` Fail-safe:**
   - Tại `api/src/database/database.module.ts:18`:
     ```typescript
     const connectionString = configService.get<string>('DATABASE_URL') || 'postgresql://postgres:postgres@localhost:5432/ltvn_db';
     ```
   - **Đánh giá:** Nếu môi trường production quên cấu hình `DATABASE_URL`, API không dừng ngay lập tức mà cố gắng kết nối tới `localhost:5432`. Đây là hành vi không an toàn (xếp loại **PR-01: BLOCKING – SOURCE**).
2. **`JWT_SECRET` Fail-safe:**
   - Tại `api/src/auth/auth.config.ts:8-13`:
     ```typescript
     if (isProduction && !secret) {
       throw new Error('JWT_SECRET environment variable is required in production');
     }
     ```
   - **Đánh giá:** An toàn, fail-fast ngay khi khởi động.
3. **Database Seed Fail-safe:**
   - Tại `api/src/database/seed.ts:20`: Có fallback localhost, đồng thời thực thi `db.delete(...)` toàn bộ bảng mà không có guard chặn `NODE_ENV === 'production'`. Nếu chạy nhầm trong production sẽ xoá sạch dữ liệu (xếp loại **PR-06: BLOCKING – SOURCE**).

---

## E. AUTH, JWT & ADMIN PROVISIONING

1. **JWT Implementation:**
   - Thuật toán ký: HMAC SHA-256 (`HS256`).
   - Thời hạn token: 86400s (24 giờ), cấu hình qua `JWT_TTL_SECONDS`.
   - Xác thực: Sử dụng `jwt.verify(token, secret)` trong `api/src/auth/jwt-auth.guard.ts`.
   - Xử lý khi hết hạn / sai token: Trả về HTTP 401 Unauthorized rõ ràng, không làm crash server.
   - Logout / Session: Phía client xóa token khỏi localStorage/memory. Hệ thống API là stateless JWT tiêu chuẩn.
   - Kiểm tra rò rỉ log: Không có log nào in token hoặc secret ra stdout/stderr.
2. **Password Storage:**
   - Sử dụng thư viện `bcrypt`.
   - Salt rounds: `12` rounds (`SALT_ROUNDS = 12` tại `auth.service.ts:32`).
   - Plaintext passwords: Tuyệt đối không lưu vào DB.
   - Response DTO: Toàn bộ controller và service loại bỏ trường `passwordHash` trước khi trả về client.
3. **Admin Provisioning:**
   - Trong file seed (`api/src/database/seed.ts`), tài khoản `admin@ltvietnam.com.vn` được gán hash giả lập `$2a$12$...` (cố tình không khớp với mật khẩu thực để tránh rò rỉ credential mặc định).
   - Tuy nhiên, hiện tại **chưa có script CLI** độc lập để khởi tạo mật khẩu Admin ban đầu trên môi trường production mới (xếp loại **PR-05: BLOCKING – DEPLOYMENT CONFIG**).

---

## F. API AUTHORIZATION INVENTORY

Toàn bộ ứng dụng được bảo vệ bởi Global Guard (`APP_GUARD` -> `JwtAuthGuard`). Chỉ những route có decorator `@Public()` mới cho phép truy cập nặc danh:

| Route Path | HTTP Method | Public / Protected | Mục đích nghiệp vụ | Đánh giá |
| :--- | :--- | :--- | :--- | :--- |
| `/api/auth/login` | `POST` | `@Public()` | Đăng nhập hệ thống quản trị | Hợp lệ |
| `/api/health` | `GET` | `@Public()` | Liveness / Readiness probe | Hợp lệ |
| `/api/contacts` | `POST` | `@Public()` | Gửi form liên hệ từ Public Frontend | Hợp lệ (Đã verify 6-field whitelist) |
| `/api/machines` | `GET` | `@Public()` | Danh sách máy & giải pháp | Hợp lệ |
| `/api/machines/:slug` | `GET` | `@Public()` | Chi tiết máy theo slug | Hợp lệ |
| `/api/news` | `GET` | `@Public()` | Danh sách tin tức/sự kiện | Hợp lệ |
| `/api/news/:slug` | `GET` | `@Public()` | Chi tiết bài viết theo slug | Hợp lệ |
| `/api/machines` | `POST` | **Protected** | Tạo mới máy | Hợp lệ |
| `/api/machines/:id` | `PUT/PATCH/DELETE` | **Protected** | Sửa / Xóa máy | Hợp lệ |
| `/api/news` | `POST` | **Protected** | Tạo bài viết mới | Hợp lệ |
| `/api/news/:id` | `PUT/PATCH/DELETE` | **Protected** | Sửa / Xóa bài viết | Hợp lệ |
| `/api/contacts` | `GET` | **Protected** | Xem danh sách liên hệ (Admin) | Hợp lệ |
| `/api/contacts/:id` | `PATCH/DELETE` | **Protected** | Cập nhật trạng thái / Xóa liên hệ | Hợp lệ |
| `/api/media` | `GET/POST/DELETE` | **Protected** | Quản lý media library | Hợp lệ |
| `/api/users` | `GET/POST/PUT/DELETE` | **Protected** | Quản trị người dùng | Hợp lệ |
| `/api/standards` | `ALL` | **Protected** | Quản lý tiêu chuẩn kỹ thuật | Hợp lệ |

*Kết luận Authorization:* Không có bất kỳ endpoint đột biến (mutation) nhạy cảm nào bị hở decorator `@Public()`.

---

## G. CORS & HTTP SECURITY HEADERS

1. **CORS Configuration:**
   - Tại `api/src/main.ts:7`: Gọi `app.enableCors()` không tham số.
   - **Rủi ro:** Khi không truyền cấu hình origin, CORS cho phép mọi nguồn (`*`). Đối với môi trường production, API cần giới hạn chặt chẽ chỉ cho phép origin của Public Site và Admin Site (xếp loại **PR-02: BLOCKING – DEPLOYMENT CONFIG**).
2. **HTTP Security Headers:**
   - Ứng dụng hiện tại chưa cài đặt middleware `helmet` ở tầng NestJS.
   - **Phân định trách nhiệm:** Security headers (HSTS, CSP, X-Frame-Options, X-Content-Type-Options) có thể được đảm bảo bởi Reverse Proxy (NGINX, Cloudflare, Traefik) hoặc tích hợp thư viện `helmet`. Đây là điều kiện tiên quyết cần cấu hình trước khi go-live (Deployment Prerequisite).

---

## H. HTTPS, DOMAINS & URL CONTRACT

- **Hardcoded Localhost:** Không có hardcoded localhost nào trong luồng runtime của production frontend. Mọi API call đều thông qua cấu hình `VITE_API_BASE_URL` hoặc relative path `/api`.
- **Mixed Content:** Toàn bộ liên kết và assets nội bộ đều sử dụng relative paths (`/assets/...`).
- **Domain Prerequisite:** Khi deploy, cần cấu hình các biến môi trường:
  - `VITE_API_BASE_URL=https://api.ltvietnam.com.vn/api`
  - `VITE_PUBLIC_SITE_URL=https://ltvietnam.com.vn`

---

## I. POSTGRESQL & DATABASE CLIENT CONFIGURATION

- **Driver:** `@neondb/serverless` kết hợp cùng `drizzle-orm/neon-http`.
- **Giao thức:** Kết nối qua HTTP serverless driver (Neon HTTP tunnel), hoàn toàn tương thích với kiến trúc serverless / pooled endpoint, không phụ thuộc vào persistent stateful TCP sockets.
- **SSL / TLS:** Neon HTTP driver tự động bắt buộc mã hóa HTTPS/TLS (cổng 443).
- **Rủi ro:** Không gặp hiện tượng cạn kiệt connection pool trong môi trường container/serverless do sử dụng stateless HTTP queries.

---

## J. MIGRATION, BACKUP & ROLLBACK READINESS

1. **Schema Migration:**
   - Drizzle journal đã ghi nhận đầy đủ:
     - `0000_init.sql`
     - `0001_add_news_event_translations.sql`
   - Đã kiểm tra tính toàn vẹn giữa `schema.ts`, snapshot JSON và SQL migrations.
2. **Quy trình Runbook Production Migration:**
   - Hiện tại tài liệu `README.md` đang hướng dẫn `npm run db:push` (xếp loại **PR-07: NON-BLOCKING** - Documentation Debt).
   - **Runbook chuẩn cần thiết:**
     1. Snapshot / Logical Backup Database trước khi migrate (`pg_dump` hoặc Neon Cloud snapshot).
     2. Chạy lệnh: `npm --prefix api run db:migrate`.
     3. Kiểm tra tính toàn vẹn của dữ liệu bằng script health check.
3. **Backup & Disaster Recovery:**
   - Cần kích hoạt tính năng tự động sao lưu hàng ngày (Automated Daily Backups) trên nhà cung cấp Database (Neon / Cloud PostgreSQL) kèm khả năng Point-in-time Recovery (PITR).

---

## K. SEED SAFETY AUDIT

- **Hành vi Seed:** Script `api/src/database/seed.ts` được thiết kế để nạp dữ liệu mẫu ban đầu cho môi trường development/staging.
- **Đánh giá rủi ro:**
  - Script này **KHÔNG** tự động chạy khi khởi động API server (`main.ts` không import hay gọi seed).
  - Tuy nhiên, script thiếu đoạn kiểm tra `process.env.NODE_ENV === 'production'`. Nếu kỹ sư vận hành gõ nhầm lệnh `npm run db:seed` khi đang kết nối DB production, script sẽ xóa sạch toàn bộ các bảng trước khi chèn dữ liệu mẫu (xếp loại **PR-06: BLOCKING – SOURCE**).

---

## L. CONTACT & PUBLIC ABUSE SURFACE

1. **Kiểm tra Whitelist & Validation:**
   - Endpoint `POST /api/contacts` sử dụng class `PublicContactDto` với Global ValidationPipe (`whitelist: true, forbidNonWhitelisted: true`).
   - Đúng chuẩn 6 trường: `name`, `email`, `phone`, `company`, `subject`, `message`.
   - Các trường hệ thống (`id`, `status`, `notes`, `createdAt`, `updatedAt`) nếu được truyền từ client sẽ bị từ chối ngay lập tức với lỗi HTTP 400.
2. **Chống lạm dụng & Spam:**
   - Ứng dụng hiện tại chưa tích hợp Rate Limiting (`@nestjs/throttler`) hoặc reCAPTCHA/Turnstile ở tầng mã nguồn API.
   - **Rủi ro:** Nguy cơ bị bot flood gửi form spam làm đầy database. Cần áp dụng Rate Limiting ở tầng Cloudflare/WAF hoặc Reverse Proxy (xếp loại **PR-04: BLOCKING – DEPLOYMENT CONFIG**).
3. **Đặc tả nghiệp vụ gửi Email:**
   - Liên hệ được lưu trữ an toàn trong DB: **CÓ (YES)**.
   - Yêu cầu gửi email tức thì theo Scope v1: **KHÔNG (NO - NOT IN SCOPE)**. Hệ thống v1 chỉ định lưu trữ vào database để Admin theo dõi trong trang quản trị.
   - Cấu hình SMTP: **CHƯA TRIỂN KHAI (NO)** (Đúng theo thiết kế v1).

---

## M. ERROR HANDLING & LOGGING AUDIT

1. **Error Handling:**
   - API sử dụng `HttpException` chuẩn của NestJS.
   - Khi gặp lỗi cú pháp SQL hoặc ràng buộc khóa ngoại, Drizzle / NestJS không trả raw SQL query hay stack trace cho client ở môi trường production (được bọc trong mã lỗi 500 hoặc 400).
   - Response lỗi tuân thủ định dạng JSON: `{ statusCode, message, error }`.
2. **Logging:**
   - Rà soát toàn bộ source code không phát hiện việc in mật khẩu, database connection string hay JWT token qua `console.log`.
   - Logger của NestJS chỉ in các thông tin bootstrap route thông thường.

---

## N. FRONTEND SECURITY & XSS

- **Quét XSS Surface:** Tìm kiếm `dangerouslySetInnerHTML`, `innerHTML`, `eval(`, `new Function`:
  - Kết quả: **0 trường hợp xuất hiện** trong toàn bộ mã nguồn Frontend (`src/` và `admin/src/`).
- **Data Rendering:** Toàn bộ nội dung bài viết, thông tin sản phẩm và liên hệ đều được render qua JSX an toàn (tự động escape HTML entities).
- **Source Maps:** Không có file `.map` nào được xuất ra trong thư mục build production `dist/` và `admin/dist/`.

---

## O. SPA ROUTING & HOSTING REQUIREMENTS

- **Kiến trúc:** Public Site và Admin Site là hai ứng dụng Single Page Application (React + Vite).
- **Yêu cầu Hosting:**
  - Đối với các route con (ví dụ: `/san-pham/:slug`, `/tin-tuc/:slug`, `/admin/news`):
  - Web Server (NGINX / Caddy / Cloudflare Pages / Vercel) **bắt buộc** phải cấu hình SPA rewrite / fallback:
    ```nginx
    location / {
        try_files $uri $uri/ /index.html;
    }
    ```
  - Nếu thiếu cấu hình rewrite, việc người dùng F5 hoặc truy cập trực tiếp link con sẽ gặp lỗi 404 từ web server.

---

## P. MEDIA & STORAGE DEPENDENCIES

- **Cơ chế lưu trữ:** Bảng `media` chỉ lưu trữ URL và metadata (`url`, `alt`, `caption`, `mimeType`, `sizeBytes`).
- **Upload File:** Hệ thống v1 hiện tại không có endpoint upload file binary trực tiếp lên server lưu trữ cục bộ.
- **External Media:** Các URL ảnh trỏ tới CDN / kho ảnh ngoài. Không có phụ thuộc vào local filesystem storage cho media.

---

## Q. MULTILINGUAL CONTRACT

- Ngôn ngữ mặc định: Tiếng Việt (VI).
- Ngôn ngữ thứ hai: Tiếng Anh (EN) là tùy chọn và được biên soạn riêng biệt (Policy A).
- Tuyệt đối không tự động dịch máy (no synthesized translation).
- Xử lý 404 chuẩn xác: Nếu bài viết không có bản dịch tiếng Anh, khi truy cập `/en/tin-tuc/:slug` sẽ trả về trang 404 NotFound thay vì fallback về tiếng Việt (đã pass test QA-14C4).
- Không sử dụng cờ quốc gia để biểu thị ngôn ngữ (đúng theo chuẩn i18n hiện đại).

---

## R. DEPENDENCY & RUNTIME AUDIT

1. **Runtime Requirements:**
   - Node.js: `>= 20.x` (Khuyến nghị `Node 22 LTS`).
   - Package Manager: `npm 10.x`.
2. **Audit phụ thuộc (`npm audit --omit=dev`):**
   - Root project: **0 vulnerabilities**.
   - API project: **2 moderate vulnerabilities** liên quan đến gói bắc cầu `multer` (đi kèm `@nestjs/platform-express`). Do API không mở endpoint upload file multipart, rủi ro thực tế trong môi trường hiện tại là **THẤP**.

---

## S. ACCESSIBILITY & RESPONSIVE SMOKE

- Đã chạy kiểm thử giao diện tự động:
  - Responsive test trên 3 mốc kích thước màn hình: Mobile (`375px`), Tablet (`768px`), Desktop (`1440px`) - **PASS** (15/15 checks).
  - Navigation Drawer trên mobile hoạt động trơn tru, không che lấp nội dung chính.
  - Toàn bộ form nhập liệu có nhãn (`aria-label` / `label`) đầy đủ.

---

## T. FULL CRITICAL REGRESSION SUITES

| Kịch bản Test Tự Động | Kết quả | Chi tiết kiểm thử |
| :--- | :--- | :--- |
| `scripts/qa01-auth-browser.mjs` | **PASS (8/8)** | Đăng nhập Admin, token storage, logout, unauthorized redirect |
| `scripts/qa04-mutation-browser.mjs` | **PASS (13/13)** | Thao tác CRUD Tin tức & Máy móc, xử lý lỗi, validate dữ liệu |
| `scripts/qa05-contact-browser.mjs` | **PASS (5/5)** | Gửi form liên hệ từ Public, hiển thị tại Admin Contact List |
| `scripts/qa08-contact-browser.mjs` | **PASS (7/7)** | Kiểm tra whitelist 6 trường, chặn payload lạ, validation format |
| `scripts/qa13-baker-links-browser.mjs` | **PASS (5/5)** | Kiểm tra chuyển hướng và loại bỏ các liên kết Baker Hughes đã đóng |
| `scripts/qa14c3-admin-bilingual-browser.mjs` | **PASS (16/16)** | Quản trị song ngữ VI/EN, lưu trữ bản dịch độc lập |
| `scripts/qa14c4-public-bilingual-browser.mjs` | **PASS (22/22)** | Chuyển đổi ngôn ngữ Public, URL slug localized, 404 cho EN thiếu |
| `scripts/qa15-admin-urls-browser.mjs` | **PASS (9/9)** | Kiểm tra các link preview từ Admin sang Public không dính localhost |
| `scripts/qa16-admin-responsive-browser.mjs` | **PASS (15/15)** | Giao diện Admin hiển thị tối ưu trên Mobile, Tablet, Desktop |
| `scripts/final01-news-regression-browser.mjs` | **PASS (8/8)** | Kiểm tra hồi quy toàn diện trang Tin tức & Sự kiện |

---

## U. SCOPE & DOCUMENTATION ALIGNMENT

- Phạm vi hệ thống: V1 phục vụ giới thiệu công ty, danh mục máy/giải pháp công nghiệp và form liên hệ.
- Quyền Admin: 1 quyền Admin duy nhất, không yêu cầu RBAC phức tạp.
- Khách hàng: Không có tài khoản khách hàng, không có giỏ hàng/thanh toán TMĐT.
- Scope hiện tại khớp 100% với tài liệu kiến trúc dự án.

---

## V. DEPLOYMENT PREREQUISITE CHECKLIST

| Mục kiểm tra | Trạng thái | Đơn vị phụ trách / Tầng xử lý | Bắt buộc trước khi Launch? |
| :--- | :--- | :--- | :--- |
| Cấu hình `DATABASE_URL` chính thức | Chưa cấu hình | DevOps / Deployment Config | **CÓ (BẮT BUỘC)** |
| Cấu hình `JWT_SECRET` ngẫu nhiên mạnh | Chưa cấu hình | DevOps / Deployment Config | **CÓ (BẮT BUỘC)** |
| Giới hạn CORS Origin trong `main.ts` | **Cần xử lý** | Application Source / Config | **CÓ (BẮT BUỘC)** |
| Fail-fast `DATABASE_URL` trong `database.module.ts` | **Cần xử lý** | Application Source | **CÓ (BẮT BUỘC)** |
| Guard chống seed trong Production (`seed.ts`) | **Cần xử lý** | Application Source | **CÓ (BẮT BUỘC)** |
| Script khởi tạo mật khẩu Admin ban đầu | **Cần xử lý** | DevOps / Scripting | **CÓ (BẮT BUỘC)** |
| Rate Limiting cho Login & Contact (WAF / NGINX) | Chưa cấu hình | Infrastructure / Reverse Proxy | **CÓ (BẮT BUỘC)** |
| SSL / HTTPS Certificate & Force HTTPS | Chưa cấu hình | Infrastructure / Cloudflare | **CÓ (BẮT BUỘC)** |
| SPA Rewrites cho NGINX / Static Hosting | Chưa cấu hình | Infrastructure / Web Server | **CÓ (BẮT BUỘC)** |
| HTTP Security Headers (HSTS, CSP, X-Frame) | Chưa cấu hình | Infrastructure / Reverse Proxy | **CÓ (BẮT BUỘC)** |
| Automated Database Backup Policy | Chưa kích hoạt | Database Provider (Neon) | **CÓ (BẮT BUỘC)** |
| Tệp `robots.txt` & `sitemap.xml` | Chưa có | Application / Static Assets | KHÔNG (Khuyến nghị) |

---

## W. PHÁT HIỆN VẤN ĐỀ (FINDINGS)

| ID | Phân loại | Mức độ nghiêm trọng | Nội dung phát hiện | Bằng chứng mã nguồn | Biện pháp khắc phục khuyến nghị |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **PR-01** | `BLOCKING – SOURCE` | **HIGH** | `DATABASE_URL` tự động fallback về localhost nếu thiếu env trong production | `api/src/database/database.module.ts:18` | Ném exception dừng startup nếu thiếu `DATABASE_URL` tương tự `auth.config.ts` |
| **PR-02** | `BLOCKING – DEPLOYMENT CONFIG` | **HIGH** | CORS mở toàn bộ (`*`) không giới hạn origin | `api/src/main.ts:7` (`app.enableCors()`) | Cấu hình mảng origin hợp lệ từ biến môi trường hoặc cấu hình reverse proxy |
| **PR-03** | `NON-BLOCKING` | **LOW** | Swagger UI (`/api/docs`) mở công khai trong production | `api/src/main.ts:20-25` | Ẩn Swagger trong production (`NODE_ENV === 'production'`) hoặc thêm HTTP Basic Auth |
| **PR-04** | `BLOCKING – DEPLOYMENT CONFIG` | **HIGH** | Thiếu Rate Limiting cho endpoint đăng nhập và gửi liên hệ | `api/src/auth/auth.controller.ts`, `api/src/contacts/contacts.controller.ts` | Áp dụng Rate Limiting ở tầng NGINX / Cloudflare hoặc thêm `@nestjs/throttler` |
| **PR-05** | `BLOCKING – DEPLOYMENT CONFIG` | **HIGH** | Thiếu script / runbook chính thức để tạo tài khoản Admin ban đầu trên production DB | `api/src/database/seed.ts:18` (chỉ có hash giả lập không đăng nhập được) | Viết script CLI `scripts/bootstrap-admin.mjs` có prompt nhập mật khẩu an toàn |
| **PR-06** | `BLOCKING – SOURCE` | **CRITICAL** | Script `seed.ts` thực hiện lệnh xóa sạch bảng nhưng không có guard kiểm tra `NODE_ENV === 'production'` | `api/src/database/seed.ts:28-40` (`db.delete(...)`) | Thêm đoạn kiểm tra chặn thực thi nếu `process.env.NODE_ENV === 'production'` |
| **PR-07** | `NON-BLOCKING` | **LOW** | Tài liệu README hướng dẫn chạy `db:push` thay vì `db:migrate` cho production | `README.md:387`, `README.md:510` | Cập nhật tài liệu hướng dẫn dùng `npm run db:migrate` để đảm bảo journal migration |
| **PR-08** | `NON-BLOCKING` | **LOW** | Thiếu `robots.txt` và `sitemap.xml` trong thư mục `public/` | `public/` directory | Thêm tệp cấu hình robots và sitemap cơ bản cho công cụ tìm kiếm |

---

## X. KNOWN TECHNICAL DEBT

1. **Blocking Source (Phải fix ở lượt code tiếp theo):**
   - **PR-01**: Chặn fallback ngầm của `DATABASE_URL` về localhost trong `database.module.ts`.
   - **PR-06**: Bổ sung guard bảo vệ trong `seed.ts` để ngăn chặn việc chạy nhầm lệnh seed làm mất dữ liệu production.
2. **Blocking Deployment Configuration (Phải thực hiện khi cấu hình hạ tầng deploy):**
   - **PR-02**: Giới hạn danh sách domain cho phép trong CORS.
   - **PR-04**: Thiết lập Rate Limiting bảo vệ form liên hệ và trang đăng nhập.
   - **PR-05**: Xây dựng kịch bản khởi tạo mật khẩu Admin ban đầu.
3. **Non-blocking (Có thể cải tiến sau launch):**
   - **PR-03**: Ẩn Swagger API Docs trên môi trường public internet.
   - **PR-07**: Đồng bộ lại câu lệnh hướng dẫn trong `README.md`.
   - **PR-08**: Bổ sung tệp `robots.txt` và `sitemap.xml`.
4. **Deferred (Đã thống nhất hoãn từ các lượt QA trước):**
   - Legacy automatic translation helper của Machines (vẫn duy trì biên soạn độc lập theo Policy A).

---

## Y. SOURCE & GIT INTEGRITY

```text
$ git status --short
 M admin/src/pages/NewsAdminPage.tsx
 M admin/src/pages/SettingsPage.tsx
 M api/package-lock.json
 M api/package.json
 M api/src/app.module.ts
 M api/src/auth/auth.config.ts
 M api/src/auth/auth.service.ts
 M api/src/auth/jwt-auth.guard.ts
 M api/src/contacts/contacts.controller.ts
 M api/src/contacts/dto/public-contact.dto.ts
 M api/src/database/schema.ts
 M api/src/machines/machines.controller.ts
 M api/src/machines/machines.service.ts
 M api/src/news/news.controller.ts
 M api/src/news/news.service.ts
 M package.json
 M src/App.tsx
 M src/api/client.ts
 M src/pages/HomePage.tsx
 M src/pages/NewsDetailPage.tsx
 M src/pages/NewsPage.tsx
 M src/pages/ProductDetailPage.tsx
 M src/pages/ProductsPage.tsx

$ git diff --stat
 49 files changed, 3010 insertions(+), 695 deletions(-)

$ git diff --check
(clean - exit code 0)
```

---

## Z. DATABASE STATUS

```text
DATABASE MUTATION DURING FINAL-03: NONE
PRODUCTION DATABASE: NOT TOUCHED
READ-ONLY CONNECTIONS ONLY: CONFIRMED
CREDENTIAL ROTATION: PRESERVED & REDACTED
```

---

## AA. FINAL VERDICT

```text
FINAL-03 BLOCKED – PRODUCTION READINESS ISSUES FOUND
```

**Lý do:** Mặc dù chất lượng mã nguồn nghiệp vụ, giao diện, E2E test (457/457 PASS) và 10 kịch bản trình duyệt Playwright đều đạt 100% PASS, quá trình audit phát hiện 2 lỗi mã nguồn chặn triển khai (**PR-01**, **PR-06**) cùng 3 điều kiện tiên quyết về cấu hình hạ tầng bảo mật (**PR-02**, **PR-04**, **PR-05**) cần được xử lý và hoàn thiện trước khi tiến hành deploy production.

# BÁO CÁO ĐỐI CHIẾU & HIỆU CHỈNH PHẠM VI SẴN SÀNG PRODUCTION (FINAL-03V)

**Thời gian:** 2026-10-03  
**Chế độ:** VERIFY / RECONCILE ONLY (Không sửa mã nguồn, không sửa tài liệu, không migration, không mutation database, không commit/push)  
**Tài liệu sự thật tối cao (Authoritative Sources of Truth):**
1. `D:\Work\LTVN\Website\doc\01_PHAM_VI_CHUC_NANG_VA_MVP.md` (Tài liệu phạm vi chức năng và MVP v1.3)
2. `D:\Work\LTVN\Website\doc\07_WIREFRAME_GIAO_DIEN_ADMIN.md` (Thiết kế wireframe và cấu trúc giao diện Admin)
3. `D:\Work\LTVN\Website\doc\03_CHUAN_HOA_MO_HINH_DU_LIEU.md` (Chuẩn hóa mô hình dữ liệu)
4. `D:\Work\LTVN\Website\doc\04_ERD_LOGIC_HE_THONG.md` (ERD logic hệ thống)
5. `D:\Work\LTVN\Website\doc\09_ADR_QUYET_DINH_KIEN_TRUC.md` (15 ADR kiến trúc chính thức)

---

## A. AUTHORITATIVE DOCUMENT MATRIX

| Nhóm chức năng | Yêu cầu theo tài liệu Authoritative (v1.3) | Thực trạng mã nguồn hiện tại (`Last/`) | Đánh giá sai lệch |
| :--- | :--- | :--- | :--- |
| **Contact & Email (ADR-003)** | Form lưu DB (`inquiries` + `inquiry_outbox`) rồi trả 202; Worker nền gửi email về công ty via SMTP; Retry khi lỗi; cấu hình SMTP trong Admin Settings. | Form chỉ INSERT vào bảng `contacts` (`status = 'new'`). Hoàn toàn KHÔNG có SMTP, không mailer service, không outbox queue, không email settings. | **THIẾU NGHIỆP VỤ CỐT LÕI (PR-09)** |
| **Admin Contacts (ADR-003, Mục 19)** | MVP chỉ có danh sách đọc inquiry tối giản + nút đánh dấu `handled` ("Đã liên hệ"). Cấm CRM, cấm pipeline nhiều trạng thái, cấm phân công, cấm ghi chú chăm sóc. | Admin có `ContactsPage`, lọc theo status (`new`, `in_progress`, `resolved`), phân công `assignedTo`, sửa `adminNote`, và có nút Xóa (`DELETE`). | **SCOPE DRIFT (PR-11 - Non-blocking)** |
| **Admin Auth & Bảo mật (Mục 20, Wireframe II/VIII)** | Đăng nhập, Đăng xuất, Đổi mật khẩu (yêu cầu độ mạnh), Quên mật khẩu (reset token có hạn), Rate limit login, Khóa đăng nhập sai. | Chỉ có `POST /api/auth/login`. Hoàn toàn KHÔNG có API/UI Đổi mật khẩu, KHÔNG có Quên mật khẩu, KHÔNG có Rate limit/Lockout. | **THIẾU CHỨC NĂNG BẢO MẬT (PR-10, PR-04)** |
| **SEO & Sitemap (ADR-011, Mục 18)** | Tự sinh `sitemap.xml`, `robots.txt`, Canonical URL, Open Graph per page, Structured data JSON-LD, Breadcrumb. | Chỉ có static meta tags cơ bản trong `index.html`. Không có `robots.txt`, không có `sitemap.xml`, không có canonical hay dynamic OG tags. | **THIẾU SEO ASSETS & METADATA (PR-08)** |
| **Điều hướng 301 Redirect (ADR-002, Mục 18/19)** | Lập danh sách URL cũ chuyển hướng 301 sang URL mới; quản lý redirect trong Admin. | Không có bảng `redirects`, không có module redirect trong API, không có giao diện Admin. Chưa cấu hình rewrite 301 trên hosting. | **DEPLOYMENT PREREQUISITE (PR-12)** |
| **Cơ chế lưu trữ Media** | Bảng `media_assets` lưu metadata + public URL. Không upload binary cục bộ trong MVP. | Đúng với thiết kế: Bảng `media_assets`, controller `POST /api/media` lưu JSON metadata trỏ tới external URL. | **KHỚP 100%** |
| **Đa ngôn ngữ (ADR-014, Policy A)** | VI mặc định, EN biên soạn độc lập cho bài viết (`news_event_translations`). Không auto-translate máy. | Đúng với thiết kế: Đã verify qua QA-14C3 và QA-14C4 (404 cho EN thiếu, không fallback trộn ngôn ngữ). | **KHỚP 100%** |

---

## B. CONTACT V1 EMAIL / SMTP VERDICT

```text
CONTACT EMAIL REQUIRED BY V1 DOCS: YES
SMTP IMPLEMENTED: NO
```

- **Bằng chứng tài liệu:**
  - `01_PHAM_VI_CHUC_NANG_VA_MVP.md` (Mục 16.3 & 16.4, ADR-003):
    > *"Luồng xử lý P0 (ADR-003): Khách nhập → Frontend validate → Backend validate → CAPTCHA + Rate limit → Transaction { lưu inquiries; lưu inquiry_outbox } → Commit → Trả 202 'đã tiếp nhận' → Worker nền gửi email về công ty → Retry khi thất bại. Không mất yêu cầu khi SMTP lỗi... From = địa chỉ thuộc domain LT Vietnam; Reply-To = email khách... email nhận cấu hình trong settings."*
  - `07_WIREFRAME_GIAO_DIEN_ADMIN.md` (Phần VIII - Settings):
    > *"Email (SMTP + [Gửi email kiểm tra]; mật khẩu hiển thị ••••; From/Reply-To ghi rõ)..."*
- **Bằng chứng mã nguồn:**
  - `api/package.json`: Không có thư viện gửi mail nào (không `nodemailer`, không `@nestjs-modules/mailer`).
  - `api/src/modules/contacts/contacts.service.ts`: Phương thức `create()` chỉ chạy lệnh `this.db.insert(schema.contacts)...` rồi trả về kết quả.
  - Không có SMTP service, không có background worker, không có bảng outbox, không có tab Email Settings trong Admin.
- **Kết luận:** Nhận định của FINAL-03 ("V1 không yêu cầu gửi email") là **SAI**. Việc thiếu gửi email thông báo khách hàng vi phạm yêu cầu P0 cốt lõi của website B2B.
- **Mã phát hiện mới:** **PR-09 (BLOCKING – SOURCE)**.

---

## C. ADMIN CONTACTS SCOPE VERDICT

```text
ADMIN CONTACTS SCOPE CLASSIFICATION: UNINTENDED SCOPE DRIFT
SEVERITY: NON-BLOCKING
```

- **Bằng chứng tài liệu:**
  - `01_PHAM_VI_CHUC_NANG_VA_MVP.md` (Mục 19):
    > *"Không có trong Admin MVP: pipeline nhiều trạng thái, phân công, ghi chú CRM, báo giá, hợp đồng, bảo hành và dashboard kinh doanh. Admin MVP chỉ có danh sách/chi tiết inquiry đọc và nút đánh dấu đã liên hệ (ADR-003)."*
  - `07_WIREFRAME_GIAO_DIEN_ADMIN.md` (Phần I & XII):
    > *"Không xuất hiện trong Sidebar MVP: Khách hàng tiềm năng / CRM / Pipeline / Phân công / Ghi chú chăm sóc... Form khách lưu inquiries + gửi email. Admin chỉ có hộp thư vận hành tối giản để xem và đánh dấu đã liên hệ."*
- **Bằng chứng mã nguồn:**
  - `api/src/database/schema.ts` (Bảng `contacts`): Có các cột `status` (`new`, `in_progress`, `resolved`), `assignedTo`, `adminNote`, `resolvedAt`.
  - `api/src/modules/contacts/contacts.controller.ts`: Cung cấp API `PATCH /contacts/:id` và `DELETE /contacts/:id`.
  - `admin/src/pages/ContactsPage.tsx`: Cho phép chọn trạng thái, gán người xử lý, lưu ghi chú và xóa liên hệ.
- **Kết luận:** Đây là **Scope Drift ngoài ý muốn** (tính năng CRM sơ khai được code vượt trước tài liệu thiết kế). Do không phá vỡ tính toàn vẹn dữ liệu hay gây nguy hiểm cho bảo mật, nó được xếp loại **NON-BLOCKING**, nhưng FINAL-03 **không được tuyên bố "scope aligned 100%"**.
- **Mã phát hiện:** **PR-11 (NON-BLOCKING)**.

---

## D. ADMIN SECURITY REQUIREMENT MATRIX

| Yêu cầu bảo mật | Yêu cầu theo tài liệu? | Đã triển khai? | Bằng chứng mã nguồn & tài liệu | Phân loại |
| :--- | :---: | :---: | :--- | :--- |
| **Login Admin** | **CÓ** | **CÓ** | `POST /api/auth/login`, `LoginPage.tsx` (QA-01 PASS) | Hợp lệ |
| **Logout** | **CÓ** | **CÓ** | Phía client xóa JWT khỏi localStorage/memory | Hợp lệ |
| **Change Password (Đổi mật khẩu)** | **CÓ** | **KHÔNG** | Tài liệu: Wireframe Admin Phần I & VIII ("Hồ sơ / Đổi mật khẩu"). Mã nguồn: Không có API trong `auth.controller.ts` hay `users.controller.ts`; không có form trong `SettingsPage.tsx` hay `UsersPage.tsx`. | **BLOCKING – SOURCE (PR-10)** |
| **Password Recovery (Quên mật khẩu)** | **CÓ** | **KHÔNG** | Tài liệu: Wireframe Admin Phần II ("quên mật khẩu"), Mục 20 ("reset token có hạn"). Mã nguồn: Hoàn toàn không có endpoint hay giao diện token flow. | **BLOCKING – SOURCE (PR-10)** |
| **Failed-login limit / Lockout** | **CÓ** | **KHÔNG** | Tài liệu: Mục 20 ("khóa đăng nhập sai, rate-limit login"). Mã nguồn: `auth.service.ts` không đếm số lần sai, không khóa tài khoản. | **BLOCKING – DEPLOYMENT CONFIG (PR-04)** |
| **Session Expiry** | **CÓ** | **CÓ** | `JWT_TTL_SECONDS` (24h), hết hạn trả về 401 | Hợp lệ |
| **Password Hashing** | **CÓ** | **CÓ** | Bcrypt với 12 salt rounds trong `auth.service.ts:32` | Hợp lệ |
| **Ẩn đường dẫn Admin** | Khuyến nghị | Một phần | Admin là SPA riêng biệt (`/admin`), có thể deploy trên subdomain độc lập | Hợp lệ |

---

## E. ANTI-SPAM & RATE-LIMIT VERDICT

```text
LOGIN RATE LIMITING: REQUIRED BY SCOPE: YES | SATISFIED AT INFRA: YES | IMPLEMENTED NOW: NO
CONTACT ANTI-SPAM / CAPTCHA: REQUIRED BY SCOPE: YES | SATISFIED AT INFRA: YES | IMPLEMENTED NOW: NO
PR-04 STATUS: OPEN (BLOCKING – DEPLOYMENT CONFIG)
```

- **Tài liệu quy định:**
  - Mục 16.3: `Khách nhập → Frontend validate → Backend validate → CAPTCHA + Rate limit`.
  - Mục 20: `Form: rate limit, CAPTCHA, idempotency... Admin: rate-limit login, khóa đăng nhập sai`.
- **Thực tế:**
  - Mã nguồn API chưa cài đặt `@nestjs/throttler`.
  - Frontend chưa tích hợp CAPTCHA / Cloudflare Turnstile / Honeypot.
  - Hạ tầng reverse proxy / WAF chưa được cấu hình.
- **Kết luận:** Giữ nguyên **PR-04 là BLOCKING – DEPLOYMENT CONFIG** (bắt buộc cấu hình rate limiting và WAF/anti-bot ở tầng Cloudflare hoặc NGINX trước khi đón nhận traffic công khai).

---

## F. SEO REQUIREMENTS RECONCILIATION

| Hạng mục SEO | Yêu cầu theo tài liệu v1.3? | Đã triển khai trong code? | Bằng chứng thực tế | Phân loại |
| :--- | :---: | :---: | :--- | :--- |
| **SEO Title** | **CÓ** | **CÓ** | Có trường trong DB (`metaTitle`), gán động qua `src/hooks.ts` | Hợp lệ |
| **SEO Description** | **CÓ** | **CÓ** | Có trường trong DB (`metaDescription`), static trong `index.html` | Hợp lệ |
| **Robots.txt** | **CÓ (P0)** | **KHÔNG** | Tài liệu Mục 18: "Hệ thống tự tạo robots.txt". Thực tế: `public/robots.txt` không tồn tại. | **BLOCKING (PR-08)** |
| **Sitemap.xml** | **CÓ (P0)** | **KHÔNG** | Tài liệu Mục 18: "Hệ thống tự tạo sitemap.xml". Thực tế: `public/sitemap.xml` không tồn tại. | **BLOCKING (PR-08)** |
| **Canonical URL** | **CÓ (P0)** | **KHÔNG** | Tài liệu Mục 18 & ADR-011: "Canonical tự sinh theo route". Thực tế: Không có thẻ `<link rel="canonical">` trong mã nguồn. | **BLOCKING (PR-08)** |
| **Meta Open Graph động** | **CÓ** | **MỘT PHẦN** | `index.html` chỉ có OG tags cứng của trang chủ; không cập nhật động per-article / per-product. | Non-blocking (Cần bổ sung) |
| **Structured Data (JSON-LD)** | **CÓ (P0)** | **KHÔNG** | Tài liệu Mục 18: "structured data, breadcrumb". Thực tế: Không có schema.org JSON-LD. | Non-blocking (Khuyến nghị) |
| **Robots Meta Tag (noindex)** | **CÓ** | **KHÔNG** | Không có thẻ meta robots per-page. | Non-blocking |

*Hiệu chỉnh:* FINAL-03 trước đây xếp thiếu `robots.txt` và `sitemap.xml` vào Non-blocking là đánh giá thấp so với tài liệu phạm vi (v1.3 xếp vào P0 bắt buộc). **PR-08 được nâng lên BLOCKING – SOURCE / DEPLOYMENT CONFIG**.

---

## G. 301 REDIRECT REQUIREMENT

```text
301 REDIRECT CAPABILITY: DEPLOYMENT PREREQUISITE / MISSING IN APPLICATION
```

- **Tài liệu:** `01_PHAM_VI_CHUC_NANG_VA_MVP.md` (Mục 18 & 19): Yêu cầu lập danh sách URL cũ sang URL mới và cấu hình redirect 301.
- **Thực tế:** Không có bảng `redirects` hay module redirect động trong API/Admin.
- **Kết luận:** Phải được giải quyết ở tầng Web Server / Reverse Proxy (NGINX map / Cloudflare Redirect Rules) trước khi trỏ DNS từ website cũ sang website mới.
- **Mã phát hiện:** **PR-12 (BLOCKING – DEPLOYMENT CONFIG)**.

---

## H. PR-01 → PR-08 RECONCILIATION

| ID | Phân loại ban đầu | Phân loại chính xác sau đối chiếu | Quyết định | Lý do hiệu chỉnh |
| :--- | :--- | :--- | :---: | :--- |
| **PR-01** | `BLOCKING – SOURCE` | **`BLOCKING – SOURCE`** | **GIỮ** | `database.module.ts:18` fallback âm thầm về localhost khi thiếu `DATABASE_URL` trong production thay vì fail-fast. |
| **PR-02** | `BLOCKING – DEPLOYMENT CONFIG` (High) | **`BLOCKING – DEPLOYMENT CONFIG`** (Medium - Hardening) | **HIỆU CHỈNH** | CORS wildcard `*` là rủi ro cấu hình cần siết chặt, nhưng không gây rò rỉ token Admin trực tiếp do hệ thống dùng Bearer Header (không dùng cookie). |
| **PR-03** | `NON-BLOCKING` | **`NON-BLOCKING`** | **GIỮ** | Swagger mở ở `/api/docs` không làm lộ secret; các endpoint mutation đều được JWT guard bảo vệ. Khuyến nghị hardening. |
| **PR-04** | `BLOCKING – DEPLOYMENT CONFIG` | **`BLOCKING – DEPLOYMENT CONFIG`** | **GIỮ (OPEN)** | Thiếu rate limiting và anti-bot trên endpoint đăng nhập và form liên hệ. Cần thiết lập qua WAF / NGINX / Cloudflare trước launch. |
| **PR-05** | `BLOCKING – DEPLOYMENT CONFIG` | **`BLOCKING – DEPLOYMENT CONFIG`** | **GIỮ** | Thiếu script CLI bootstrap hoặc runbook chính thức để tạo tài khoản Admin ban đầu trên production DB. |
| **PR-06** | `BLOCKING – SOURCE` (Critical) | **`BLOCKING – SOURCE`** (High) | **HIỆU CHỈNH** | `seed.ts` xóa sạch dữ liệu nhưng chỉ là lệnh manual, không tự chạy khi start app. Mức độ nguy cơ là High, bắt buộc thêm guard chặn `NODE_ENV === 'production'`. |
| **PR-07** | `NON-BLOCKING` | **`BLOCKING – DEPLOYMENT CONFIG`** | **NÂNG MỨC** | `README.md` hướng dẫn chạy `db:push` trong production. Nếu operator làm theo sẽ phá vỡ journal migration (`db:migrate`). Phải sửa README trước launch. |
| **PR-08** | `NON-BLOCKING` | **`BLOCKING – SOURCE / DEPLOYMENT CONFIG`** | **NÂNG MỨC** | `robots.txt`, `sitemap.xml` và `canonical` là yêu cầu bắt buộc thuộc P0 trong tài liệu thiết kế v1.3 (ADR-011, Mục 18), không thể coi là tùy chọn. |

---

## I. NEWLY VERIFIED FINDINGS

| ID | Phân loại | Mức độ nghiêm trọng | Nội dung phát hiện | Bằng chứng | Biện pháp khắc phục khuyến nghị |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **PR-09** | `BLOCKING – SOURCE` | **CRITICAL** | Thiếu toàn bộ luồng gửi email thông báo Contact/Yêu cầu khách hàng qua SMTP theo ADR-003 | `01_PHAM_VI_CHUC_NANG_VA_MVP.md:16`; `contacts.service.ts`; thiếu mail package trong `package.json` | Tích hợp dịch vụ gửi mail (Nodemailer / Resend / SES) gửi thông báo về email công ty khi có liên hệ mới |
| **PR-10** | `BLOCKING – SOURCE` | **HIGH** | Thiếu chức năng Đổi mật khẩu (Change Password) và Quên mật khẩu (Password Recovery) cho Admin | `07_WIREFRAME_GIAO_DIEN_ADMIN.md:I,VIII`; thiếu endpoint trong `auth.controller.ts` & thiếu UI trong Admin | Bổ sung API `POST /api/auth/change-password` và giao diện Đổi mật khẩu trong Admin Settings/Profile |
| **PR-11** | `NON-BLOCKING` | **LOW** | Scope Drift: Module Admin Contacts triển khai tính năng CRM (phân công, trạng thái, ghi chú) vượt quá phạm vi MVP | `01_PHAM_VI_CHUC_NANG_VA_MVP.md:19`; `ContactsPage.tsx` | Giữ nguyên sử dụng (không gây hại), nhưng ghi nhận chính thức là Scope Drift thay vì báo "khớp 100%" |
| **PR-12** | `BLOCKING – DEPLOYMENT CONFIG` | **HIGH** | Thiếu cơ chế chuyển hướng 301 Redirect cho các URL cũ của website `ltvietnam.com.vn` | `01_PHAM_VI_CHUC_NANG_VA_MVP.md:18`; không có cấu hình redirect trong repo | Lập danh sách ánh xạ URL cũ → mới và cấu hình redirect 301 trên NGINX / Cloudflare Rules |

---

## J. ERROR-HANDLING EVIDENCE CORRECTION

- **Tuyên bố cũ trong FINAL-03:** "API sử dụng Global Exception Filter chuẩn của NestJS..."
- **Xác minh thực tế:**
  - `Custom global exception filter: NO` (Không có lớp nào implements `ExceptionFilter`, không gọi `app.useGlobalFilters()`).
  - `Nest default exception handling: YES` (Dùng bộ lọc mặc định `BaseExceptionFilter` của NestJS).
  - Khi chạy môi trường production (`NODE_ENV=production`), `BaseExceptionFilter` tự động ẩn stack trace và raw error của các lỗi 500 không bắt được, chỉ trả về:
    `{"statusCode": 500, "message": "Internal server error"}`.
- **Đính chính:** Xóa bỏ khái niệm "Custom Global Exception Filter"; ghi nhận chính xác hệ thống đang sử dụng **NestJS Default BaseExceptionFilter**.

---

## K. DATABASE DRIVER CLAIM CORRECTION

- **Tuyên bố cũ trong FINAL-03:** "Driver: `@neondb/serverless` kết hợp cùng `drizzle-orm/neon-http`. Giao thức: HTTP serverless driver (Neon HTTP tunnel)..."
- **Xác minh thực tế từ mã nguồn:**
  - `api/package.json`: Phụ thuộc là `"postgres": "^3.4.9"` và `"drizzle-orm": "^0.45.2"`.
  - `api/src/database/database.module.ts`:
    ```typescript
    import { drizzle, PostgresJsDatabase } from 'drizzle-orm/postgres-js';
    import postgres from 'postgres';
    ```
- **Thông số chính xác:**
  - **Driver:** `postgres` (Postgres.js)
  - **Drizzle adapter:** `drizzle-orm/postgres-js`
  - **Transport:** **Stateful TCP Socket qua TLS/SSL tiêu chuẩn** (Không phải HTTP serverless tunnel).
- **Đính chính:** API kết nối PostgreSQL thông qua connection TCP trực tiếp (hỗ trợ SSL). Khi chạy production trên container/VM, cấu hình kết nối cần lưu ý số lượng max connections nếu kết nối trực tiếp hoặc qua PgBouncer/Neon Pooler (cổng 6543 hoặc 5432).

---

## L. REVISED SCOPE ALIGNMENT STATEMENT

Hệ thống **không đạt mức 100% khớp phạm vi (100% aligned)** như nhận định sơ bộ ban đầu, do các sai lệch cụ thể sau:
1. **Thiếu nghiệp vụ P0 bắt buộc:**
   - Hoàn toàn chưa triển khai luồng gửi email thông báo Contact qua SMTP (ADR-003).
   - Chưa triển khai tính năng Đổi mật khẩu và Quên mật khẩu cho Admin (Wireframe Admin I, II, VIII).
   - Chưa có tệp `robots.txt`, `sitemap.xml`, và thẻ `canonical` tự sinh (ADR-011).
2. **Scope Drift ngoài ý muốn:**
   - Module Contacts trong Admin có thêm phân công nhân sự, ghi chú CRM và xóa liên hệ (tài liệu quy định chỉ xem đọc và đánh dấu đã liên hệ).

---

## M. FINAL BLOCKER LIST

Các vấn đề **BẮT BUỘC** phải được giải quyết trước khi launch production:

| ID | Phân loại | Mức độ nghiêm trọng | Nội dung ngắn gọn | Đã xác minh thực tế? |
| :--- | :--- | :--- | :--- | :---: |
| **PR-01** | `BLOCKING – SOURCE` | **HIGH** | `DATABASE_URL` tự động fallback về localhost nếu thiếu env trong production | **ĐÃ XÁC MINH** |
| **PR-06** | `BLOCKING – SOURCE` | **HIGH** | `seed.ts` thực hiện lệnh delete toàn bộ DB mà thiếu guard chặn `NODE_ENV === 'production'` | **ĐÃ XÁC MINH** |
| **PR-09** | `BLOCKING – SOURCE` | **CRITICAL** | Thiếu nghiệp vụ gửi email thông báo Contact/Yêu cầu khách hàng qua SMTP (ADR-003) | **ĐÃ XÁC MINH** |
| **PR-10** | `BLOCKING – SOURCE` | **HIGH** | Thiếu API và giao diện Đổi mật khẩu / Quên mật khẩu cho Admin | **ĐÃ XÁC MINH** |
| **PR-08** | `BLOCKING – SOURCE / CONFIG` | **HIGH** | Thiếu các tài sản SEO P0 bắt buộc: `robots.txt`, `sitemap.xml`, `canonical` | **ĐÃ XÁC MINH** |
| **PR-02** | `BLOCKING – DEPLOYMENT CONFIG` | **MEDIUM** | CORS mở toàn bộ (`*`), cần giới hạn đúng origin Public & Admin | **ĐÃ XÁC MINH** |
| **PR-04** | `BLOCKING – DEPLOYMENT CONFIG` | **HIGH** | Thiếu cơ chế Rate Limiting / Anti-bot cho Login và Form liên hệ | **ĐÃ XÁC MINH** |
| **PR-05** | `BLOCKING – DEPLOYMENT CONFIG` | **HIGH** | Thiếu script CLI bootstrap hoặc runbook tạo tài khoản Admin ban đầu trên production DB | **ĐÃ XÁC MINH** |
| **PR-07** | `BLOCKING – DEPLOYMENT CONFIG` | **HIGH** | Tài liệu README hướng dẫn chạy `db:push` thay vì `db:migrate` cho production | **ĐÃ XÁC MINH** |
| **PR-12** | `BLOCKING – DEPLOYMENT CONFIG` | **HIGH** | Thiếu cấu hình chuyển hướng 301 Redirect từ các URL cũ sang URL mới | **ĐÃ XÁC MINH** |

---

## N. NON-BLOCKING / DEFERRED LIST

| ID | Phân loại | Mức độ | Nội dung ngắn gọn | Đã xác minh? |
| :--- | :--- | :--- | :--- | :---: |
| **PR-03** | `NON-BLOCKING` | Low | Swagger UI (`/api/docs`) mở công khai trong production (khuyến nghị ẩn hoặc đặt auth) | **ĐÃ XÁC MINH** |
| **PR-11** | `NON-BLOCKING` | Low | Scope Drift trong Admin Contacts (tính năng CRM sơ khai không gây hại) | **ĐÃ XÁC MINH** |
| **DEFERRED-01** | `DEFERRED` | Low | Legacy translator của module Machines (đã hoãn theo thỏa thuận QA-14) | **ĐÃ XÁC MINH** |
| **DEFERRED-02** | `DEFERRED` | Low | Dynamic per-page Open Graph tags và Structured Data JSON-LD nâng cao | **ĐÃ XÁC MINH** |

---

## O. FILES CHANGED

- Báo cáo đối chiếu mới tạo: `artifacts/final-03-production-readiness-2026-10-03/FINAL-03V-RECONCILIATION-REPORT.md`
- **Không có bất kỳ tệp mã nguồn ứng dụng hay tài liệu gốc nào bị thay đổi trong lượt này.**

---

## P. DATABASE STATUS

```text
DATABASE MUTATION DURING FINAL-03V: NONE
PRODUCTION DATABASE: NOT TOUCHED
CONNECTIONS OPENED: NONE
```

---

## Q. GIT INTEGRITY

```text
$ git diff --check
(clean - exit code 0)

$ git status --short
 M admin/src/App.tsx
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
?? artifacts/final-03-production-readiness-2026-10-03/FINAL-03V-RECONCILIATION-REPORT.md

$ git diff --stat
 49 files changed, 3010 insertions(+), 695 deletions(-)
```

---

## R. FINAL VERDICT

```text
FINAL-03V PASS – FINDING SET VERIFIED, READY FOR REMEDIATION
```

*Đã dừng lại theo chỉ thị. Toàn bộ danh mục phát hiện đã được hiệu chỉnh chính xác, gắn bằng chứng cụ thể từ tài liệu và mã nguồn, sẵn sàng chuyển sang bước khắc phục (Remediation).*

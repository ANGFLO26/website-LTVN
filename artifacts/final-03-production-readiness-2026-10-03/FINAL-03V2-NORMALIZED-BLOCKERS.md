# BÁO CÁO CHUẨN HÓA & KHÓA DANH MỤC BLOCKER PRODUCTION (FINAL-03V2)

**Thời gian:** 2026-10-03  
**Chế độ:** VERIFY / RECONCILE ONLY (Không sửa mã nguồn, không sửa tài liệu, không database, không migration, không commit/push/deploy)  
**Mục tiêu:** Hiệu chỉnh 4 điểm chưa nhất quán, tách bạch tuyệt đối các layer (SOURCE vs DEPLOYMENT CONFIG), khóa architecture contract chuẩn bị cho bước Remediation.

---

## A. PR-04 SPLIT VERDICT: TÁCH BIỆT ACCOUNT LOCKOUT VÀ RATE LIMITING

Quá trình đối chiếu tài liệu `01_PHAM_VI_CHUC_NANG_VA_MVP.md` (Mục 20) và `07_WIREFRAME_GIAO_DIEN_ADMIN.md` (Phần II & VIII) cho thấy hai yêu cầu bảo mật này có ngữ nghĩa (semantics) và tầng thực thi hoàn toàn khác nhau:

### 1. PR-04A — Login Account Lockout (Khóa tài khoản theo số lần đăng nhập sai)
- **Required by docs:** **CÓ (YES)**.
  - Mục 20: *"khóa đăng nhập sai"*.
  - Wireframe Admin Phần II: *"sai thông tin, khóa, gửi quá nhiều"*.
  - Wireframe Admin Phần VIII: *"số lần sai, thời gian khóa"*.
- **Implemented in application:** **KHÔNG (NO)**.
  - [auth.service.ts](file:///d:/Work/LTVN/Last/api/src/modules/auth/auth.service.ts) không lưu trạng thái số lần đăng nhập sai (`failedAttempts`), không có trường khóa tài khoản (`lockedUntil`).
- **Can infrastructure alone satisfy exact requirement:** **KHÔNG (NO)**.
  - Cloudflare / NGINX chỉ có thể giới hạn request rate theo địa chỉ IP. Nếu kẻ tấn công xoay vòng IP (proxy/botnet) hoặc nhiều nhân viên cùng IP công ty, hạ tầng mạng không thể tự khóa đúng tài khoản người dùng trên hệ thống.
- **Layer:** **`BLOCKING – SOURCE`**.
- **Remediation:** Thêm trường `failedAttempts` và `lockedUntil` vào bảng `users` (hoặc in-memory/cache store), tăng biến đếm khi password sai, khóa tài khoản tạm thời khi vượt ngưỡng.

### 2. PR-04B — Network & Request Rate Limiting / Anti-bot
- **Required by docs:** **CÓ (YES)**.
  - Mục 16.3: *"CAPTCHA + Rate limit"* trên form gửi yêu cầu.
  - Mục 20: *"rate-limit login"*.
- **Implemented in application:** **KHÔNG (NO)**.
  - API chưa cài đặt `@nestjs/throttler`; Frontend chưa tích hợp CAPTCHA / Cloudflare Turnstile / Honeypot.
- **Can infrastructure alone satisfy exact requirement:** **CÓ (YES)**.
  - Có thể đáp ứng đầy đủ và tối ưu nhất ở tầng Reverse Proxy / Edge (Cloudflare WAF Rate Limiting Rules, Cloudflare Turnstile, NGINX `limit_req_zone`).
- **Layer:** **`BLOCKING – DEPLOYMENT CONFIG`**.

---

## B. PR-08 EXACT SEO P0 MATRIX & RECONCILIATION

Đối chiếu trực tiếp với `01_PHAM_VI_CHUC_NANG_VA_MVP.md` (Mục 18) và `09_ADR_QUYET_DINH_KIEN_TRUC.md` (ADR-011):

| Hạng mục SEO | Mức ưu tiên trong Docs | Bắt buộc cho MVP? | Đã triển khai? | Bằng chứng thực tế | Phân loại chuẩn hóa |
| :--- | :---: | :---: | :---: | :--- | :--- |
| **SEO Title** | P0 | **CÓ** | **CÓ** | Lưu trong DB (`metaTitle`), gán động qua `src/hooks.ts` | **PASS** |
| **SEO Description** | P0 | **CÓ** | **MỘT PHẦN** | Lưu trong DB (`metaDescription`), nhưng client SPA chưa gắn dynamic tag vào `<head>` | **PR-08B (BLOCKING – SOURCE)** |
| **Robots.txt** | P0 | **CÓ** | **KHÔNG** | Mục 18: *"Hệ thống tự tạo robots.txt"*. Tệp `public/robots.txt` không tồn tại | **PR-08A (BLOCKING – SOURCE)** |
| **Sitemap.xml** | P0 | **CÓ** | **KHÔNG** | Mục 18: *"Hệ thống tự tạo sitemap.xml"*. Tệp `public/sitemap.xml` không tồn tại | **PR-08A (BLOCKING – SOURCE)** |
| **Canonical URL** | P0 | **CÓ** | **KHÔNG** | ADR-011: *"Canonical tự sinh theo route"*. Client SPA không render `<link rel="canonical">` | **PR-08B (BLOCKING – SOURCE)** |
| **Robots Meta Tag (noindex)** | P0 | **CÓ** | **KHÔNG** | ADR-011: Quy tắc noindex cho filter/search/draft/admin. Hiện không có thẻ `<meta name="robots">` | **PR-08B (BLOCKING – SOURCE)** |
| **Open Graph per page** | P0 | **CÓ** | **MỘT PHẦN** | ADR-011: Social image theo fallback chain. Hiện chỉ có OG tag cứng trong `index.html` | **PR-08B (BLOCKING – SOURCE)** |
| **Structured Data (JSON-LD)** | P0 (Phụ trợ) | Khuyến nghị | **KHÔNG** | Mục 18 nhắc đến structured data cho rich snippet | **PR-08C (NON-BLOCKING)** |
| **Breadcrumb Schema** | P0 (Phụ trợ) | Khuyến nghị | **KHÔNG** | Mục 18 nhắc đến breadcrumb | **PR-08C (NON-BLOCKING)** |

*Chuẩn hóa PR-08 thành 2 blocker nguồn rõ ràng, loại bỏ hoàn toàn nhãn lai:*
- **PR-08A (`BLOCKING – SOURCE`):** Bổ sung 2 file cốt lõi `public/robots.txt` và `public/sitemap.xml`.
- **PR-08B (`BLOCKING – SOURCE`):** Bổ sung quản lý thẻ head động trên Client SPA (`canonical`, `robots`, dynamic `description`, dynamic `og:tags`).

---

## C. PR-12 REDIRECT CAPABILITY VERDICT

Đối chiếu `01_PHAM_VI_CHUC_NANG_VA_MVP.md` (Mục 18, 19) và `07_WIREFRAME_GIAO_DIEN_ADMIN.md` (Phần I, VIII):

```text
301 RUNTIME REDIRECT REQUIRED: YES
ADMIN REDIRECT CRUD REQUIRED IN MVP: YES
CURRENT RUNTIME CAPABILITY: NONE
CURRENT ADMIN CAPABILITY: NONE
```

- **Phân định rõ 2 trách nhiệm:**
  1. **PR-12A — Runtime 301 Redirect for Legacy URLs (`BLOCKING – DEPLOYMENT CONFIG`):**
     - Bản thân website `ltvietnam.com.vn` đang có traffic và backlink cũ. Trước khi trỏ DNS sang hệ thống mới, bắt buộc phải có bảng ánh xạ 301 redirect trên Web Server / NGINX / Cloudflare Rules để bảo toàn thứ hạng tìm kiếm và tránh đứt gãy link người dùng.
  2. **PR-12B — Admin In-App Redirect Management CRUD (`BLOCKING – SOURCE`):**
     - Tài liệu MVP (Mục 19 & Wireframe VIII) yêu cầu Admin có màn hình quản lý Redirect (URL cũ, URL mới, loại 301/302, kiểm tra loop/chain). Hiện tại API chưa có bảng `redirects` và Admin chưa có màn hình này.

---

## D. PR-09 EXACT ADR-003 CONTRACT (TRANSACTIONAL OUTBOX)

Khóa hợp đồng kiến trúc bất biến cho nghiệp vụ gửi yêu cầu khách hàng:

```text
Contact persistence table:   contacts (hoặc inquiries theo schema)
Outbox required:             CÓ (contact_outbox / inquiry_outbox)
Atomic DB transaction:       BẮT BUỘC (BEGIN -> INSERT contact + INSERT outbox -> COMMIT)
HTTP success status:         HTTP 202 Accepted (sau khi commit DB thành công)
Background worker:           BẮT BUỘC (Quét outbox gửi email qua SMTP định kỳ / async)
Retry required:              BẮT BUỘC (Exponential backoff / max retries, chuyển failed khi vượt ngưỡng)
SMTP configuration:          BẮT BUỘC (Cấu hình Host, Port, User, Pass, From, To)
Admin test-email:            BẮT BUỘC (Hành động kiểm tra kết nối SMTP từ trang Cài đặt)
Failure semantics:           AT-LEAST-ONCE. Lỗi SMTP KHÔNG BAO GIỜ làm mất liên hệ của khách hàng.
```

*Quy tắc Remediation:* Khắc phục PR-09 **tuyệt đối không được** chỉ là gọi thư viện gửi mail trực tiếp ngay sau lệnh INSERT trong Controller. Bắt buộc phải triển khai mô hình **Transactional Outbox** hoặc hàng đợi nền an toàn đúng chuẩn ADR-003.

---

## E. PR-10 REMEDIATION SPLIT RECOMMENDATION

Tách bạch quy trình bảo mật quản trị viên thành 2 tiểu mục độc lập:

1. **PR-10A — Admin Change Password (`BLOCKING – SOURCE`):**
   - Luồng có xác thực (Authenticated).
   - Yêu cầu mật khẩu hiện tại (`currentPassword`) + mật khẩu mới (`newPassword`).
   - Kiểm tra bcrypt mật khẩu cũ, kiểm tra độ mạnh mật khẩu mới, cập nhật hash mới, thu hồi token cũ.
2. **PR-10B — Admin Password Recovery (`BLOCKING – SOURCE`):**
   - Luồng không có xác thực (Unauthenticated).
   - Yêu cầu endpoint yêu cầu reset qua email, sinh token ngẫu nhiên mã hóa có hạn dùng ngắn (`expiresAt`), gửi link qua email (phụ thuộc hạ tầng mail của PR-09), và endpoint xác thực token để đặt mật khẩu mới.

---

## F. FINAL NORMALIZED BLOCKER TABLE

Tất cả các blocker đã được chuẩn hóa vào đúng **một layer duy nhất**:

| ID | Layer | Mức độ nghiêm trọng | Yêu cầu chuẩn xác | Lỗ hổng / Khoảng cách hiện tại | Đơn vị phụ trách xử lý |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **PR-01** | `BLOCKING – SOURCE` | **HIGH** | Fail-fast khi thiếu `DATABASE_URL` trong production | Fallback ngầm về localhost trong `database.module.ts:18` | Backend Engineer |
| **PR-06** | `BLOCKING – SOURCE` | **HIGH** | Guard chặn chạy lệnh seed trên database production | `seed.ts` xóa sạch các bảng mà không kiểm tra `NODE_ENV` | Backend Engineer |
| **PR-09** | `BLOCKING – SOURCE` | **CRITICAL** | Transactional Outbox & SMTP worker gửi email liên hệ (ADR-003) | Chưa có bảng outbox, không có SMTP worker, chỉ insert DB | Backend Engineer |
| **PR-10A** | `BLOCKING – SOURCE` | **HIGH** | API & Giao diện Đổi mật khẩu cho Admin (có xác thực mật khẩu cũ) | Thiếu API trong `auth.controller.ts` và thiếu form trong Admin | Fullstack Engineer |
| **PR-10B** | `BLOCKING – SOURCE` | **HIGH** | API & Giao diện Quên mật khẩu / Reset token flow qua email | Hoàn toàn chưa có endpoint reset token và UI quên mật khẩu | Fullstack Engineer |
| **PR-04A** | `BLOCKING – SOURCE` | **HIGH** | Khóa tài khoản sau N lần đăng nhập sai (Account Lockout) | `auth.service.ts` không đếm số lần sai, không khóa tài khoản | Backend Engineer |
| **PR-08A** | `BLOCKING – SOURCE` | **HIGH** | Cung cấp 2 tệp SEO gốc: `robots.txt` và `sitemap.xml` | Thư mục `public/` chưa có `robots.txt` và `sitemap.xml` | Frontend / DevOps |
| **PR-08B** | `BLOCKING – SOURCE` | **HIGH** | Quản lý thẻ head động: `canonical`, `robots` noindex, dynamic OG | Client SPA chỉ có thẻ tĩnh trong `index.html` | Frontend Engineer |
| **PR-12B** | `BLOCKING – SOURCE` | **HIGH** | Quản lý 301 Redirect trong Admin (API + Bảng DB + Giao diện) | Chưa có bảng `redirects`, chưa có API và UI quản trị redirect | Fullstack Engineer |
| **PR-02** | `BLOCKING – DEPLOYMENT CONFIG` | **MEDIUM** | Siết chặt CORS origin chỉ cho phép domain Public & Admin | `main.ts:7` mở `app.enableCors()` toàn bộ (`*`) | Backend / DevOps |
| **PR-04B** | `BLOCKING – DEPLOYMENT CONFIG` | **HIGH** | Rate Limiting & Anti-bot cho Login và Contact form | Chưa cấu hình WAF / Cloudflare Turnstile / NGINX rate limit | DevOps Engineer |
| **PR-05** | `BLOCKING – DEPLOYMENT CONFIG` | **HIGH** | Runbook & CLI bootstrap tạo Admin ban đầu trên production DB | Seed chỉ có dummy hash; thiếu script tạo Admin an toàn | DevOps Engineer |
| **PR-07** | `BLOCKING – DEPLOYMENT CONFIG` | **HIGH** | Tài liệu README hướng dẫn chạy `db:migrate` thay vì `db:push` | `README.md` dòng 387 và 510 hướng dẫn chạy `db:push` | Tech Lead / Docs |
| **PR-12A** | `BLOCKING – DEPLOYMENT CONFIG` | **HIGH** | Cấu hình ánh xạ 301 Redirect runtime cho URL cũ trước khi trỏ DNS | Chưa có cấu hình redirect map trên Reverse Proxy / NGINX | DevOps Engineer |

---

## G. NON-BLOCKING / DEFERRED TABLE

| ID | Phân loại | Mức độ | Nội dung chi tiết | Đã xác minh? |
| :--- | :--- | :--- | :--- | :---: |
| **PR-03** | `NON-BLOCKING` | Low | Swagger UI (`/api/docs`) mở công khai trong production (khuyến nghị ẩn hoặc đặt HTTP Basic Auth) | **ĐÃ XÁC MINH** |
| **PR-08C** | `NON-BLOCKING` | Low | Schema Structured Data JSON-LD (Organization, Breadcrumb) cho rich snippet Google | **ĐÃ XÁC MINH** |
| **PR-11** | `NON-BLOCKING` | Low | Scope Drift: Module Admin Contacts có thêm tính năng CRM (phân công, ghi chú, xóa) | **ĐÃ XÁC MINH** |
| **DEFERRED-01** | `DEFERRED` | Low | Legacy auto-translator của module Machines (đã hoãn theo thỏa thuận QA-14, biên soạn độc lập) | **ĐÃ XÁC MINH** |
| **DEFERRED-02** | `DEFERRED` | Low | Advanced content video block embeds và video validation sâu | **ĐÃ XÁC MINH** |

---

## H. FILES CHANGED

- Báo cáo chuẩn hóa blocker: `artifacts/final-03-production-readiness-2026-10-03/FINAL-03V2-NORMALIZED-BLOCKERS.md`
- **Tuyệt đối không thay đổi bất kỳ tệp mã nguồn ứng dụng hay tài liệu gốc nào.**

---

## I. DATABASE STATUS

```text
DATABASE MUTATION DURING FINAL-03V2: NONE
DATABASE CONNECTIONS: NONE
PRODUCTION DATABASE: NOT TOUCHED
```

---

## J. GIT INTEGRITY

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
?? artifacts/final-03-production-readiness-2026-10-03/FINAL-03V2-NORMALIZED-BLOCKERS.md

$ git diff --stat
 49 files changed, 3010 insertions(+), 695 deletions(-)
```

---

## K. FINAL VERDICT

```text
FINAL-03V2 PASS – BLOCKER SET LOCKED, READY FOR REMEDIATION
```

*Đã dừng lại theo chỉ thị. Danh mục blocker đã được khóa chuẩn xác, phân định tầng rành mạch và sẵn sàng cho đợt remediation tiếp theo.*

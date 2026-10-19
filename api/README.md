<div align="center">

<img src="../public/images/brand/ltv-logo.png" alt="LT Việt Nam Logo" width="76" />

# LT VIỆT NAM — BACKEND REST API & SEO ENGINE
### NestJS 12 • Drizzle ORM • PostgreSQL • Cloudflare Turnstile

[![NestJS](https://img.shields.io/badge/NestJS-12.0-E0234E?style=flat-square&logo=nestjs&logoColor=white)](https://nestjs.com/)
[![TypeScript](https://img.shields.io/badge/TypeScript-6.0-3178C6?style=flat-square&logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![Drizzle ORM](https://img.shields.io/badge/Drizzle_ORM-0.45-C5F74F?style=flat-square&logo=drizzle&logoColor=black)](https://orm.drizzle.team/)
[![Vitest](https://img.shields.io/badge/Vitest-4.1-6E9F18?style=flat-square&logo=vitest&logoColor=white)](https://vitest.dev/)

</div>

---

## 1. Giới Thiệu Phân Hệ Backend (`api/`)

Phân hệ Backend cung cấp RESTful API, xác thực phân quyền quản trị (`RBAC`), xử lý hàng đợi gửi email (`Transactional Outbox`), điều hướng `HTTP 301` động và kết xuất `Dynamic SSR SEO Metadata Shell` cho hệ thống **LT Việt Nam Technology Co., Ltd**.

### Các Module Nghiệp Vụ Chính

| Module | Đường dẫn | Chức năng chính |
| :--- | :--- | :--- |
| **`AuthModule`** | `src/modules/auth/` | Đăng nhập JWT (`tokenVersion`), khóa tài khoản tạm thời khi sai mật khẩu, đổi mật khẩu & khôi phục mật khẩu qua email. |
| **`UsersModule`** | `src/modules/users/` | Quản lý tài khoản quản trị viên (`admin` / `editor`), bảo vệ chống tự khóa/hạ quyền tài khoản đang đăng nhập. |
| **`MachinesModule`** | `src/modules/machines/` | CRUD thiết bị phân tích dầu khí & van công nghiệp cùng thông số kỹ thuật, ứng dụng, điểm nổi bật, thư viện ảnh và liên kết tiêu chuẩn. |
| **`StandardsModule`** | `src/modules/standards/` | Quản lý danh mục tiêu chuẩn quốc tế (`ASTM`, `ISO`, `IP`, `EN`, `TCVN`) và ánh xạ thiết bị tương ứng. |
| **`MediaModule`** | `src/modules/media/` | Quản lý kho hình ảnh thiết bị, sự kiện và kiểm tra ràng buộc khóa ngoại trước khi xóa. |
| **`NewsEventsModule`** | `src/modules/news-events/` | Quản lý bài viết kỹ thuật & sự kiện với cấu trúc khối nội dung (`contentBlocks`) và bản dịch song ngữ (`news_event_translations`). |
| **`ContactsModule`** | `src/modules/contacts/` | Tiếp nhận yêu cầu báo giá/tư vấn, phân công nhân sự phụ trách (`assignedTo`) và xử lý hàng đợi gửi email qua `ContactOutboxWorker`. |
| **`RedirectsModule`** | `src/modules/redirects/` | Quản lý và thực thi chuyển hướng `301` động, ngăn chặn Open Redirect, vòng lặp (`A -> B -> A`) và chuỗi chuyển hướng. |
| **`SettingsModule`** | `src/modules/settings/` | Quản lý cấu hình SMTP động, mã hóa mật khẩu bằng `AES-256-GCM` và gửi email kiểm tra kết nối. |
| **`SeoModule`** | `src/modules/seo/` | Sinh `/sitemap.xml`, `/robots.txt` và kết xuất HTML Metadata Shell (`OpenGraph`, `JSON-LD`) cho trang sản phẩm & bài viết. |
| **`SecurityModule`** | `src/modules/security/` | Distributed Rate Limiting trên PostgreSQL (`HMAC-SHA256` IP hashing) và xác thực Server-side Cloudflare Turnstile CAPTCHA. |

---

## 2. Cài Đặt & Chạy Môi Trường Phát Triển

```bash
# 1. Cài đặt dependencies
npm install

# 2. Tạo tệp cấu hình môi trường từ tệp mẫu
cp .env.example .env

# 3. Áp dụng migrations vào PostgreSQL
npm run db:migrate

# 4. Biên dịch và nạp dữ liệu mẫu (Development)
npm run build && npm run db:seed

# 5. Khởi chạy máy chủ ở chế độ watch (http://localhost:3000/api & Swagger tại http://localhost:3000/api/docs)
npm run start:dev
```

---

## 3. Kiểm Thử & Kiểm Tra Chất Lượng Code

```bash
# Kiểm tra Linter Type-aware (Oxlint)
npm run lint

# Chạy Unit Tests (Vitest)
npm run test

# Chạy End-to-End Integration Tests (Vitest + Supertest)
npm run test:e2e

# Chạy thống kê độ phủ kiểm thử (Coverage)
npm run test:cov
```

---

## 4. Quản Lý Schema & Migrations (Drizzle ORM)

Toàn bộ 12 bảng dữ liệu quan hệ được định nghĩa tại [`src/database/schema.ts`](src/database/schema.ts):
1. `users` — Tài khoản quản trị & phân quyền (`admin`, `editor`)
2. `password_reset_tokens` — Token khôi phục mật khẩu một lần (băm `SHA-256`)
3. `media_assets` — Kho lưu trữ metadata hình ảnh
4. `standards` — Danh mục tiêu chuẩn quốc tế
5. `machines` — Thiết bị phân tích & van công nghiệp
6. `machine_images` — Bộ sưu tập ảnh theo thiết bị
7. `machine_applications` — Ứng dụng kỹ thuật của thiết bị
8. `machine_highlights` — Ưu điểm kỹ thuật nổi bật
9. `machine_specs` — Bảng thông số kỹ thuật chi tiết
10. `machine_standards` — Bảng trung gian liên kết Thiết bị ↔ Tiêu chuẩn
11. `news_events` & `news_event_translations` — Tin tức, sự kiện & bản dịch đa ngôn ngữ
12. `contacts`, `contact_outbox`, `redirects`, `system_settings`, `rate_limit_buckets` — Nghiệp vụ liên hệ, hàng đợi email, điều hướng 301, cấu hình hệ thống & bộ đếm giới hạn truy cập phân tán

> Tham khảo hướng dẫn triển khai Production, cấu hình NGINX, PM2 Cluster và quy trình Migration an toàn tại [README chính của dự án](../README.md).

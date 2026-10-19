<div align="center">

<img src="public/images/brand/ltv-logo.png" alt="LT Việt Nam Logo" width="88" />

# LT VIỆT NAM TECHNOLOGY CO., LTD
### Hệ Thống Số Hóa Doanh Nghiệp — Thiết Bị Phân Tích Dầu Khí & Van Công Nghiệp

[![React](https://img.shields.io/badge/React-19.2-087EA4?style=flat-square&logo=react&logoColor=white)](https://react.dev/)
[![TypeScript](https://img.shields.io/badge/TypeScript-6.0-3178C6?style=flat-square&logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![Vite](https://img.shields.io/badge/Vite-8.2-646CFF?style=flat-square&logo=vite&logoColor=white)](https://vite.dev/)
[![NestJS](https://img.shields.io/badge/NestJS-12.0-E0234E?style=flat-square&logo=nestjs&logoColor=white)](https://nestjs.com/)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-16+-336791?style=flat-square&logo=postgresql&logoColor=white)](https://www.postgresql.org/)
[![Drizzle ORM](https://img.shields.io/badge/Drizzle_ORM-0.45-C5F74F?style=flat-square&logo=drizzle&logoColor=black)](https://orm.drizzle.team/)
[![Security](https://img.shields.io/badge/Security-Turnstile_%2B_RBAC-0F766E?style=flat-square&logo=cloudflare&logoColor=white)](#10-quy-chuẩn-an-ninh--tăng-cường-bảo-mật-security-hardening)

<p align="center">
  <strong>Website Khách Hàng Song Ngữ (VI/EN)</strong> •
  <strong>Cổng Quản Trị Nội Dung (Admin CMS)</strong> •
  <strong>Backend REST API & Dynamic SEO Shell</strong>
</p>

<p align="center">
  <a href="#1-tổng-quan-hệ-thống--các-phân-hệ">Tổng Quan</a> •
  <a href="#2-kiến-trúc-công-nghệ--cấu-trúc-dự-án">Kiến Trúc</a> •
  <a href="#3-hướng-dẫn-cài-đặt--phát-triển-local-quickstart">Cài Đặt Local</a> •
  <a href="#4-kiểm-thử--đảm-bảo-chất-lượng-qa--testing">Kiểm Thử</a> •
  <a href="#5-kiến-trúc-mạng--hạ-tầng-production">Triển Khai Production</a> •
  <a href="#9-vận-hành-cơ-sở-dữ-liệu--migrations-với-drizzle-orm">Vận Hành Database</a>
</p>

</div>

---

## 📑 Mục Lục

1. [Tổng Quan Hệ Thống & Các Phân Hệ](#1-tổng-quan-hệ-thống--các-phân-hệ)
2. [Kiến Trúc Công Nghệ & Cấu Trúc Dự Án](#2-kiến-trúc-công-nghệ--cấu-trúc-dự-án)
3. [Hướng Dẫn Cài Đặt & Phát Triển Local (Quickstart)](#3-hướng-dẫn-cài-đặt--phát-triển-local-quickstart)
4. [Kiểm Thử & Đảm Bảo Chất Lượng (QA & Testing)](#4-kiểm-thử--đảm-bảo-chất-lượng-qa--testing)
5. [Kiến Trúc Mạng & Hạ Tầng Production](#5-kiến-trúc-mạng--hạ-tầng-production)
6. [Yêu Cầu Cấu Hình Máy Chủ (Server Specifications)](#6-yêu-cầu-cấu-hình-máy-chủ-server-specifications)
7. [Đặc Tả Biến Môi Trường (Environment Variables)](#7-đặc-tả-biến-môi-trường-environment-variables)
8. [Quy Trình Triển Khai Production Từng Bước](#8-quy-trình-triển-khai-production-từng-bước)
9. [Cấu Hình Reverse Proxy NGINX & Chứng Chỉ SSL](#9-cấu-hình-reverse-proxy-nginx--chứng-chỉ-ssl)
10. [Quản Lý Tiến Trình Ứng Dụng Với PM2 Cluster](#10-quản-lý-tiến-trình-ứng-dụng-với-pm2-cluster)
11. [Vận Hành Cơ Sở Dữ Liệu & Migrations Với Drizzle ORM](#11-vận-hành-cơ-sở-dữ-liệu--migrations-với-drizzle-orm)
12. [Quy Chuẩn An Ninh & Tăng Cường Bảo Mật (Security Hardening)](#12-quy-chuẩn-an-ninh--tăng-cường-bảo-mật-security-hardening)
13. [Giám Sát, Nhật Ký (Logging) & Kiểm Tra Sức Khỏe (Health Check)](#13-giám-sát-nhật-ký-logging--kiểm-tra-sức-khỏe-health-check)
14. [Kế Hoạch Ứng Phó Sự Cố & Hoàn Nguyên (Rollback Runbook)](#14-kế-hoạch-ứng-phó-sự-cố--hoàn-nguyên-rollback-runbook)
15. [Bảng Tra Cứu Lệnh Nhanh Cho Kỹ Sư DevOps](#15-bảng-tra-cứu-lệnh-nhanh-cho-kỹ-sư-devops)

---

## 1. Tổng Quan Hệ Thống & Các Phân Hệ

Dự án là nền tảng số hóa toàn diện của **Công ty TNHH Kỹ Thuật LT Việt Nam (LT Vietnam Technology Co., Ltd)** — đại diện phân phối và dịch vụ kỹ thuật chuyên sâu cho các giải pháp phân tích hóa dầu phòng thí nghiệm (**PAC L.P.**: Herzog, ISL, Analytical Controls, Phase Technology, Cambridge Viscosity...) và thiết bị van công nghiệp/điều khiển quá trình (**Baker Hughes**: Masoneilan, Consolidated).

Hệ thống được xây dựng theo kiến trúc **3 phân hệ độc lập** trên cùng một kho mã nguồn:

### 1.1. Website Khách Hàng (`src/` — Public Portal)
- **Song ngữ Việt – Anh toàn diện (`i18n`)**: Hỗ trợ chuyển đổi tức thì giữa Tiếng Việt và Tiếng Anh với 196 khóa giao diện và 12 nhóm nội dung song ngữ được kiểm tra tính toàn vẹn tự động khi build (`npm run check:i18n`), tự động đồng bộ đường dẫn bài viết song ngữ (`slug` ↔ `slugEn`).
- **Danh mục Thiết bị & Tra cứu Tiêu chuẩn Kỹ thuật**: Tìm kiếm, lọc thiết bị theo danh mục kỹ thuật, hãng sản xuất và tiêu chuẩn quốc tế (`ASTM`, `ISO`, `IP`, `EN`, `TCVN`). Trang chi tiết thiết bị hiển thị bảng thông số kỹ thuật, ứng dụng, ưu điểm nổi bật và tài liệu datasheet.
- **Tin tức & Sự kiện Kỹ thuật**: Hiển thị bài viết chuyên sâu, hội thảo kỹ thuật với cấu trúc nội dung phân đoạn (`contentBlocks`), thông tin sự kiện và hành động tiếp theo (`nextAction`).
- **Tiếp nhận Yêu cầu Tư vấn & Báo giá thông minh**: Tự động nhận diện ngữ cảnh thiết bị hoặc chủ đề từ URL (`?product=...&topic=...`), tích hợp xác thực chống bot **Cloudflare Turnstile** và cơ chế fallback dữ liệu an toàn khi mất kết nối mạng.

### 1.2. Cổng Quản Trị Nội Dung (`admin/` — Admin CMS Portal)
- **Dashboard Điều Hành**: Thống kê trực quan số lượng máy phân tích, tiêu chuẩn quốc tế, bài viết, kho ảnh và danh sách yêu cầu tư vấn mới kèm chuông thông báo thời gian thực trên Header.
- **Quản trị Thiết bị (`Machines`) & Tiêu chuẩn (`Standards`)**: Quản lý đầy đủ thông tin thiết bị, bộ sưu tập ảnh (`Gallery`), thông số kỹ thuật (`Specs`), ứng dụng (`Applications`), điểm nổi bật (`Highlights`) và liên kết tiêu chuẩn (`Machine Standards`).
- **Trình biên tập Tin tức & Sự kiện (`News & Events`)**: Tích hợp **Visual Block Editor** trực quan (cho phép thêm, xóa, sắp xếp thứ tự các đoạn văn `paragraph`, tiêu đề phụ `subheading`, danh sách `list`, trích dẫn `quote`) song song với chế độ chỉnh sửa JSON nâng cao và bản dịch Tiếng Anh.
- **Quản lý Yêu cầu Liên hệ (`Contacts`)**: Theo dõi trạng thái xử lý (`new`, `in_progress`, `resolved`, `spam`), phân công nhân sự phụ trách (`assignedTo`), ghi chú nội bộ (`adminNote`) và bộ lọc danh sách theo trạng thái.
- **Quản lý Điều hướng 301 (`Redirects`)**: Tạo, bật/tắt, chỉnh sửa các quy tắc chuyển hướng URL 301 phục vụ SEO với bộ kiểm tra chống vòng lặp và chuỗi chuyển hướng.
- **Quản trị Nhân sự (`Users`) & Cấu hình Hệ thống (`Settings`)**: Phân quyền theo vai trò (`admin` / `editor`), bảo vệ chống tự khóa hoặc tự hạ quyền tài khoản đang đăng nhập, và quản lý cấu hình SMTP gửi mail (mật khẩu SMTP được mã hóa `AES-256-GCM` trong cơ sở dữ liệu).

### 1.3. Backend REST API & SEO Engine (`api/` — NestJS Server)
- **Kiến trúc Module hóa chuẩn NestJS 12**: Bao gồm 10 module nghiệp vụ (`AuthModule`, `UsersModule`, `MachinesModule`, `StandardsModule`, `MediaModule`, `NewsEventsModule`, `ContactsModule`, `RedirectsModule`, `SettingsModule`, `SeoModule`) và `SecurityModule` toàn cục.
- **Dynamic SSR SEO Metadata Shell (`SeoHtmlService`)**: Tự động bơm thẻ `<title>`, `<meta description>`, OpenGraph, Twitter Card, Canonical URL và cấu trúc dữ liệu `JSON-LD` (`Product`, `Article`, `Organization`) trực tiếp vào HTML shell cho bot tìm kiếm và mạng xã hội trước khi nạp React SPA.
- **Transactional Contact Outbox Worker**: Ghi nhận liên hệ và sự kiện gửi mail trong cùng một giao dịch cơ sở dữ liệu; tiến trình nền (`ContactOutboxWorker`) quét hàng đợi bằng khóa `FOR UPDATE SKIP LOCKED`, tự động thử lại theo cấp số nhân (Exponential Backoff) khi máy chủ SMTP tạm thời gián đoạn.
- **Bảo mật Đa lớp**: Xác thực JWT kèm `tokenVersion` (vô hiệu hóa toàn bộ token cũ ngay khi đổi/reset mật khẩu), khóa tài khoản tạm thời khi đăng nhập sai nhiều lần, và **Distributed Rate Limiting** lưu trữ trên PostgreSQL với IP được băm ẩn danh bằng `HMAC-SHA256`.

---

## 2. Kiến Trúc Công Nghệ & Cấu Trúc Dự Án

### 2.1. Ngăn xếp công nghệ (Tech Stack)

| Phân hệ | Công nghệ sử dụng |
| :--- | :--- |
| **Website Khách Hàng (`src/`)** | React 19.2, TypeScript 6.0, React Router 8.3, Lucide Icons, Vite 8.2, Custom CSS Design System (`site-v7.css`) |
| **Cổng Quản Trị (`admin/`)** | React 19.2, TypeScript 6.0, Lucide Icons, Vite 8.2, Accessible Modal & Drawer Architecture |
| **Backend API (`api/`)** | NestJS 12.0, TypeScript 6.0, Drizzle ORM 0.45, PostgreSQL (`postgres` driver), JWT, BcryptJS, Nodemailer, Swagger OpenAPI |
| **Bảo mật & Chống Bot** | Cloudflare Turnstile CAPTCHA, PostgreSQL Distributed Rate Limiter (`HMAC-SHA256`), AES-256-GCM Secret Encryption |
| **Kiểm thử & Chất lượng Code** | Vitest 4.1 (Unit & E2E Tests), Supertest, Oxlint (Type-aware linting), i18n Integrity Validator |

### 2.2. Cấu trúc thư mục dự án

```text
website-LTVN/
├── public/                     # Tài nguyên tĩnh (Logo thương hiệu, ảnh thiết bị PAC/Baker Hughes, khách hàng, font chữ)
│   └── images/brand/           # Logo chính thức LT Việt Nam (ltv-logo.png)
├── src/                        # Mã nguồn Website Khách Hàng (Public Portal - React 19)
│   ├── components/             # Layout, SeoHead, TurnstileWidget, ProductCard, NewsCard, OfficeNetwork...
│   ├── context/                # DataContext quản lý trạng thái dữ liệu & đồng bộ API/Fallback
│   ├── pages/                  # HomePage, AboutPage, CatalogPage, ProductPage, NewsPage, ArticlePage, ContactPage
│   ├── services/               # Dịch vụ kết nối API & chuyển ngữ dữ liệu
│   ├── data.ts                 # Dữ liệu chuẩn phục vụ fallback & khởi tạo
│   └── i18n.tsx                # Từ điển song ngữ Việt - Anh (VI/EN)
├── admin/                      # Mã nguồn Cổng Quản Trị (Admin CMS - React 19)
│   └── src/
│       ├── components/         # Sidebar, Header (kèm chuông thông báo), Modal, MediaPickerModal
│       ├── pages/              # Dashboard, Machines, Standards, Media, NewsEvents, Contacts, Redirects, Users, Settings
│       └── services/           # API Client & Quản lý phiên đăng nhập JWT
├── api/                        # Mã nguồn Backend REST API (NestJS 12 + Drizzle ORM)
│   ├── drizzle/                # Lịch sử SQL Migrations chính thức (0000 -> 0009) & _journal.json
│   ├── src/
│   │   ├── common/             # Bộ lọc và chuẩn hóa UUID, tiện ích dùng chung
│   │   ├── database/           # Định nghĩa Schema 12 bảng (schema.ts), DatabaseModule & Seed Script (seed.ts)
│   │   └── modules/            # 10 Module nghiệp vụ: auth, users, machines, standards, media, news-events,
│   │                           # contacts, redirects, settings, seo, email, security
│   └── test/                   # Bộ kiểm thử tích hợp E2E (Vitest + Supertest)
├── scripts/                    # Công cụ vận hành CLI
│   ├── bootstrap-admin.mjs     # Khởi tạo tài khoản Admin đầu tiên an toàn (Interactive CLI + Advisory Lock)
│   ├── backup-db.mjs           # Công cụ sao lưu dữ liệu và kiểm tra kết nối DB
│   ├── BACKUP-RUNBOOK.md       # Hướng dẫn chi tiết quy trình sao lưu & phục hồi
│   └── validate-i18n.mjs       # Kiểm tra tính toàn vẹn từ điển song ngữ VI/EN
├── ecosystem.config.cjs        # Cấu hình quản lý cụm tiến trình PM2 Cluster trên Production
└── package.json                # Tập lệnh điều phối tập trung cho toàn bộ Monorepo
```

---

## 3. Hướng Dẫn Cài Đặt & Phát Triển Local (Quickstart)

### 3.1. Yêu cầu môi trường phát triển
- **Node.js**: Phiên bản `v22.x` LTS trở lên.
- **PostgreSQL**: Phiên bản `15` hoặc `16` trở lên (chạy cục bộ qua Docker hoặc cài đặt trực tiếp).

### 3.2. Cài đặt Dependencies cho cả 3 phân hệ

```bash
# 1. Cài đặt dependencies cho Website Khách Hàng (Root)
npm install

# 2. Cài đặt dependencies cho Cổng Quản Trị (Admin CMS)
npm --prefix admin install

# 3. Cài đặt dependencies cho Backend API (NestJS)
npm --prefix api install
```

### 3.3. Thiết lập biến môi trường & Cơ sở dữ liệu Local

```bash
# Sao chép tệp mẫu cấu hình môi trường cho Backend API
cp api/.env.example api/.env
```

Cập nhật các thông số cơ bản trong `api/.env` cho môi trường `development`:
- `DATABASE_URL=postgresql://postgres:postgres@localhost:5432/ltvn_db`
- `JWT_SECRET`: Chuỗi bí mật ngẫu nhiên (tối thiểu 32 ký tự).
- `TURNSTILE_ENABLED=false` (hoặc sử dụng test secret key của Cloudflare `1x0000000000000000000000000000000AA`).

Sau đó áp dụng migration và nạp dữ liệu mẫu (13 dòng máy thực tế, 15 tiêu chuẩn quốc tế, bài viết, kho ảnh và tài khoản mẫu):

```bash
# Áp dụng toàn bộ migrations vào PostgreSQL
npm run db:migrate

# Biên dịch và nạp dữ liệu mẫu phục vụ phát triển (Chỉ chạy khi NODE_ENV != production)
npm run db:seed
```

### 3.4. Khởi chạy môi trường phát triển (Development Servers)

Mở 3 cửa sổ terminal tại thư mục gốc dự án để chạy đồng thời:

```bash
# Terminal 1: Khởi chạy Backend NestJS API (http://localhost:3000/api & Swagger tại http://localhost:3000/api/docs)
npm run dev:api

# Terminal 2: Khởi chạy Website Khách Hàng (http://localhost:5173)
npm run dev

# Terminal 3: Khởi chạy Cổng Quản Trị Admin CMS (http://localhost:5174)
npm run dev:admin
```

### 3.5. Bảng tổng hợp các lệnh `npm scripts` tại thư mục gốc

| Câu lệnh | Mô tả chức năng |
| :--- | :--- |
| `npm run dev` | Chạy máy chủ phát triển Website Khách Hàng (`Vite`). |
| `npm run dev:admin` | Chạy máy chủ phát triển Cổng Quản Trị Admin CMS. |
| `npm run dev:api` | Chạy máy chủ Backend NestJS ở chế độ `watch`. |
| `npm run build` | Kiểm tra song ngữ (`check:i18n`), kiểm tra kiểu TypeScript và build Website Khách Hàng ra `dist/`. |
| `npm run build:admin` | Kiểm tra kiểu TypeScript và build Admin CMS ra `admin/dist/`. |
| `npm run build:api` | Biên dịch Backend NestJS ra `api/dist/`. |
| `npm run check:i18n` | Xác thực tính đồng bộ khóa từ điển và nội dung song ngữ Việt – Anh. |
| `npm run lint` | Chạy `oxlint` kiểm tra mã nguồn Frontend (`src/`), Admin (`admin/src/`) và `scripts/`. |
| `npm run lint:api` | Chạy `oxlint --type-aware` kiểm tra mã nguồn và kiểu dữ liệu Backend (`api/`). |
| `npm run test:api` | Chạy toàn bộ bộ Unit Tests của Backend với `Vitest`. |
| `npm run test:e2e` | Chạy bộ kiểm thử tích hợp End-to-End (`E2E`) của Backend. |
| `npm run db:generate` | Sinh tệp SQL migration mới từ thay đổi trong `api/src/database/schema.ts`. |
| `npm run db:migrate` | Áp dụng các tệp SQL migration chính thức vào cơ sở dữ liệu PostgreSQL. |
| `npm run db:seed` | Nạp bộ dữ liệu mẫu cho môi trường Development / Staging (bị khóa trên Production). |
| `npm run bootstrap:admin` | Công cụ tương tác bảo mật khởi tạo tài khoản Admin đầu tiên trên Production. |

---

## 4. Kiểm Thử & Đảm Bảo Chất Lượng (QA & Testing)

Trước mỗi lần phát hành (Release) hoặc tạo Pull Request, chạy chuỗi lệnh kiểm tra chất lượng toàn diện sau:

```bash
# 1. Xác thực từ điển song ngữ VI/EN
npm run check:i18n

# 2. Kiểm tra Linter cho Frontend, Admin và Backend API
npm run lint
npm run lint:api

# 3. Chạy Unit Tests (17 test suites / 282 tests) và E2E Tests cho Backend
npm run test:api
npm run test:e2e

# 4. Kiểm tra biên dịch Production cho cả 3 phân hệ
npm run build
npm run build:admin
npm run build:api
```

---

## 5. Kiến Trúc Mạng & Hạ Tầng Production

Hệ thống được thiết kế theo mô hình phân tách tầng bảo vệ nhiều lớp (Multi-layer Defense in Depth), kết hợp giữa CDN/Edge, NGINX Reverse Proxy, Node.js Cluster, và Cơ sở dữ liệu Cloud:

```text
                                 INTERNET / CLIENTS
                                         │
                                         ▼ (HTTPS - Port 443)
                      ┌──────────────────────────────────────┐
                      │    CLOUDFLARE CDN / WAF / SSL EDGE   │
                      │  - Chống DDoS, Caching Static Assets │
                      │  - Tự động nén Brotli / Gzip         │
                      └──────────────────┬───────────────────┘
                                         │
                                         ▼ (TLS 1.3 Strict)
                      ┌──────────────────────────────────────┐
                      │      NGINX REVERSE PROXY & GATEWAY   │
                      │  - Rate Limiting / SSL Termination   │
                      │  - HTTP/2 & Static File Serving      │
                      └───┬──────────────┬────────────────┬──┘
                          │              │                │
            / (Main Site) │              │ /admin/        │ /api/ (REST Calls)
                          ▼              ▼                ▼
         ┌───────────────────┐  ┌───────────────────┐  ┌────────────────────────┐
         │ STATIC BUNDLE     │  │ STATIC BUNDLE     │  │ NESTJS 12 API CLUSTER  │
         │ /var/www/ltvn/dist│  │ /var/www/ltvn/    │  │ Managed by PM2 Cluster │
         │ React 19 + i18n   │  │ admin/dist        │  │ Port 3000 (Internal)   │
         └───────────────────┘  └───────────────────┘  └───────────┬────────────┘
                                                                   │
                                                                   │ Drizzle ORM (SSL Pooler)
                                                                   ▼
                                                       ┌────────────────────────┐
                                                       │ NEON SERVERLESS PG     │
                                                       │ AWS Singapore (Cloud)  │
                                                       │ 12 Relational Tables   │
                                                       └────────────────────────┘
```

### Các Miền Hoạt Động (Production Domains):
- **Website Chính**: `https://ltvietnam.com.vn` (hoặc `https://www.ltvietnam.com.vn`)
- **Cổng Quản Trị (Admin)**: `https://admin.ltvietnam.com.vn` (hoặc đường dẫn nội bộ `https://ltvietnam.com.vn/admin`)
- **Backend API Gateway**: `https://api.ltvietnam.com.vn` (hoặc route trung tâm `https://ltvietnam.com.vn/api`)
- **Tài liệu Kỹ Thuật API**: `https://ltvietnam.com.vn/api/docs` (Swagger OpenAPI UI)

---

## 6. Yêu Cầu Cấu Hình Máy Chủ (Server Specifications)

### 6.1. Cấu hình phần cứng máy chủ (VPS / Cloud Server):
| Thông Số | Cấu Hình Tối Thiểu (Minimum) | Cấu Hình Khuyến Nghị (Production) |
| :--- | :--- | :--- |
| **CPU** | 2 vCPU Core | 4 vCPU Core (AMD EPYC hoặc Intel Xeon) |
| **RAM** | 2 GB RAM (yêu cầu bật 2GB Swap) | 4 GB - 8 GB RAM |
| **Ổ Cứng (Disk)**| 30 GB SSD / NVMe | 60 GB - 100 GB NVMe SSD |
| **Hệ Điều Hành** | Ubuntu 22.04 LTS / 24.04 LTS | Ubuntu 24.04 LTS Server |
| **Băng Thông** | 1 Gbps Shared Port | 1 Gbps Dedicated Port |

### 6.2. Phần mềm & Runtime bắt buộc:
- **Node.js**: Phiên bản LTS `v22.x` hoặc `v24.x`.
- **NPM**: Đi kèm Node.js.
- **PM2**: Bộ quản lý tiến trình ứng dụng Node.js (`npm install -g pm2`).
- **NGINX**: Phiên bản ổn định mới nhất (`nginx -v` >= 1.18).
- **Certbot**: Tự động gia hạn chứng chỉ Let's Encrypt SSL.

---

## 7. Đặc Tả Biến Môi Trường (Environment Variables)

### 7.1. Cấu hình Backend (`api/.env` trên Server)
Tệp này chứa thông tin kết nối cơ sở dữ liệu và **tuyệt đối không commit lên Git** (đã được cấu hình trong `.gitignore`):

```env
# ==============================================================================
# LTVN PRODUCTION ENVIRONMENT CONFIGURATION
# ==============================================================================
NODE_ENV=production
PORT=3000
HOST=127.0.0.1
JWT_SECRET=<production-random-secret>
JWT_TTL_SECONDS=3600

# URL công khai phục vụ tạo Sitemap, Robots.txt và liên kết khôi phục mật khẩu Admin
PUBLIC_SITE_URL=https://ltvietnam.com.vn
ADMIN_PUBLIC_URL=https://admin.ltvietnam.com.vn

# Chuỗi kết nối PostgreSQL (Bắt buộc dùng sslmode=require & connection pooler)
DATABASE_URL=<production-postgresql-url>

# Cấu hình CORS whitelisting an toàn
CORS_ALLOWED_ORIGINS=https://ltvietnam.com.vn,https://www.ltvietnam.com.vn,https://admin.ltvietnam.com.vn

# ==============================================================================
# BẢO MẬT PHÂN TÁN & CHỐNG BOT (PR-04B)
# ==============================================================================
# Chỉ dùng khi NGINX và NestJS chạy cùng máy, API bind 127.0.0.1
TRUST_PROXY=loopback

# Khóa bí mật băm IP PII-Safe (Bắt buộc tối thiểu 16 ký tự trong production)
RATE_LIMIT_HASH_SECRET=<production-random-secret-32-chars>

# Ngưỡng Rate Limiting mặc định (PostgreSQL distributed storage chia sẻ giữa các PM2 workers)
RATE_LIMIT_LOGIN_MAX=5
RATE_LIMIT_LOGIN_WINDOW_SECONDS=300
RATE_LIMIT_FORGOT_PASSWORD_MAX=3
RATE_LIMIT_FORGOT_PASSWORD_WINDOW_SECONDS=900
RATE_LIMIT_RESET_PASSWORD_MAX=5
RATE_LIMIT_RESET_PASSWORD_WINDOW_SECONDS=900
RATE_LIMIT_CONTACT_MAX=5
RATE_LIMIT_CONTACT_WINDOW_SECONDS=600

# Cloudflare Turnstile Anti-Bot / CAPTCHA (Bắt buộc trong production)
TURNSTILE_ENABLED=true
TURNSTILE_SECRET_KEY=<production-turnstile-secret-key>
TURNSTILE_ALLOWED_HOSTNAMES=ltvietnam.com.vn,admin.ltvietnam.com.vn

# ==============================================================================
# CẤU HÌNH EMAIL SMTP & MÃ HÓA SECRET (PR-09B / PR-09C)
# ==============================================================================
SETTINGS_ENCRYPTION_KEY=<production-64-hex-chars-aes-256-key>
SMTP_HOST=smtp.example.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USERNAME=<smtp-username>
SMTP_PASSWORD=<smtp-password>
SMTP_FROM=no-reply@ltvietnam.com.vn
CONTACT_NOTIFICATION_TO=contact@ltvietnam.com.vn
```

> **Lưu ý triển khai Production**:
> - Các hệ thống upstream như NGINX hay Cloudflare WAF có thể bổ sung các tầng lọc DDoS và WAF ở mức mạng/gateway. Tuy nhiên, tầng Distributed Rate Limiting (PostgreSQL-backed) và xác thực Server-side Turnstile CAPTCHA được triển khai ở backend là tầng kiểm soát nghiệp vụ có thẩm quyền (authoritative) độc lập của ứng dụng.
> - Mặc định backend dùng `TRUST_PROXY=false`: kết nối trực tiếp lấy IP của socket và bỏ qua `X-Forwarded-For`. Cấu hình phát hành trong `ecosystem.config.cjs` chỉ dành cho NGINX cùng máy: `HOST=127.0.0.1`, `TRUST_PROXY=loopback`; NGINX phải bổ sung hoặc ghi đè `X-Forwarded-For` theo cấu hình đã kiểm tra.
> - JWT cũ thiếu `tokenVersion` bị từ chối sau migration `0008`. Đổi hoặc reset mật khẩu tăng `users.token_version`, khiến JWT cấp trước đó hết hiệu lực trên server.

---

## 8. Quy Trình Triển Khai Production Từng Bước

### Bước 1: Chuẩn bị máy chủ Ubuntu mới
Đăng nhập SSH vào VPS với quyền `sudo`:

```bash
# Cập nhật hệ thống
sudo apt update && sudo apt upgrade -y

# Cài đặt các công cụ cần thiết
sudo apt install -y curl git ufw nginx build-essential

# Cài đặt Node.js 22 LTS từ NodeSource
curl -fsSL https://deb.nodesource.com/setup_22.x | sudo -E bash -
sudo apt install -y nodejs

# Cài đặt PM2 toàn cục
sudo npm install -g pm2
```

### Bước 2: Tải mã nguồn từ GitHub Repository
```bash
# Tạo thư mục ứng dụng chuẩn
sudo mkdir -p /var/www/ltvn
sudo chown -R $USER:$USER /var/www/ltvn

# Clone mã nguồn
git clone https://github.com/ANGFLO26/website-LTVN.git /var/www/ltvn
cd /var/www/ltvn
```

### Bước 3: Cài đặt Dependencies cho toàn bộ dự án
```bash
cd /var/www/ltvn

# Cài đặt root dependencies (Website Chính & Scripts)
npm ci

# Cài đặt dependencies cho Admin Portal
npm --prefix admin ci

# Cài đặt dependencies cho Backend API
npm --prefix api ci
```

### Bước 4: Khởi tạo tệp môi trường Production
```bash
# Tạo tệp .env cho Backend
nano /var/www/ltvn/api/.env
# Cấu hình DATABASE_URL=<production-postgresql-url> và các biến bắt buộc
```

### Bước 5: Biên dịch toàn bộ các phân hệ (Production Build)
```bash
cd /var/www/ltvn

# 1. Kiểm tra xác thực tính toàn vẹn song ngữ
npm run check:i18n

# 2. Build Website Chính (Xuất ra /var/www/ltvn/dist)
npm run build

# 3. Build Admin Portal (Xuất ra /var/www/ltvn/admin/dist)
npm run build:admin

# 4. Build Backend NestJS (Xuất ra /var/www/ltvn/api/dist)
npm run build:api
```

### Bước 6: Áp dụng Migration Cơ Sở Dữ Liệu Production
Trước khi khởi động ứng dụng lần đầu hoặc khi có bản cập nhật schema, chạy migration có kiểm soát:
```bash
cd /var/www/ltvn

# YÊU CẦU BẮT BUỘC: Đã tạo backup/snapshot database trước khi migrate
# Áp dụng toàn bộ versioned migrations đã review và commit
npm run db:migrate
```
*Quy chuẩn an toàn: TUYỆT ĐỐI KHÔNG sử dụng `npm run db:push` trên Production (xem chi tiết tại [Mục 11](#11-vận-hành-cơ-sở-dữ-liệu--migrations-với-drizzle-orm)).*

### Bước 7: Khởi tạo tài khoản Quản trị viên đầu tiên (Initial Admin Bootstrap)
Trường hợp cơ sở dữ liệu mới khởi tạo chưa có tài khoản Quản trị viên, thực thi lệnh khởi tạo bảo mật một lần:
```bash
npm run bootstrap:admin -- --dry-run   # Kiểm tra điều kiện tiên quyết (0 database writes)
npm run bootstrap:admin                # Chạy khởi tạo tương tác an toàn (hidden password input)
```
*Chi tiết các bước thực hiện và quy tắc an toàn xem tại [Mục 11.8](#118-hướng-dẫn-vận-hành-khởi-tạo-admin-ban-đầu-safe-initial-admin-bootstrap-runbook).*

---

## 9. Cấu Hình Reverse Proxy NGINX & Chứng Chỉ SSL

### 9.1. Tạo cấu hình Virtual Host NGINX
Tạo tệp cấu hình mới:
```bash
sudo nano /etc/nginx/sites-available/ltvietnam.conf
```

Dán toàn bộ nội dung cấu hình chuẩn hóa Production dưới đây:

```nginx
# Upstream kết nối tới cụm PM2 NestJS API
upstream ltvn_backend {
    server 127.0.0.1:3000 max_fails=3 fail_timeout=10s;
    keepalive 32;
}

# 1. Chuyển hướng toàn bộ HTTP sang HTTPS
server {
    listen 80;
    listen [::]:80;
    server_name ltvietnam.com.vn www.ltvietnam.com.vn admin.ltvietnam.com.vn;
    return 301 https://$host$request_uri;
}

# 2. Cổng Quản Trị (Admin Portal) - admin.ltvietnam.com.vn
server {
    listen 443 ssl http2;
    listen [::]:443 ssl http2;
    server_name admin.ltvietnam.com.vn;

    root /var/www/ltvn/admin/dist;
    index index.html;

    # SSL Certificates (sẽ được cập nhật tự động bởi Certbot)
    ssl_certificate /etc/letsencrypt/live/admin.ltvietnam.com.vn/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/admin.ltvietnam.com.vn/privkey.pem;
    include /etc/letsencrypt/options-ssl-nginx.conf;
    ssl_dhparam /etc/letsencrypt/ssl-dhparams.pem;

    # Cấu hình Security Headers
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-XSS-Protection "1; mode=block" always;
    add_header Referrer-Policy "strict-origin-when-cross-origin" always;

    # Reverse Proxy cho API calls từ Admin
    location /api/ {
        proxy_pass http://ltvn_backend/api/;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
        proxy_connect_timeout 15s;
        proxy_read_timeout 60s;
    }

    # Static Caching cho SPA Assets
    location /assets/ {
        expires 1y;
        add_header Cache-Control "public, max-age=31536000, immutable";
        access_log off;
    }

    # SPA Routing Fallback
    location / {
        try_files $uri $uri/ /index.html;
    }
}

# 3. Website Chính (Main Website) - ltvietnam.com.vn
server {
    listen 443 ssl http2;
    listen [::]:443 ssl http2;
    server_name ltvietnam.com.vn www.ltvietnam.com.vn;

    root /var/www/ltvn/dist;
    index index.html;

    # SSL Certificates (sẽ được cập nhật tự động bởi Certbot)
    ssl_certificate /etc/letsencrypt/live/ltvietnam.com.vn/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/ltvietnam.com.vn/privkey.pem;
    include /etc/letsencrypt/options-ssl-nginx.conf;
    ssl_dhparam /etc/letsencrypt/ssl-dhparams.pem;

    # Bật nén Gzip tối ưu tốc độ tải trang
    gzip on;
    gzip_vary on;
    gzip_min_length 1024;
    gzip_proxied any;
    gzip_types text/plain text/css application/json application/javascript text/xml application/xml application/xml+rss text/javascript image/svg+xml;

    # Cấu hình Security Headers
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-XSS-Protection "1; mode=block" always;
    add_header Referrer-Policy "strict-origin-when-cross-origin" always;

    # Reverse Proxy cho Backend REST API và Swagger
    location /api/ {
        proxy_pass http://ltvn_backend/api/;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
        proxy_connect_timeout 15s;
        proxy_read_timeout 60s;
    }

    # Reverse Proxy cho SEO Discovery Endpoints (robots.txt & dynamic sitemap.xml)
    location = /robots.txt {
        proxy_pass http://ltvn_backend/robots.txt;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    location = /sitemap.xml {
        proxy_pass http://ltvn_backend/sitemap.xml;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    # Static Assets Caching (Vite build hashed files)
    location /assets/ {
        expires 1y;
        add_header Cache-Control "public, max-age=31536000, immutable";
        access_log off;
    }

    location /images/ {
        expires 30d;
        add_header Cache-Control "public, max-age=2592000";
        access_log off;
    }

    # SPA Routing with Server-Side Dynamic HTML Metadata Shell
    location / {
        try_files $uri @backend_html;
    }

    location @backend_html {
        proxy_pass http://ltvn_backend;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

### 9.2. Kích hoạt Virtual Host & Thiết lập Chứng Chỉ SSL Let's Encrypt
```bash
# Kích hoạt site trong NGINX
sudo ln -s /etc/nginx/sites-available/ltvietnam.conf /etc/nginx/sites-enabled/
sudo rm -f /etc/nginx/sites-enabled/default

# Kiểm tra cú pháp NGINX
sudo nginx -t

# Khởi động lại NGINX
sudo systemctl reload nginx

# Cài đặt SSL miễn phí tự động bằng Certbot
sudo apt install -y certbot python3-certbot-nginx
sudo certbot --nginx -d ltvietnam.com.vn -d www.ltvietnam.com.vn -d admin.ltvietnam.com.vn
```

### 9.3. Luồng Định Tuyến NGINX & Điều Hướng 301 Thống Nhất (Unified 301 Redirect Flow)

Hệ thống định tuyến tại tầng NGINX và Backend NestJS tuân thủ nguyên tắc **Nguồn Chân Lý Duy Nhất (Single Source of Truth — bảng `redirects` trong PostgreSQL)**:
1. **Không sử dụng static map trong NGINX**: Tránh tình trạng Admin cập nhật cơ sở dữ liệu nhưng NGINX vẫn giữ bản ánh xạ cũ gây lệch pha dữ liệu giữa các tầng.
2. **Nhất quán giữa các tiến trình PM2 (Multi-instance Consistency)**: Khi Admin thêm/sửa/tắt/xóa redirect qua Admin Portal (`/api/redirects`), toàn bộ các worker PM2 đọc trực tiếp bản ghi từ PostgreSQL và phản hồi `HTTP 301` tức thì mà không cần reload NGINX hay restart PM2.
3. **Bảo tồn toàn vẹn SEO Routing**:

```text
HTTP Request tới ltvietnam.com.vn
       │
       ▼
[NGINX Reverse Proxy]
       ├─► /assets/*, /images/* ───────► Phục vụ trực tiếp file tĩnh (Cache 1y / 30d)
       ├─► /api/* ─────────────────────► Proxy tới NestJS API (/api/...)
       ├─► /robots.txt, /sitemap.xml ──► Proxy tới NestJS SEO Controller
       └─► try_files $uri @backend_html
                   │
                   ▼
       [NestJS Redirect Middleware]
                   │
                   ├─► Tìm thấy `source_path` đang hoạt động (isActive = true) trong PostgreSQL?
                   │        │
                   │        ├─► CÓ: Trả về HTTP 301 Moved Permanently
                   │        │       Location: destination_path (+ giữ nguyên query string)
                   │        │
                   │        └─► KHÔNG: Tiếp tục next()
                   │
                   ▼
       [NestJS SEO HTML Shell Service]
                   │
                   ├─► Route Sản Phẩm (/san-pham/:slug) ──► Dynamic SSR Metadata + Client Bundle
                   ├─► Route Tin Tức (/tin-tuc/:slug) ─────► Dynamic SSR Metadata + Client Bundle
                   └─► Route Khác / Fallback ──────────────► React SPA HTML Shell (index.html)
```

---

## 10. Quản Lý Tiến Trình Ứng Dụng Với PM2 Cluster

Hệ thống đã chuẩn bị sẵn tệp [`ecosystem.config.cjs`](ecosystem.config.cjs) hỗ trợ chế độ Cluster Mode, tự động tận dụng tối đa số nhân CPU và tự khởi động lại khi có sự cố.

### 10.1. Khởi chạy Backend với PM2
```bash
cd /var/www/ltvn

# Khởi động cụm ứng dụng trong chế độ Production
pm2 start ecosystem.config.cjs --env production

# Lưu trạng thái tiến trình
pm2 save

# Cấu hình tự khởi động cùng hệ điều hành khi máy chủ reboot
pm2 startup systemd
```

### 10.2. Các lệnh quản lý PM2 thường dùng:
```bash
pm2 status                  # Xem trạng thái CPU / RAM của các tiến trình
pm2 logs ltvn-api           # Xem nhật ký thực thi thời gian thực
pm2 reload ltvn-api         # Tải lại ứng dụng với ZERO-DOWNTIME (Không gián đoạn người dùng)
pm2 restart ltvn-api        # Khởi động lại cưỡng bức
```

---

## 11. Vận Hành Cơ Sở Dữ Liệu & Migrations Với Drizzle ORM

Dự án sử dụng kiến trúc Type-safe ORM của [Drizzle ORM](https://orm.drizzle.team/). Toàn bộ schema cơ sở dữ liệu được định nghĩa và quản trị tập trung tại [`api/src/database/schema.ts`](api/src/database/schema.ts).

### 11.1. Lịch Sử Migration Chính Thức (Official Migration History)
Lịch sử migration của hệ thống được theo dõi và quản lý phiên bản trong Git tại:
- `api/drizzle/*.sql`: Các tệp SQL định nghĩa thay đổi schema theo chuỗi số thứ tự tăng dần (`0000` → `0009`).
- `api/drizzle/meta/_journal.json`: Nhật ký metadata ghi nhận danh mục, phiên bản và thứ tự thực thi chính thức của các tệp migration.

**Quy tắc bảo toàn lịch sử migration (Immutability Rules):**
1. `api/drizzle/*.sql` và `api/drizzle/meta/_journal.json` là nguồn chân lý duy nhất (single source of truth) cho cấu trúc cơ sở dữ liệu.
2. **KHÔNG** chỉnh sửa nội dung các tệp migration cũ đã được apply vào database production hoặc staging.
3. **KHÔNG** đổi tên hoặc xóa các tệp migration đã phát hành. Khi cần thay đổi schema, lập trình viên bắt buộc phải tạo migration mới kế tiếp qua quy trình phát triển.

### 11.2. Hợp Đồng Vòng Đời Migration (Migration Lifecycle Contract)
Mọi thay đổi cấu trúc dữ liệu từ phát triển đến vận hành production phải tuân thủ nghiêm ngặt quy trình 7 bước:
```text
1. Generate migration during development (chạy npm run db:generate trên local)
→ 2. Review SQL (kỹ sư rà soát kỹ file SQL và tác động dữ liệu)
→ 3. Commit/release migration (đưa migration files vào Git và release package)
→ 4. Backup DB (bắt buộc tạo snapshot / backup DB trước khi apply trên production)
→ 5. Apply migration (chạy npm run db:migrate trên target DB)
→ 6. Verify migration (kiểm tra exit code 0, xác nhận schema và health check)
→ 7. Start/deploy application (khởi động hoặc reload tiến trình NestJS API)
```

### 11.3. CẢNH BÁO QUAN TRỌNG: TUYỆT ĐỐI KHÔNG DÙNG `db:push` TRÊN PRODUCTION
```text
====================================================================
[CẢNH BÁO AN TOÀN VẬN HÀNH DATABASE]
DO NOT use db:push against production/shared databases.
TUYỆT ĐỐI KHÔNG sử dụng "db:push" đối với cơ sở dữ liệu Production hoặc Staging/Shared.
====================================================================
```
- **Bypass Migration History**: Lệnh `db:push` đồng bộ trực tiếp schema TypeScript vào DB mà **không** ghi nhận vào bảng quản lý `__drizzle_migrations` và tệp nhật ký `_journal.json`.
- **Tạo Schema Drift & Nguy Cơ Mất Dữ Liệu**: Phá vỡ tính đồng nhất giữa mã nguồn Git và trạng thái thực tế của DB, có thể tự ý áp dụng các thao tác phá hủy (`DROP COLUMN`, đổi kiểu dữ liệu).
- *Phạm vi cho phép:* Lệnh `npm run db:push` **CHỈ** được sử dụng trong môi trường phát triển cá nhân (local development prototyping).

### 11.4. Quy Trình Chạy Migration Trên Production (Production Migration Runbook)

#### Giai đoạn 1: Tiền kiểm tra (Preflight Checklist)
1. **Xác nhận môi trường**: Đảm bảo `NODE_ENV=production` và `DATABASE_URL` đã được cấu hình trong `api/.env`.
2. **Yêu cầu bắt buộc sao lưu (BACKUP / SNAPSHOT REQUIRED)**:
   - **Ưu tiên 1:** Managed Provider Snapshot / Point-in-time Restore (PITR) trực tiếp từ Cloud Database Console (ví dụ: Neon Cloud, AWS RDS).
   - **Ưu tiên 2:** Sao lưu logic bằng `pg_dump` hoặc công cụ `npm run db:backup` (xem chi tiết tại [`scripts/BACKUP-RUNBOOK.md`](scripts/BACKUP-RUNBOOK.md)):
     ```bash
     pg_dump -h <db-host> -p <db-port> -U <db-user> -d <db-name> \
       --format=custom \
       --file=/var/backups/ltvn_db_pre_migration_$(date +%Y%m%d_%H%M%S).dump
     ```
3. **Rà soát pending SQL**: Đọc trước nội dung các file SQL mới trong `api/drizzle/`.

#### Giai đoạn 2: Áp dụng Migration (Apply Migration)
```bash
cd /var/www/ltvn
npm run db:migrate
```

#### Giai đoạn 3: Xác thực sau Migration (Verify Migration)
1. Lệnh `npm run db:migrate` hoàn tất với exit code `0`.
2. Khởi động hoặc reload tiến trình Backend NestJS (`pm2 reload ltvn-api`).
3. Kiểm tra Health Check Endpoint (`GET /api` trả về `HTTP 200 OK`).

### 11.5. Nguyên Tắc An Toàn Dữ Liệu Mẫu (Seed Safety)
- Lệnh `npm run db:seed` **CHỈ DÙNG CHO MÔI TRƯỜNG DEVELOPMENT / TEST**.
- Script [`api/src/database/seed.ts`](api/src/database/seed.ts) đã tích hợp cơ chế khóa an toàn: khi phát hiện `NODE_ENV === 'production'`, script lập tức từ chối kết nối và hủy tiến trình.

### 11.6. Hướng Dẫn Tạo Migration Mới (Local Development)
```bash
# 1. Sinh file SQL migration mới dựa trên diff giữa schema.ts và api/drizzle/
npm run db:generate

# 2. Rà soát cẩn thận file SQL vừa được sinh ra trong api/drizzle/
# 3. Chạy thử nghiệm migration trên DB local:
npm run db:migrate

# 4. Commit schema.ts cùng toàn bộ api/drizzle/*.sql và api/drizzle/meta/_journal.json lên Git
```

### 11.7. Cơ Chế Hoàn Nguyên & Xử Lý Sự Cố (Rollback & Recovery Policy)
- **Transaction rollback during failed migration:** Khi một file migration đang chạy gặp lỗi, Drizzle Kit tự động abort transaction của file đó.
- **Schema rollback to previous release:** Nếu migration đã commit, khôi phục từ Snapshot/Backup (`PITR` / `pg_restore`) hoặc tạo một **Forward-fix Migration** mới (`000X_...sql`) để đảo ngược thay đổi một cách có kiểm soát.

### 11.8. Hướng Dẫn Vận Hành Khởi Tạo Admin Ban Đầu (Safe Initial Admin Bootstrap Runbook)

Sau khi cơ sở dữ liệu production đã hoàn tất áp dụng các migration chính thức (`npm run db:migrate`), khởi tạo tài khoản Quản Trị Viên (Admin) đầu tiên qua CLI bảo mật:

```bash
# 1. Chạy kiểm tra thử nghiệm (0 database writes)
npm run bootstrap:admin -- --dry-run

# 2. Chạy khởi tạo tương tác an toàn (nhập mật khẩu ẩn, khóa chống race condition pg_advisory_xact_lock)
npm run bootstrap:admin
```

---

## 12. Quy Chuẩn An Ninh & Tăng Cường Bảo Mật (Security Hardening)

1. **Bật Tường Lửa UFW**:
   ```bash
   sudo ufw default deny incoming
   sudo ufw default allow outgoing
   sudo ufw allow 22/tcp    # SSH
   sudo ufw allow 80/tcp    # HTTP (Let's Encrypt renewal)
   sudo ufw allow 443/tcp   # HTTPS
   sudo ufw enable
   ```
2. **Loại Trừ Secrets Tuyệt Đối**:
   - Tệp `api/.env` nằm trong danh mục `.gitignore`.
   - Mật khẩu SMTP lưu trong bảng `system_settings` được mã hóa bằng thuật toán `AES-256-GCM` với khóa `SETTINGS_ENCRYPTION_KEY`.
3. **Chuẩn Hóa Dữ Liệu Đầu Vào (UUID Sanitization)**:
   - Toàn bộ tham số khóa chính và khóa ngoại đi qua bộ lọc [`api/src/common/uuid.util.ts`](api/src/common/uuid.util.ts), ngăn chặn lỗi injection hoặc lỗi cú pháp PostgreSQL UUID.
4. **Cài Đặt Tự Động Xoay Vòng Nhật Ký (Logrotate)**:
   ```bash
   pm2 install pm2-logrotate
   pm2 set pm2-logrotate:max_size 50M
   pm2 set pm2-logrotate:retain 14
   ```

---

## 13. Giám Sát, Nhật Ký (Logging) & Kiểm Tra Sức Khỏe (Health Check)

### 13.1. Health Check Endpoint
```bash
# Kiểm tra nội bộ (loopback):
curl -I http://localhost:3000/api

# Hoặc qua origin API production thực tế:
curl -I https://ltvietnam.com.vn/api
```
- Phản hồi mong đợi: `HTTP/1.1 200 OK`

### 13.2. Kiểm tra Logs
```bash
sudo tail -f /var/log/nginx/error.log     # Xem log NGINX lỗi
sudo tail -f /var/log/nginx/access.log    # Xem log truy cập Website
pm2 logs ltvn-api --lines 100             # Xem log Backend API
```

---

## 14. Kế Hoạch Ứng Phó Sự Cố & Hoàn Nguyên (Rollback Runbook)

### 14.1. Hoàn nguyên ứng dụng thuần túy (Không có thay đổi Schema Database)
```bash
cd /var/www/ltvn

# Kiểm tra lịch sử commit và lùi về commit ổn định gần nhất
git log --oneline -n 5
git checkout <stable-commit-hash>

# Rebuild các phân hệ và reload Zero-Downtime
npm run build
npm run build:admin
npm run build:api
pm2 reload ltvn-api
sudo systemctl reload nginx
```

### 14.2. Hoàn nguyên khi có Migration Cơ Sở Dữ Liệu (Database Schema Rollback)
1. **Phương án A (Khôi phục từ Snapshot / Backup trước migration — Khuyến nghị)**:
   - Khôi phục database về thời điểm ngay trước khi thực thi migration bằng Point-in-time Restore (PITR) hoặc `pg_restore`:
     ```bash
     pg_restore --clean --if-exists --no-owner -h <db-host> -p <db-port> -U <db-user> -d <db-name> /var/backups/ltvn_db_pre_migration_<timestamp>.dump
     ```
2. **Phương án B (Forward-fix Migration)**:
   - Tạo tệp migration mới (`npm run db:generate` trên local) để sửa chữa cấu trúc gây lỗi, rà soát SQL, commit vào Git và chạy `npm run db:migrate` trên Production.

---

## 15. Bảng Tra Cứu Lệnh Nhanh Cho Kỹ Sư DevOps

```bash
# --- QUẢN TRỊ DỊCH VỤ ---
sudo systemctl status nginx         # Trạng thái NGINX
sudo systemctl reload nginx         # Nạp lại cấu hình NGINX
pm2 status                          # Trạng thái cụm Backend NestJS
pm2 reload ltvn-api                 # Reload Backend không gián đoạn
pm2 logs ltvn-api                   # Xem logs thời gian thực

# --- CẬP NHẬT PHIÊN BẢN MỚI (DEPLOY SCRIPT) ---
cd /var/www/ltvn
git pull origin main
npm ci && npm --prefix admin ci && npm --prefix api ci
npm run build
npm run build:admin
npm run build:api
# Áp dụng migration đã review vào Production DB (Bắt buộc đã có backup/snapshot)
npm run db:migrate
# Tải lại ứng dụng bằng PM2 Cluster
pm2 reload ltvn-api

# --- QUẢN LÝ DATABASE & BẢO MẬT ---
npm run db:migrate                  # Áp dụng versioned migrations lên Production DB
npm run db:backup                   # Chạy kịch bản sao lưu PostgreSQL an toàn
npm run bootstrap:admin             # Khởi tạo tài khoản Admin đầu tiên (chỉ chạy 1 lần)
npm run db:studio                   # Mở giao diện Drizzle Studio (chỉ localhost/dev)
```

---

<div align="center">
  <img src="public/images/brand/ltv-logo.png" alt="LT Việt Nam Logo" width="48" />
  <p>
    <strong>CÔNG TY TNHH KỸ THUẬT LT VIỆT NAM (LT VIETNAM TECHNOLOGY CO., LTD)</strong><br />
    <em>Giải pháp Thiết bị Phân tích Dầu khí Phòng thí nghiệm (PAC) & Van Công nghiệp (Baker Hughes)</em><br />
    Bản quyền © 2026 LT Việt Nam Technology Co., Ltd. Mọi quyền được bảo lưu.
  </p>
</div>

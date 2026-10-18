# HƯỚNG DẪN TRIỂN KHAI VÀ VẬN HÀNH PRODUCTION (PRODUCTION RUNBOOK & DEPLOYMENT GUIDE)

> **Hệ Thống Số Hóa Doanh Nghiệp — LT VIỆT NAM TECHNOLOGY CO., LTD**  
> Bao gồm: **Website Khách Hàng (Client Portal)**, **Cổng Quản Trị (Admin Portal)**, **Backend REST API (NestJS)** và **Cơ Sở Dữ Liệu PostgreSQL (Drizzle ORM & Neon Cloud)**.

---

## 📑 Mục Lục Vận Hành Production

- [1. Kiến Trúc Mạng & Hạ Tầng Production](#1-kiến-trúc-mạng--hạ-tầng-production)
- [2. Yêu Cầu Cấu Hình Máy Chủ (Server Specifications)](#2-yêu-cầu-cấu-hình-máy-chủ-server-specifications)
- [3. Đặc Tả Biến Môi Trường (Environment Variables)](#3-đặc-tả-biến-môi-trường-environment-variables)
- [4. Quy Trình Triển Khai Production Từng Bước (Step-by-Step Deployment)](#4-quy-trình-triển-khai-production-từng-bước-step-by-step-deployment)
- [5. Cấu Hình Reverse Proxy NGINX & Chứng Chỉ SSL](#5-cấu-hình-reverse-proxy-nginx--chứng-chỉ-ssl)
- [6. Quản Lý Tiến Trình Ứng Dụng Với PM2 Cluster](#6-quản-lý-tiến-trình-ứng-dụng-với-pm2-cluster)
- [7. Vận Hành Cơ Sở Dữ Liệu & Migrations Với Drizzle ORM](#7-vận-hành-cơ-sở-dữ-liệu--migrations-với-drizzle-orm)
- [8. Quy Chuẩn An Ninh & Tăng Cường Bảo Mật (Security Hardening)](#8-quy-chuẩn-an-ninh--tăng-cường-bảo-mật-security-hardening)
- [9. Giám Sát, Nhật Ký (Logging) & Kiểm Tra Sức Khỏe (Health Check)](#9-giám-sát-nhật-ký-logging--kiểm-tra-sức-khỏe-health-check)
- [10. Kế Hoạch Ứng Phó Sự Cố & Hoàn Nguyên (Rollback Runbook)](#10-kế-hoạch-ứng-phó-sự-cố--hoàn-nguyên-rollback-runbook)
- [11. Bảng Tra Cứu Lệnh Nhanh Cho Kỹ Sư DevOps](#11-bảng-tra-cứu-lệnh-nhanh-cho-kỹ-sư-devops)

---

## 1. Kiến Trúc Mạng & Hạ Tầng Production

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
                                                       │ 11 Relational Tables   │
                                                       └────────────────────────┘
```

### Các Miền Hoạt Động (Production Domains):
- **Website Chính**: `https://ltvietnam.com.vn` (hoặc `https://www.ltvietnam.com.vn`)
- **Cổng Quản Trị (Admin)**: `https://admin.ltvietnam.com.vn` (hoặc đường dẫn nội bộ `https://ltvietnam.com.vn/admin`)
- **Backend API Gateway**: `https://api.ltvietnam.com.vn` (hoặc route trung tâm `https://ltvietnam.com.vn/api`)
- **Tài liệu Kỹ Thuật API**: `https://ltvietnam.com.vn/api/docs` (Swagger OpenAPI UI)

---

## 2. Yêu Cầu Cấu Hình Máy Chủ (Server Specifications)

### 2.1. Cấu hình phần cứng máy chủ (VPS / Cloud Server):
| Thông Số | Cấu Hình Tối Thiểu (Minimum) | Cấu Hình Khuyến Nghị (Production) |
| :--- | :--- | :--- |
| **CPU** | 2 vCPU Core | 4 vCPU Core (AMD EPYC hoặc Intel Xeon) |
| **RAM** | 2 GB RAM (yêu cầu bật 2GB Swap) | 4 GB - 8 GB RAM |
| **Ổ Cứng (Disk)**| 30 GB SSD / NVMe | 60 GB - 100 GB NVMe SSD |
| **Hệ Điều Hành** | Ubuntu 22.04 LTS / 24.04 LTS | Ubuntu 24.04 LTS Server |
| **Băng Thông** | 1 Gbps Shared Port | 1 Gbps Dedicated Port |

### 2.2. Phần mềm & Runtime bắt buộc:
- **Node.js**: Phiên bản LTS `v22.x` hoặc `v24.x`.
- **NPM**: Đi kèm Node.js.
- **PM2**: Bộ quản lý tiến trình ứng dụng Node.js (`npm install -g pm2`).
- **NGINX**: Phiên bản ổn định mới nhất (`nginx -v` $\ge$ 1.18).
- **Certbot**: Tự động gia hạn chứng chỉ Let's Encrypt SSL.

---

## 3. Đặc Tả Biến Môi Trường (Environment Variables)

### 3.1. Cấu hình Backend (`api/.env` trên Server)
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

# Chuỗi kết nối PostgreSQL (Bắt buộc dùng sslmode=require & connection pooler)
DATABASE_URL=<production-postgresql-url>

# Cấu hình CORS whitelisting an toàn
CORS_ALLOWED_ORIGINS=https://ltvietnam.com.vn,https://www.ltvietnam.com.vn,https://admin.ltvietnam.com.vn

# Cấu hình bộ nhớ đệm và timeout
DB_POOL_MAX=20
DB_TIMEOUT_MS=10000

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
```

> **Lưu ý triển khai Production**:
> - Các hệ thống upstream như NGINX hay Cloudflare WAF có thể bổ sung các tầng lọc DDoS và WAF ở mức mạng/gateway. Tuy nhiên, tầng Distributed Rate Limiting (PostgreSQL-backed) và xác thực Server-side Turnstile CAPTCHA được triển khai ở backend là tầng kiểm soát nghiệp vụ có thẩm quyền (authoritative) độc lập của ứng dụng.
> - Mặc định backend dùng `TRUST_PROXY=false`: kết nối trực tiếp lấy IP của socket và bỏ qua `X-Forwarded-For`. Cấu hình phát hành trong `ecosystem.config.cjs` chỉ dành cho NGINX cùng máy: `HOST=127.0.0.1`, `TRUST_PROXY=loopback`; NGINX phải bổ sung hoặc ghi đè `X-Forwarded-For` theo cấu hình đã kiểm tra.
> - Nếu client truy cập NestJS trực tiếp, dùng `TRUST_PROXY=false` và kiểm soát cổng ở tầng mạng. Với CDN → NGINX → NestJS hoặc NGINX ở mạng container, xác minh chuỗi proxy rồi cấu hình IP/CIDR proxy tin cậy cụ thể; không dùng `true` hay số hop khi chưa kiểm chứng topology. Các topology này chưa được xác minh trong bản vá local.
> - JWT cũ thiếu `tokenVersion` bị từ chối sau migration `0008`. Đổi hoặc reset mật khẩu tăng `users.token_version`, khiến JWT cấp trước đó hết hiệu lực trên server. Logout thông thường chỉ xóa token ở client; JWT bị sao chép vẫn có thể dùng đến khi hết hạn (`JWT_TTL_SECONDS`, mặc định 3600 giây) nếu không đổi/reset mật khẩu.


---

## 4. Quy Trình Triển Khai Production Từng Bước (Step-by-Step Deployment)

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

# Cài đặt root dependencies (Website Chính & Test Scripts)
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
# Cấu hình DATABASE_URL=<production-postgresql-url> và các biến bắt buộc (Ctrl+O, Enter, Ctrl+X)
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
cd <application-release-directory>

# YÊU CẦU BẮT BUỘC: Đã tạo backup/snapshot database trước khi migrate
# Áp dụng toàn bộ versioned migrations đã review và commit (0000, 0001, 0002, 0003, ...)
npm run db:migrate
```
*Quy chuẩn an toàn: TUYỆT ĐỐI KHÔNG sử dụng `npm run db:push` trên Production (xem chi tiết tại Mục 7).*

### Bước 7: Khởi tạo tài khoản Quản trị viên đầu tiên (Initial Admin Bootstrap - PR-05)
Trường hợp cơ sở dữ liệu mới khởi tạo chưa có tài khoản Quản trị viên, thực thi lệnh khởi tạo bảo mật một lần:
```bash
npm run bootstrap:admin -- --dry-run   # Kiểm tra điều kiện tiên quyết (0 database writes)
npm run bootstrap:admin                # Chạy khởi tạo tương tác an toàn (hidden password input)
```
*Chi tiết các bước thực hiện và quy tắc an toàn xem tại [Mục 7.8](#78-hướng-dẫn-vận-hành-khởi-tạo-admin-ban-đầu-safe-initial-admin-bootstrap-runbook---pr-05).*

### Bước 8: Kiểm tra tính toàn vẹn cơ sở dữ liệu trước khi Go-Live
Chạy kịch bản tự động xác thực Drizzle ORM kết nối với PostgreSQL DB:
```bash
npm run test:admin-drizzle
```
*Kết quả phải đạt `Exit Code 0` xác nhận ghi/đọc/xóa cascade 100% thành công.*
---

## 5. Cấu Hình Reverse Proxy NGINX & Chứng Chỉ SSL

### 5.1. Tạo cấu hình Virtual Host NGINX
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

### 5.2. Kích hoạt Virtual Host & Thiết lập Chứng Chỉ SSL Let's Encrypt
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

### 5.3. Luồng Định Tuyến NGINX & Điều Hướng 301 Thống Nhất (Unified 301 Redirect Flow - PR-12A/B)

Hệ thống định tuyến tại tầng NGINX và Backend NestJS tuân thủ nguyên tắc **Nguồn Chân Lý Duy Nhất (Single Source of Truth - PostgreSQL `redirects` table)**:
1. **Không sử dụng static map trong NGINX**: Tránh tình trạng Admin cập nhật cơ sở dữ liệu nhưng NGINX vẫn giữ bản ánh xạ cũ gây lệch pha dữ liệu giữa các tầng.
2. **Nhất quán giữa các tiến trình PM2 (Multi-instance Consistency)**: Khi Admin thêm/sửa/tắt/xóa redirect qua Admin Portal (`/api/redirects`), toàn bộ các worker PM2 đọc trực tiếp bản ghi từ PostgreSQL và phản hồi `HTTP 301` tức thì mà không cần reload NGINX hay restart PM2.
3. **Bảo tồn toàn vẹn SEO Routing (PR-08A/B)**:

```text
HTTP Request tới ltvietnam.com.vn
       │
       ▼
[NGINX Reverse Proxy]
       ├─► /assets/*, /images/* ───────► Phục vụ trực tiếp file tĩnh (Cache 1y / 30d)
       ├─► /api/* ─────────────────────► Proxy tới NestJS API (/api/...)
       ├─► /robots.txt, /sitemap.xml ──► Proxy tới NestJS SEO Controller (PR-08A)
       └─► try_files $uri @backend_html
                   │
                   ▼
       [NestJS Redirect Middleware (PR-12A)]
                   │
                   ├─► Tìm thấy `source_path` đang hoạt động (isActive = true) trong PostgreSQL?
                   │        │
                   │        ├─► CÓ: Trả về HTTP 301 Moved Permanently
                   │        │       Location: destination_path (+ giữ nguyên query string)
                   │        │
                   │        └─► KHÔNG: Tiếp tục next()
                   │
                   ▼
       [NestJS SEO HTML Shell Service (PR-08B)]
                   │
                   ├─► Route Sản Phẩm (/san-pham/:slug) ──► Dynamic SSR Metadata + Client Bundle
                   ├─► Route Tin Tức (/tin-tuc/:slug) ─────► Dynamic SSR Metadata + Client Bundle
                   └─► Route Khác / Fallback ──────────────► React SPA HTML Shell (index.html)
```

**Chính sách chuẩn hóa đường dẫn (Normalization & Security):**
- **Chuẩn hóa tự động**: Khoảng trắng được loại bỏ, dấu gạch chéo kép (`//`) được thu gọn thành `/`, chữ hoa được đưa về chữ thường (`lowercase`), dấu gạch chéo cuối (`trailing slash`) được loại bỏ trước khi so khớp (ví dụ: `/Old-Path/` so khớp với `/old-path`).
- **Bảo lưu Query String**: Mọi tham số truy vấn hợp lệ từ request cũ (ví dụ: `?ref=google&campaign=summer`) được bảo lưu và gắn kèm vào URL mới tại header `Location`.
- **Ngăn chặn Open Redirect**: Nghiêm cấm các URL đích có tiền tố giao thức bên ngoài (`http:`, `https:`), protocol-relative (`//evil.com`), mã hóa URL độc hại hoặc URI scheme nguy hiểm (`javascript:`, `data:`).
- **Ngăn chặn Vòng lặp & Chuỗi (Loop & Chain Prevention)**: Hệ thống từ chối tự chuyển hướng (Self-redirect `A -> A`), vòng lặp đa điểm (`A -> B -> A`, `A -> B -> C -> A`), và chuỗi chuyển hướng (`A -> B` khi đã có `B -> C`).
- **Bảo vệ Reserved Routes**: Không cho phép tạo redirect chiếm các route hệ thống: `/`, `/api`, `/api/*`, `/admin`, `/admin/*`, `/robots.txt`, `/sitemap.xml`, `/assets/*`, `/index.html`, `/favicon.ico`.

---

## 6. Quản Lý Tiến Trình Ứng Dụng Với PM2 Cluster

Hệ thống đã chuẩn bị sẵn tệp [`ecosystem.config.cjs`](ecosystem.config.cjs) hỗ trợ chế độ Cluster Mode, tự động tận dụng tối đa số nhân CPU và tự khởi động lại khi có sự cố.

### 6.1. Khởi chạy Backend với PM2
```bash
cd /var/www/ltvn

# Khởi động cụm ứng dụng trong chế độ Production
pm2 start ecosystem.config.cjs --env production

# Lưu trạng thái tiến trình
pm2 save

# Cấu hình tự khởi động cùng hệ điều hành khi máy chủ reboot
pm2 startup systemd
# Chạy lệnh sudo env PATH... được sinh ra bởi PM2
```

### 6.2. Các lệnh quản lý PM2 thường dùng:
```bash
pm2 status                  # Xem trạng thái CPU / RAM của các tiến trình
pm2 logs ltvn-api           # Xem nhật ký thực thi thời gian thực
pm2 reload ltvn-api         # Tải lại ứng dụng với ZERO-DOWNTIME (Không gián đoạn người dùng)
pm2 restart ltvn-api        # Khởi động lại cưỡng bức
```

---

## 7. Vận Hành Cơ Sở Dữ Liệu & Migrations Với Drizzle ORM

Dự án sử dụng kiến trúc Type-safe ORM của [Drizzle ORM](https://orm.drizzle.team/). Toàn bộ schema cơ sở dữ liệu được định nghĩa và quản trị tập trung tại `api/src/database/schema.ts`. Mọi thay đổi cấu trúc bảng trên môi trường production bắt buộc phải thông qua lịch sử migration chính thức và quy trình kiểm soát chặt chẽ.

### 7.1. Lịch Sử Migration Chính Thức (Official Migration History)
Lịch sử migration của hệ thống được theo dõi và quản lý phiên bản trong Git tại:
- `api/drizzle/*.sql`: Các tệp SQL định nghĩa thay đổi schema theo chuỗi số thứ tự tăng dần (ví dụ: `0000_known_stryfe.sql`, `0001_add_news_event_translations.sql`, `0002_ancient_vapor.sql`, `0003_red_hellfire_club.sql`, ...).
- `api/drizzle/meta/_journal.json`: Nhật ký metadata ghi nhận danh mục, phiên bản và thứ tự thực thi chính thức của các tệp migration.

**Quy tắc bảo toàn lịch sử migration (Immutability Rules):**
1. `api/drizzle/*.sql` và `api/drizzle/meta/_journal.json` là nguồn chân lý duy nhất (single source of truth) cho cấu trúc cơ sở dữ liệu.
2. **KHÔNG** chỉnh sửa nội dung các tệp migration cũ đã được apply vào database production hoặc staging.
3. **KHÔNG** đổi tên các tệp migration đã phát hành (ví dụ: `0000`, `0001`, `0002`, `0003`).
4. **KHÔNG** xóa hoặc regenerate lại lịch sử migration chỉ để làm đẹp mã nguồn. Khi cần thay đổi schema, lập trình viên bắt buộc phải tạo migration mới kế tiếp (`0004`, `0005`, ...) qua quy trình phát triển.

### 7.2. Hợp Đồng Vòng Đời Migration (Migration Lifecycle Contract)
Mọi thay đổi cấu trúc dữ liệu từ phát triển đến vận hành production phải tuân thủ nghiêm ngặt quy trình 7 bước sau:
```text
1. Generate migration during development (chạy npm run db:generate trên local)
→ 2. Review SQL (kỹ sư rà soát kỹ file SQL và tác động dữ liệu)
→ 3. Commit/release migration (đưa migration files vào Git và release package)
→ 4. Backup DB (bắt buộc tạo snapshot / backup DB trước khi apply trên production)
→ 5. Apply migration (chạy npm run db:migrate trên target DB)
→ 6. Verify migration (kiểm tra exit code 0, xác nhận schema và health check)
→ 7. Start/deploy application (khởi động hoặc reload tiến trình NestJS API)
```

### 7.3. CẢNH BÁO QUAN TRỌNG: TUYỆT ĐỐI KHÔNG DÙNG `db:push` TRÊN PRODUCTION
```text
====================================================================
[CẢNH BÁO AN TOÀN VẬN HÀNH DATABASE]
DO NOT use db:push against production/shared databases.
TUYỆT ĐỐI KHÔNG sử dụng "db:push" đối với cơ sở dữ liệu Production hoặc Staging/Shared.
====================================================================
```
**Lý do nghiêm cấm:**
- **Bypass Migration History**: Lệnh `db:push` đồng bộ trực tiếp schema TypeScript vào DB mà **không** ghi nhận vào bảng quản lý `__drizzle_migrations` và tệp nhật ký `_journal.json`.
- **Tạo Schema Drift**: Phá vỡ tính đồng nhất giữa mã nguồn Git và trạng thái thực tế của DB, khiến các lần chạy `db:migrate` sau này bị lỗi xung đột hoặc thất bại hoàn toàn.
- **Không Thể Audit và Rollback An Toàn**: Không có dấu vết lịch sử phiên bản để đối soát (audit trail), gây bất khả thi cho việc hoàn nguyên hoặc ứng cứu sự cố.
- **Nguy Cơ Mất Dữ Liệu Hoặc Đột Biến Không Kiểm Soát**: `db:push` có thể tự ý áp dụng các thao tác phá hủy (như DROP column, thay đổi kiểu dữ liệu) mà không có sự kiểm duyệt trước của kỹ sư.

*Phạm vi cho phép:* Lệnh `npm run db:push` **CHỈ** được sử dụng trong môi trường phát triển cá nhân (local development prototyping) trên database tạm thời của lập trình viên.

### 7.4. Quy Trình Chạy Migration Trên Production (Production Migration Runbook)

Trước khi khởi động hoặc reload ứng dụng trên Production, kỹ sư DevOps/vận hành phải thực thi quy trình migration có kiểm soát theo 3 giai đoạn:

#### Giai đoạn 1: Tiền kiểm tra (Preflight Checklist)
1. **Xác nhận môi trường**: Đảm bảo đang đứng đúng máy chủ và biến môi trường `NODE_ENV=production`.
2. **Xác nhận biến kết nối**: Biến `DATABASE_URL` đã được cấu hình trong `api/.env` (được bảo mật, không log hoặc in giá trị ra console):
   ```text
   DATABASE_URL=<production-postgresql-url>
   ```
3. **Yêu cầu bắt buộc sao lưu (BACKUP / SNAPSHOT REQUIRED)**:
   - **Ưu tiên 1 (Khuyến nghị hàng đầu):** Managed Provider Snapshot / Point-in-time Restore (PITR) trực tiếp từ bảng điều khiển của dịch vụ Cloud Database (ví dụ: Neon Cloud Console, AWS RDS snapshot).
   - **Ưu tiên 2 (Sao lưu logic an toàn với `pg_dump`):**
     Tuyệt đối **không** dán chuỗi kết nối chứa mật khẩu trực tiếp vào câu lệnh CLI (tránh lưu vết mật khẩu trong shell history hoặc danh sách tiến trình `ps`).
     Sử dụng cơ chế xác thực an toàn của PostgreSQL (`~/.pgpass`, biến môi trường phiên làm việc bảo mật `PGPASSWORD`, hoặc để tiện ích tự nhắc nhập mật khẩu):
     ```bash
     # Sao lưu logic an toàn (prompt nhập mật khẩu bảo mật hoặc đọc từ ~/.pgpass)
     pg_dump -h <db-host> -p <db-port> -U <db-user> -d <db-name> \
       --format=custom \
       --file=/var/backups/ltvn_db_pre_migration_$(date +%Y%m%d_%H%M%S).dump

     # Hoặc nếu sử dụng biến môi trường DATABASE_URL đã nạp sẵn trong phiên làm việc bảo mật:
     # pg_dump "$DATABASE_URL" --format=custom --file=/var/backups/ltvn_db_pre_migration_$(date +%Y%m%d_%H%M%S).dump
     ```
4. **Rà soát pending SQL**: Đọc trước nội dung các file SQL mới chưa được áp dụng trong `api/drizzle/` để nắm rõ các lệnh DDL (ALTER TABLE, CREATE TABLE, ADD COLUMN,...).
5. **Xác nhận trạng thái migration hiện tại**: Kiểm tra phiên bản migration gần nhất đã apply để đảm bảo chuỗi tuần tự không bị ngắt quãng.

#### Giai đoạn 2: Áp dụng Migration (Apply Migration)
Thực thi lệnh migration chính thức của dự án từ thư mục gốc dự án (hoặc từ thư mục `api/`):
```bash
cd <application-release-directory>

# Áp dụng toàn bộ versioned migrations đã review vào Production DB
npm run db:migrate
# (Lệnh tương đương nếu đứng trong api: npm --prefix api run db:migrate)
```

#### Giai đoạn 3: Xác thực sau Migration (Verify Migration)
1. **Kiểm tra mã thoát (Exit Code)**: Lệnh `npm run db:migrate` phải hoàn tất với exit code `0`, không có exception hay thông báo lỗi SQL.
2. **Xác nhận schema**: Các bảng, cột hoặc ràng buộc mới mong đợi đã hiện diện trên database (bảng `__drizzle_migrations` ghi nhận bản ghi tương ứng).
3. **Khởi động / Reload ứng dụng**: Tiến hành khởi động hoặc reload tiến trình Backend NestJS bằng bộ quản lý tiến trình của hạ tầng triển khai (ví dụ: `pm2 reload ltvn-api` nếu sử dụng PM2 cluster theo file cấu hình mẫu `ecosystem.config.cjs`, hoặc lệnh tương đương của container/systemd).
4. **Kiểm tra Health Check Endpoint**:
   Đường dẫn kiểm tra sức khỏe chính thức đã được xác thực trong mã nguồn (`AppController`, `@Public()`, global prefix `api`) là route: `GET /api` (trả về HTTP `200 OK` cùng chuỗi greeting).
   ```bash
   # Kiểm tra trên máy chủ cục bộ (loopback):
   curl -I http://localhost:3000/api

   # Kiểm tra qua origin API production thực tế:
   curl -I https://<production-api-origin>/api
   ```
   *Kết quả mong đợi: `HTTP/1.1 200 OK`.*
5. **Kiểm tra Smoke Test nghiệp vụ trọng yếu**: Xác nhận trang quản trị và website tải dữ liệu bình thường, không gặp lỗi 500 phát sinh do sai lệch cấu trúc dữ liệu.

### 7.5. Nguyên Tắc An Toàn Dữ Liệu Mẫu (Seed Safety)
- Lệnh nạp dữ liệu mẫu của dự án:
  ```bash
  npm run db:seed
  ```
  **CHỈ DÙNG CHO MÔI TRƯỜNG DEVELOPMENT / TEST.**
- **CẢNH BÁO BẮT BUỘC:**
  ```text
  Never seed production.
  TUYỆT ĐỐI KHÔNG CHẠY LỆNH SEED TRÊN PRODUCTION.
  ```
- **Cơ chế bảo vệ (Production Guard):** Script `api/src/database/seed.ts` đã được tích hợp cơ chế bảo vệ (PR-06). Khi phát hiện `NODE_ENV === 'production'`, script sẽ lập tức từ chối kết nối và hủy tiến trình với mã lỗi `1`. Dù có cơ chế bảo vệ này, tài liệu vận hành và script triển khai production **tuyệt đối không** được phép triệu gọi lệnh seed.

### 7.6. Hướng Dẫn Dành Cho Developer: Tạo Migration Mới (Local Development)
Khi lập trình viên thực hiện thay đổi mô hình dữ liệu trong `api/src/database/schema.ts`, quy trình sinh file migration diễn ra cục bộ:
```bash
# 1. Sinh file SQL migration mới dựa trên diff giữa schema.ts và api/drizzle/
npm run db:generate
# (Hoặc trong thư mục api: npm --prefix api run db:generate)

# 2. Rà soát cẩn thận file SQL vừa được sinh ra trong api/drizzle/
# 3. Chạy thử nghiệm migration trên DB local:
npm run db:migrate

# 4. Commit schema.ts cùng toàn bộ api/drizzle/*.sql và api/drizzle/meta/_journal.json lên Git
```
*Ghi chú quan trọng:* `npm run db:generate` là bước **của lập trình viên trong giai đoạn phát triển**, hoàn toàn **không** chạy lệnh này trên server production trong quy trình deployment.

### 7.7. Cơ Chế Hoàn Nguyên & Xử Lý Sự Cố (Rollback & Recovery Policy)
Drizzle Kit thực thi migration theo mô hình forward-only và **không** tự động sinh mã down-migration:
1. **Phân biệt Rollback giao dịch và Rollback Schema:**
   - **Transaction rollback during failed migration:** Khi một file migration đang chạy gặp lỗi cú pháp hoặc vi phạm ràng buộc dữ liệu, Drizzle Kit sẽ tự động abort transaction của file đó. Trạng thái cơ sở dữ liệu sẽ được rollback về thời điểm ngay trước khi thực thi file migration bị lỗi.
   - **Schema rollback to previous release:** Nếu migration đã thực thi thành công (transaction đã commit vào DB), hệ thống **không** hỗ trợ lệnh tự động hoàn nguyên schema (không tồn tại lệnh kiểu `db:rollback`).
2. **Quy trình xử lý sự cố khi cần hoàn nguyên:**
   - **Phương án 1 (Khôi phục từ Snapshot/Backup - Snapshot/Backup Restore):** Sử dụng tính năng khôi phục Point-in-time Restore (PITR) / snapshot của nhà cung cấp Cloud Database (Neon) hoặc restore từ file dump logic đã sao lưu trước khi migrate.
   - **Phương án 2 (Forward-fix Migration):** Tạo một file migration mới (`000X_...sql`) trên môi trường dev để đảo ngược thay đổi (ví dụ DROP cột mới thêm hoặc chỉnh lại cấu trúc), review kỹ lưỡng, commit và thực thi `npm run db:migrate` để đưa schema về trạng thái an toàn.

### 7.8. Hướng Dẫn Vận Hành Khởi Tạo Admin Ban Đầu (Safe Initial Admin Bootstrap Runbook - PR-05)

Sau khi cơ sở dữ liệu production đã hoàn tất áp dụng các migration chính thức (`npm run db:migrate`), người vận hành cần khởi tạo tài khoản Quản Trị Viên (Admin) đầu tiên thông qua công cụ dòng lệnh bảo mật:
```bash
npm run bootstrap:admin
# hoặc chạy trực tiếp: node scripts/bootstrap-admin.mjs
```

#### Quy Trình 9 Bước Chuẩn Hóa:
1. **Cấu hình môi trường Production (Configure production environment):**
   - Đảm bảo biến `NODE_ENV=production` và `DATABASE_URL` đã được thiết lập bảo mật trong `api/.env`.
2. **Xác minh kết nối cơ sở dữ liệu (Verify database connection):**
   - Xác nhận có thể kết nối tới PostgreSQL mà không gặp lỗi mạng hoặc thông tin xác thực.
3. **Sao lưu cơ sở dữ liệu phục hồi được (Take verified restorable database backup):**
   - Tạo bản sao lưu khôi phục đầy đủ (full restorable snapshot / `pg_dump`) trước khi thực hiện thay đổi.
   - *Lưu ý quan trọng:* Các bản export hoặc sanitized QA snapshot (chứa dữ liệu đã ẩn mật khẩu/hash) không được coi là bản sao lưu khôi phục toàn vẹn (full restorable backup).
4. **Thực thi Migration chính thức (Run official migrations):**
   - Chạy `npm run db:migrate` để đảm bảo bảng `users` và các bảng liên quan đã sẵn sàng.
5. **Chạy kiểm tra thử nghiệm (Run bootstrap dry-run):**
   - Chạy lệnh kiểm tra tính tương thích và kiểm tra xem database đã có Admin hay chưa mà **hoàn toàn không ghi dữ liệu**:
     ```bash
     npm run bootstrap:admin -- --dry-run
     ```
   - Kết quả hiển thị:
     ```text
     DATABASE CONNECTION:     VERIFIED
     SCHEMA COMPATIBILITY:    VERIFIED
     EXISTING ADMIN CHECK:    VERIFIED (0 admins)
     ELIGIBLE FOR BOOTSTRAP:  YES
     DATABASE WRITES:         0
     ```
6. **Thực thi tạo Admin tương tác an toàn (Run interactive bootstrap):**
   - Chạy lệnh khởi tạo chính thức:
     ```bash
     npm run bootstrap:admin
     ```
   - **Nhập dữ liệu bảo mật:**
     - Nhập Email quản trị viên hợp lệ (ví dụ: `admin@ltvietnam.com.vn`).
     - Nhập Họ và tên quản trị viên.
     - Nhập Mật khẩu mới bằng cơ chế ẩn (hidden input, không echo ra màn hình terminal, không lưu shell history).
     - Xác nhận lại Mật khẩu. Mật khẩu phải tuân thủ nghiêm ngặt chính sách PR-10A (tối thiểu 12 ký tự, chữ hoa, chữ thường, chữ số, ký tự đặc biệt).
     - Xác nhận tạo tài khoản (`yes`).
7. **Xác minh đăng nhập Admin (Verify Admin login):**
   - Đăng nhập vào Cổng Quản Trị (Admin Portal) bằng tài khoản và mật khẩu vừa tạo.
   - Xác nhận nhận được JWT Bearer token và truy cập thành công Dashboard quản trị.
8. **Xác nhận từ chối chạy lại lần hai (Confirm second bootstrap attempt is refused):**
   - Chạy thử lại lệnh `npm run bootstrap:admin`.
   - Hệ thống lập tức từ chối và thông báo: `DATABASE_ALREADY_HAS_ADMIN: Database already contains 1 active administrator account(s). Bootstrap refused.`
9. **Khởi động / Tiếp tục vận hành bình thường (Start/continue normal Admin operations):**
   - Khởi động cụm PM2 (`pm2 start ecosystem.config.cjs --env production`) hoặc reload ứng dụng để phục vụ người dùng.

#### Các Quy Tắc An Ninh Bắt Buộc (Security Guardrails):
- **Không dùng mật khẩu mặc định:** Nghiêm cấm mọi hình thức hardcode mật khẩu mặc định.
- **Không truyền mật khẩu qua CLI:** Nghiêm cấm truyền mật khẩu qua tham số dòng lệnh (`--password=...`). Lệnh CLI sẽ lập tức hủy bỏ với exit code `1` nếu phát hiện cờ chứa thông tin mật khẩu.
- **Không nâng quyền tài khoản hiện có:** Nếu email cung cấp đã thuộc về một tài khoản người dùng khác (ví dụ tài khoản có role `editor`), bootstrap script từ chối thực hiện (`EXISTING_USER_DETECTED`), không tự ý nâng role hay ghi đè mật khẩu.
- **Chống Race Condition (Atomic Concurrency):** Sử dụng khóa giao dịch `pg_advisory_xact_lock` của PostgreSQL để bảo đảm nếu hai kỹ sư cùng chạy script tại một thời điểm, chỉ đúng một tiến trình được phép tạo tài khoản, tiến trình còn lại bị từ chối an toàn.
- **Che giấu thông tin kết nối (Masked Display):** Chuỗi kết nối cơ sở dữ liệu luôn được che giấu tài khoản/mật khẩu khi hiển thị trên màn hình (`postgresql://***:***@host/db`).
---

## 8. Quy Chuẩn An Ninh & Tăng Cường Bảo Mật (Security Hardening)

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
   - Không lưu trữ mật mã tĩnh trong client-side bundles.
3. **Chuẩn Hóa Dữ Liệu Đầu Vào (UUID Sanitization)**:
   - Toàn bộ tham số khóa chính và khóa ngoại đi qua bộ lọc [`api/src/common/uuid.util.ts`](api/src/common/uuid.util.ts), ngăn chặn lỗi injection hoặc lỗi cú pháp PostgreSQL UUID.
4. **Cài Đặt Tự Động Xoay Vòng Nhật Ký (Logrotate)**:
   ```bash
   pm2 install pm2-logrotate
   pm2 set pm2-logrotate:max_size 50M
   pm2 set pm2-logrotate:retain 14
   ```

---

## 9. Giám Sát, Nhật Ký (Logging) & Kiểm Tra Sức Khỏe (Health Check)

### 9.1. Health Check Endpoint
Hệ thống cung cấp endpoint kiểm tra trạng thái hoạt động đã xác thực trong mã nguồn (`GET /api`):
```bash
# Kiểm tra nội bộ (loopback):
curl -I http://localhost:3000/api

# Hoặc qua origin API production thực tế:
curl -I https://<production-api-origin>/api
```
- Phản hồi mong đợi: `HTTP/1.1 200 OK`

### 9.2. Kiểm tra Logs
```bash
# Xem log NGINX lỗi
sudo tail -f /var/log/nginx/error.log

# Xem log truy cập Website
sudo tail -f /var/log/nginx/access.log

# Xem log Backend API
pm2 logs ltvn-api --lines 100
```

---

## 10. Kế Hoạch Ứng Phó Sự Cố & Hoàn Nguyên (Rollback Runbook)

Khi phát hiện bản cập nhật mới có lỗi phát sinh trên Production, đội ngũ kỹ thuật thực hiện hoàn nguyên theo phân loại sự cố:

### 10.1. Hoàn nguyên ứng dụng thuần túy (Không có thay đổi Schema Database)
Nếu lỗi chỉ nằm ở mã nguồn logic frontend hoặc backend (schema DB không thay đổi hoặc thay đổi tương thích ngược hoàn toàn):

#### Bước 1: Hoàn nguyên mã nguồn Git về Commit ổn định trước đó
```bash
cd /var/www/ltvn

# Kiểm tra lịch sử commit
git log --oneline -n 5

# Trả về commit ổn định gần nhất (ví dụ: ffe47f9)
git checkout ffe47f9
```

#### Bước 2: Re-build và Reload dịch vụ với Zero-Downtime
```bash
# Rebuild các phân hệ
npm run build
npm run build:admin
npm run build:api

# Reload cụm tiến trình Backend
pm2 reload ltvn-api

# Xóa cache NGINX nếu cần
sudo systemctl reload nginx
```

### 10.2. Hoàn nguyên khi có Migration Cơ Sở Dữ Liệu (Database Schema Rollback)
**Lưu ý kỹ thuật quan trọng:** Drizzle Kit **không** hỗ trợ lệnh rollback schema tự động (dự án **không có** và **không sử dụng** lệnh giả định kiểu `db:rollback`). Tuyệt đối **không** dùng `db:push` hoặc sửa thủ công file journal để rollback.

Khi bản phát hành có migration gây lỗi, chọn một trong hai phương án phục hồi chuẩn:
1. **Phương án A: Khôi phục từ Snapshot / Backup trước migration (Khuyến nghị)**:
   - Khôi phục database về thời điểm ngay trước khi thực thi migration bằng tính năng Point-in-time Restore (PITR) / snapshot của cloud provider (Neon) đã thực hiện ở bước Preflight.
   - Hoặc restore từ tệp dump logic:
     ```bash
     # Khôi phục an toàn (nhập mật khẩu bảo mật hoặc qua ~/.pgpass, không để lộ secret trên CLI):
     pg_restore --clean --if-exists --no-owner -h <db-host> -p <db-port> -U <db-user> -d <db-name> /var/backups/ltvn_db_pre_migration_<timestamp>.dump
     ```
   - Hoàn nguyên mã nguồn Git tương ứng và reload ứng dụng.
2. **Phương án B: Forward-fix Migration (Khắc phục tiến về phía trước)**:
   - Nếu không thể khôi phục toàn bộ database do đã phát sinh dữ liệu giao dịch mới hợp lệ:
   - Lập trình viên tạo một tệp migration mới (`npm run db:generate` trên local) để hủy bỏ hoặc sửa chữa cấu trúc gây lỗi (ví dụ xóa cột/bảng mới, khôi phục index cũ).
   - Rà soát SQL, commit vào Git và chạy `npm run db:migrate` trên Production.

---

## 11. Bảng Tra Cứu Lệnh Nhanh Cho Kỹ Sư DevOps

```bash
# --- QUẢN TRỊ DỊCH VỤ ---
sudo systemctl status nginx         # Trạng thái NGINX
sudo systemctl reload nginx         # Nạp lại cấu hình NGINX
pm2 status                          # Trạng thái cụm Backend NestJS
pm2 reload ltvn-api                 # Reload Backend không gián đoạn
pm2 logs ltvn-api                   # Xem logs thời gian thực

# --- CẬP NHẬT PHIÊN BẢN MỚI (DEPLOY SCRIPT) ---
cd <application-release-directory>
git pull origin main
npm ci && npm --prefix admin ci && npm --prefix api ci
npm run build
npm run build:admin
npm run build:api
# Áp dụng migration đã review vào Production DB (Bắt buộc đã có backup/snapshot)
npm run db:migrate
# Tải lại ứng dụng bằng process manager (Ví dụ PM2 nếu sử dụng: pm2 reload ltvn-api)
pm2 reload ltvn-api
npm run test:admin-drizzle

# --- QUẢN LÝ DATABASE ---
npm run db:migrate                  # Áp dụng versioned migrations lên Production DB
npm run db:studio                   # Mở giao diện quản trị Drizzle Studio (chỉ localhost/admin)
# Ghi chú: npm run db:push CHỈ dành cho local dev prototyping; TUYỆT ĐỐI KHÔNG chạy trên Production
```

---

*Tài liệu được xây dựng và chuẩn hóa phục vụ vận hành thực tế tại Công ty TNHH Kỹ Thuật LT Việt Nam.*  
*Bản quyền © 2026 LT Việt Nam Technology Co., Ltd. Mọi quyền được bảo lưu.*

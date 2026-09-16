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

# Chuỗi kết nối Neon PostgreSQL (Bắt buộc dùng sslmode=require & connection pooler)
DATABASE_URL=postgresql://neondb_owner:YOUR_STRONG_PASSWORD@ep-sample-pooler.ap-southeast-1.aws.neon.tech/neondb?sslmode=require

# Cấu hình CORS whitelisting an toàn
CORS_ORIGINS=https://ltvietnam.com.vn,https://www.ltvietnam.com.vn,https://admin.ltvietnam.com.vn

# Cấu hình bộ nhớ đệm và timeout
DB_POOL_MAX=20
DB_TIMEOUT_MS=10000
```

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
# Dán nội dung chuỗi DATABASE_URL chuẩn từ Neon Console và lưu lại (Ctrl+O, Enter, Ctrl+X)
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

### Bước 6: Kiểm tra tính toàn vẹn cơ sở dữ liệu trước khi Go-Live
Chạy kịch bản tự động xác thực Drizzle ORM kết nối với Neon DB:
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

    # SPA Routing Fallback
    location / {
        try_files $uri $uri/ /index.html;
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

Dự án sử dụng kiến trúc Type-safe ORM của [Drizzle ORM](https://orm.drizzle.team/). Toàn bộ schema cơ sở dữ liệu được quản trị tập trung tại `api/src/database/schema.ts`.

### 7.1. Đẩy Schema lên Cơ Sở Dữ Liệu Production:
```bash
cd /var/www/ltvn

# Đẩy các thay đổi schema trực tiếp vào PostgreSQL Neon
npm run db:push
```

### 7.2. Tạo file migration SQL phiên bản (Versioned Migrations):
```bash
# Sinh mã SQL migrations trong api/drizzle/
npm run db:generate

# Áp dụng migration vào database
npm run db:migrate
```

### 7.3. Sao lưu (Backup) & Phục hồi cơ sở dữ liệu:
- **Cloud Auto-backup**: Neon PostgreSQL tự động duy trì Point-in-time Restore (PITR) trong vòng 7-30 ngày.
- **Thực hiện sao lưu thủ công qua CLI**:
```bash
pg_dump "postgresql://neondb_owner:PASSWORD@ep-sample-pooler.ap-southeast-1.aws.neon.tech/neondb?sslmode=require" \
  --format=custom \
  --file=/var/backups/ltvn_db_$(date +%Y%m%d_%H%M%S).dump
```

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
Hệ thống cung cấp endpoint kiểm tra trạng thái hoạt động:
```bash
curl -I https://ltvietnam.com.vn/api
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

Khi phát hiện bản cập nhật mới có lỗi phát sinh trên Production, thực hiện quy trình hoàn nguyên trong vòng **dưới 60 giây**:

### Bước 1: Hoàn nguyên mã nguồn Git về Commit ổn định trước đó
```bash
cd /var/www/ltvn

# Kiểm tra lịch sử commit
git log --oneline -n 5

# Trả về commit ổn định (ví dụ: ffe47f9)
git checkout ffe47f9
```

### Bước 2: Re-build và Reload dịch vụ với Zero-Downtime
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
cd /var/www/ltvn
git pull origin main
npm ci && npm --prefix admin ci && npm --prefix api ci
npm run build
npm run build:admin
npm run build:api
pm2 reload ltvn-api
npm run test:admin-drizzle

# --- QUẢN LÝ DATABASE ---
npm run db:push                     # Đồng bộ schema lên Neon DB
npm run db:studio                   # Mở giao diện quản trị Drizzle Studio
```

---

*Tài liệu được xây dựng và chuẩn hóa phục vụ vận hành thực tế tại Công ty TNHH Kỹ Thuật LT Việt Nam.*  
*Bản quyền © 2026 LT Việt Nam Technology Co., Ltd. Mọi quyền được bảo lưu.*
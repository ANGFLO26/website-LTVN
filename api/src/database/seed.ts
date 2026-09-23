import { readFileSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';
import postgres from 'postgres';
import { drizzle } from 'drizzle-orm/postgres-js';
import * as schema from './schema.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

function getDatabaseUrl(): string {
  try {
    const envPath = resolve(__dirname, '../../.env');
    const envContent = readFileSync(envPath, 'utf-8');
    const match = envContent.match(/DATABASE_URL=["']?([^"'\r\n]+)["']?/);
    if (match && match[1]) return match[1];
  } catch {
    // ignore
  }
  return process.env.DATABASE_URL || 'postgresql://postgres:postgres@localhost:5432/ltvn_db';
}

const databaseUrl = getDatabaseUrl();
console.log('🌱 Bắt đầu nạp TOÀN DIỆN 100% dữ liệu từ Website chính vào PostgreSQL...');
console.log(`🔗 Database: ${databaseUrl.replace(/:[^:@]+@/, ':****@')}\n`);

const client = postgres(databaseUrl);
const db = drizzle(client, { schema });

const USERS = {
  admin: '11111111-1111-4111-8111-111111111111',
  editor: '22222222-2222-4222-8222-222222222222',
};

async function seed() {
  try {
    console.log('[1/9] Dọn dẹp dữ liệu cũ...');
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

    console.log('[2/9] Nạp dữ liệu Quản trị viên (Users)...');
    await db.insert(schema.users).values([
      {
        id: USERS.admin,
        email: 'admin@ltvietnam.com.vn',
        passwordHash: '$2a$12$e8xH.z6iKqU8b3pU4jG1..s8x7R9y4jF6n1qP8oR3iK9u7m5v',
        fullName: 'Quản Trị Viên Hệ Thống',
        role: 'admin',
        status: 'active',
        createdAt: new Date('2026-01-10T08:00:00Z'),
        updatedAt: new Date('2026-09-14T22:30:00Z'),
      },
      {
        id: USERS.editor,
        email: 'editor@ltvietnam.com.vn',
        passwordHash: '$2a$12$e8xH.z6iKqU8b3pU4jG1..s8x7R9y4jF6n1qP8oR3iK9u7m5v',
        fullName: 'Biên Tập Kỹ Thuật',
        role: 'editor',
        status: 'active',
        createdAt: new Date('2026-02-15T09:30:00Z'),
        updatedAt: new Date('2026-09-14T14:15:00Z'),
      },
    ]);

    console.log('[3/9] Nạp dữ liệu Kho hình ảnh (Media Assets - 16 ảnh)...');
    await db.insert(schema.mediaAssets).values([
      {
            "id": "a0000000-0000-4000-8000-000000000001",
            "fileName": "optidist-2-official.png",
            "storageKey": "images/products/optidist-2-official.png",
            "publicUrl": "/images/products/optidist-2-official.png",
            "altText": "PAC OptiDist 2 — Thiết bị chưng cất khí quyển tự động",
            "mimeType": "image/png",
            "sizeBytes": 1024000,
            "width": 1200,
            "height": 1200,
            "uploadedBy": "11111111-1111-4111-8111-111111111111"
      },
      {
            "id": "a0000000-0000-4000-8000-000000000002",
            "fileName": "cid-510-transparent.png",
            "storageKey": "images/products/cid-510-transparent.png",
            "publicUrl": "/images/products/cid-510-transparent.png",
            "altText": "Herzog CID 510 — Thiết bị xác định trị số cetane dẫn xuất",
            "mimeType": "image/png",
            "sizeBytes": 1024000,
            "width": 1200,
            "height": 1200,
            "uploadedBy": "11111111-1111-4111-8111-111111111111"
      },
      {
            "id": "a0000000-0000-4000-8000-000000000003",
            "fileName": "hvm-472.jpg",
            "storageKey": "images/products/hvm-472.jpg",
            "publicUrl": "/images/products/hvm-472.jpg",
            "altText": "Herzog HVM 472 — Thiết bị đo độ nhớt động học tự động",
            "mimeType": "image/jpeg",
            "sizeBytes": 256000,
            "width": 1200,
            "height": 1200,
            "uploadedBy": "11111111-1111-4111-8111-111111111111"
      },
      {
            "id": "a0000000-0000-4000-8000-000000000004",
            "fileName": "optiflash.jpg",
            "storageKey": "images/products/optiflash.jpg",
            "publicUrl": "/images/products/optiflash.jpg",
            "altText": "Herzog OptiFlash — Thiết bị đo điểm chớp cháy cốc kín Pensky-Martens",
            "mimeType": "image/jpeg",
            "sizeBytes": 256000,
            "width": 1200,
            "height": 1200,
            "uploadedBy": "11111111-1111-4111-8111-111111111111"
      },
      {
            "id": "a0000000-0000-4000-8000-000000000005",
            "fileName": "hdv-632.jpg",
            "storageKey": "images/products/hdv-632.jpg",
            "publicUrl": "/images/products/hdv-632.jpg",
            "altText": "Herzog HDV 632 — Thiết bị chưng cất tự động ở áp suất chân không",
            "mimeType": "image/jpeg",
            "sizeBytes": 256000,
            "width": 1200,
            "height": 1200,
            "uploadedBy": "11111111-1111-4111-8111-111111111111"
      },
      {
            "id": "a0000000-0000-4000-8000-000000000006",
            "fileName": "hvp-972.jpg",
            "storageKey": "images/products/hvp-972.jpg",
            "publicUrl": "/images/products/hvp-972.jpg",
            "altText": "Herzog HVP 972 — Thiết bị đo áp suất hơi bão hòa tự động",
            "mimeType": "image/jpeg",
            "sizeBytes": 256000,
            "width": 1200,
            "height": 1200,
            "uploadedBy": "11111111-1111-4111-8111-111111111111"
      },
      {
            "id": "a0000000-0000-4000-8000-000000000007",
            "fileName": "valve-21000-transparent.png",
            "storageKey": "images/products/valve-21000-transparent.png",
            "publicUrl": "/images/products/valve-21000-transparent.png",
            "altText": "Masoneilan 21000 Series — Van điều khiển globe hiệu suất cao",
            "mimeType": "image/png",
            "sizeBytes": 1024000,
            "width": 1200,
            "height": 1200,
            "uploadedBy": "11111111-1111-4111-8111-111111111111"
      },
      {
            "id": "a0000000-0000-4000-8000-000000000008",
            "fileName": "svi-ii-ap.png",
            "storageKey": "images/products/svi-ii-ap.png",
            "publicUrl": "/images/products/svi-ii-ap.png",
            "altText": "Masoneilan SVI II AP — Bộ định vị van thông minh",
            "mimeType": "image/png",
            "sizeBytes": 1024000,
            "width": 1200,
            "height": 1200,
            "uploadedBy": "11111111-1111-4111-8111-111111111111"
      },
      {
            "id": "a0000000-0000-4000-8000-000000000009",
            "fileName": "actuator-87-88.png",
            "storageKey": "images/products/actuator-87-88.png",
            "publicUrl": "/images/products/actuator-87-88.png",
            "altText": "Masoneilan 87/88 Series — Bộ truyền động màng lò xo khí nén",
            "mimeType": "image/png",
            "sizeBytes": 1024000,
            "width": 1200,
            "height": 1200,
            "uploadedBy": "11111111-1111-4111-8111-111111111111"
      },
      {
            "id": "a0000000-0000-4000-8000-00000000000a",
            "fileName": "valve-84000.png",
            "storageKey": "images/products/valve-84000.png",
            "publicUrl": "/images/products/valve-84000.png",
            "altText": "Masoneilan 84000 Series — Van điều khiển cho ứng dụng hơi",
            "mimeType": "image/png",
            "sizeBytes": 1024000,
            "width": 1200,
            "height": 1200,
            "uploadedBy": "11111111-1111-4111-8111-111111111111"
      },
      {
            "id": "a0000000-0000-4000-8000-00000000000b",
            "fileName": "consolidated-2700-transparent.png",
            "storageKey": "images/products/consolidated-2700-transparent.png",
            "publicUrl": "/images/products/consolidated-2700-transparent.png",
            "altText": "Consolidated 2700 Series — Van an toàn cho hệ thống CCGT",
            "mimeType": "image/png",
            "sizeBytes": 1024000,
            "width": 1200,
            "height": 1200,
            "uploadedBy": "11111111-1111-4111-8111-111111111111"
      },
      {
            "id": "a0000000-0000-4000-8000-00000000000c",
            "fileName": "consolidated-1900.png",
            "storageKey": "images/products/consolidated-1900.png",
            "publicUrl": "/images/products/consolidated-1900.png",
            "altText": "Consolidated 1900/P Series — Van an toàn và xả áp",
            "mimeType": "image/png",
            "sizeBytes": 1024000,
            "width": 1200,
            "height": 1200,
            "uploadedBy": "11111111-1111-4111-8111-111111111111"
      },
      {
            "id": "a0000000-0000-4000-8000-00000000000d",
            "fileName": "evt-pro.png",
            "storageKey": "images/products/evt-pro.png",
            "publicUrl": "/images/products/evt-pro.png",
            "altText": "Consolidated EVT-Pro — Thiết bị kiểm tra van điện tử",
            "mimeType": "image/png",
            "sizeBytes": 1024000,
            "width": 1200,
            "height": 1200,
            "uploadedBy": "11111111-1111-4111-8111-111111111111"
      },
      {
            "id": "a0000000-0000-4000-8000-00000000000e",
            "fileName": "optidist-2-angle-official.png",
            "storageKey": "images/products/optidist-2-angle-official.png",
            "publicUrl": "/images/products/optidist-2-angle-official.png",
            "altText": "LT Việt Nam hoàn thành lắp đặt và bàn giao PAC OptiDist 2 tại Quatest 2",
            "mimeType": "image/png",
            "sizeBytes": 1200000,
            "width": 1200,
            "height": 800,
            "uploadedBy": "11111111-1111-4111-8111-111111111111"
      },
      {
            "id": "a0000000-0000-4000-8000-00000000000f",
            "fileName": "safety-valve-seminar.jpg",
            "storageKey": "images/news/safety-valve-seminar.jpg",
            "publicUrl": "/images/news/safety-valve-seminar.jpg",
            "altText": "LT Việt Nam phối hợp tổ chức hội thảo bảo dưỡng và kiểm định van an toàn",
            "mimeType": "image/jpeg",
            "sizeBytes": 350000,
            "width": 1200,
            "height": 800,
            "uploadedBy": "11111111-1111-4111-8111-111111111111"
      },
      {
            "id": "a0000000-0000-4000-8000-000000000010",
            "fileName": "phase-dfa-70xi-transparent.png",
            "storageKey": "images/news/phase-dfa-70xi-transparent.png",
            "publicUrl": "/images/news/phase-dfa-70xi-transparent.png",
            "altText": "Chuyển giao thiết bị xác định điểm đông đặc Phase Technology 70Xi tại Skypec",
            "mimeType": "image/png",
            "sizeBytes": 1200000,
            "width": 1200,
            "height": 800,
            "uploadedBy": "11111111-1111-4111-8111-111111111111"
      }
]);

    console.log('[4/9] Nạp dữ liệu Tiêu chuẩn kỹ thuật (Standards - 15 tiêu chuẩn)...');
    await db.insert(schema.standards).values([
      {
        id: 'b0000000-0000-4000-8000-000000000001',
        code: "ASTM D86",
        organization: "ASTM",
        year: 2023,
        title: "Standard Test Method for Distillation of Petroleum Products and Liquid Fuels at Atmospheric Pressure",
        description: "Xác định khoảng chưng cất của các sản phẩm dầu mỏ ở áp suất khí quyển.",
      },
      {
        id: 'b0000000-0000-4000-8000-000000000002',
        code: "ISO 3405",
        organization: "ISO",
        year: 2019,
        title: "Petroleum and related products — Determination of distillation characteristics at atmospheric pressure",
        description: "Tiêu chuẩn quốc tế xác định đặc tính chưng cất ở áp suất khí quyển.",
      },
      {
        id: 'b0000000-0000-4000-8000-000000000003',
        code: "IP 123",
        organization: "Energy Institute",
        year: 2019,
        title: "Petroleum products — Determination of distillation characteristics at atmospheric pressure",
        description: "Phương pháp kiểm nghiệm chưng cất khí quyển theo tiêu chuẩn Viện Năng lượng Anh Quốc.",
      },
      {
        id: 'b0000000-0000-4000-8000-000000000004',
        code: "ASTM D7668",
        organization: "ASTM",
        year: 2022,
        title: "Standard Test Method for Determination of Derived Cetane Number (DCN) of Diesel Fuel Oils",
        description: "Xác định trị số cetane dẫn xuất (DCN) của diesel bằng buồng đốt thể tích không đổi.",
      },
      {
        id: 'b0000000-0000-4000-8000-000000000005',
        code: "ASTM D445",
        organization: "ASTM",
        year: 2021,
        title: "Standard Test Method for Kinematic Viscosity of Transparent and Opaque Liquids",
        description: "Đo độ nhớt động học của chất lỏng trong suốt và mờ đục.",
      },
      {
        id: 'b0000000-0000-4000-8000-000000000006',
        code: "ISO 3104",
        organization: "ISO",
        year: 2020,
        title: "Petroleum products — Transparent and opaque liquids — Determination of kinematic viscosity",
        description: "Tiêu chuẩn ISO xác định độ nhớt động học và tính toán độ nhớt động lực học.",
      },
      {
        id: 'b0000000-0000-4000-8000-000000000007',
        code: "ASTM D93",
        organization: "ASTM",
        year: 2020,
        title: "Standard Test Methods for Flash Point by Pensky-Martens Closed Cup Tester",
        description: "Xác định điểm chớp cháy bằng thiết bị cốc kín Pensky-Martens.",
      },
      {
        id: 'b0000000-0000-4000-8000-000000000008',
        code: "ISO 2719",
        organization: "ISO",
        year: 2016,
        title: "Determination of flash point — Pensky-Martens closed cup method",
        description: "Xác định điểm chớp cháy theo phương pháp cốc kín Pensky-Martens.",
      },
      {
        id: 'b0000000-0000-4000-8000-000000000009',
        code: "ASTM D1160",
        organization: "ASTM",
        year: 2018,
        title: "Standard Test Method for Distillation of Petroleum Products at Reduced Pressure",
        description: "Chưng cất sản phẩm dầu mỏ ở áp suất chân không giảm thấp.",
      },
      {
        id: 'b0000000-0000-4000-8000-00000000000a',
        code: "ISO 6616",
        organization: "ISO",
        year: 2000,
        title: "Petroleum products — Determination of distillation characteristics at reduced pressure",
        description: "Xác định đặc tính chưng cất chân không của các phân đoạn dầu nặng.",
      },
      {
        id: 'b0000000-0000-4000-8000-00000000000b',
        code: "ASTM D5191",
        organization: "ASTM",
        year: 2022,
        title: "Standard Test Method for Vapor Pressure of Petroleum Products and Liquid Fuels (Mini Method)",
        description: "Đo áp suất hơi vi lượng của xăng và nhiên liệu lỏng.",
      },
      {
        id: 'b0000000-0000-4000-8000-00000000000c',
        code: "ASME B16.34",
        organization: "ASME",
        year: 2020,
        title: "Valves Flanged, Threaded and Welding End",
        description: "Tiêu chuẩn thiết kế, áp suất và nhiệt độ cho van mặt bích, nối ren và hàn.",
      },
      {
        id: 'b0000000-0000-4000-8000-00000000000d',
        code: "HART Protocol",
        organization: "FieldComm Group",
        year: 2021,
        title: "Highway Addressable Remote Transducer Protocol",
        description: "Giao thức truyền thông số hai chiều trên nền tín hiệu tương tự 4-20mA.",
      },
      {
        id: 'b0000000-0000-4000-8000-00000000000e',
        code: "ASME Section I",
        organization: "ASME",
        year: 2021,
        title: "Rules for Construction of Power Boilers",
        description: "Quy chuẩn chế tạo nồi hơi và van an toàn áp suất cao trong nhà máy nhiệt điện.",
      },
      {
        id: 'b0000000-0000-4000-8000-00000000000f',
        code: "ASME Section VIII",
        organization: "ASME",
        year: 2021,
        title: "Rules for Construction of Pressure Vessels",
        description: "Quy chuẩn thiết kế và kiểm định bình áp lực và van an toàn công nghiệp.",
      },
      {
        id: 'b0000000-0000-4000-8000-000000000010',
        code: "87/88 Config",
        organization: "Masoneilan",
        year: 2021,
        title: "Pneumatic Spring-Diaphragm Actuation Configuration",
        description: "Cấu hình tác động: 87: khí đóng (air to close) / 88: khí mở (air to open).",
      },
      {
        id: 'b0000000-0000-4000-8000-000000000011',
        code: "In-situ Testing",
        organization: "ASME PTC 25 / Consolidated",
        year: 2022,
        title: "In-situ Safety Valve Set Pressure Testing Method",
        description: "Phương pháp kiểm tra áp suất cài đặt của van an toàn tại vị trí lắp đặt thực tế.",
      },
    ]);

    console.log('[5/9] Nạp dữ liệu Thiết bị & Máy móc (Machines - 13 máy)...');
    await db.insert(schema.machines).values([
      {
        id: 'd0000000-0000-4000-8000-000000000001',
        name: "Thiết bị chưng cất khí quyển tự động (PAC OptiDist 2)",
        slug: "optidist",
        model: "OptiDist 2",
        shortDescription: "Hệ thống chưng cất tự động cho xăng, diesel và nhiên liệu hàng không, hỗ trợ kiểm soát tốc độ chưng cất ổn định.",
        description: "PAC OptiDist 2 - Thiết bị chưng cất khí quyển tự động. Hệ thống chưng cất tự động cho xăng, diesel và nhiên liệu hàng không, hỗ trợ kiểm soát tốc độ chưng cất ổn định.",
        mainImageId: 'a0000000-0000-4000-8000-000000000001',
        status: 'published',
        sortOrder: 1,
        publishedAt: new Date('2026-01-01T00:00:00Z'),
        createdBy: USERS.admin,
      },
      {
        id: 'd0000000-0000-4000-8000-000000000002',
        name: "Thiết bị xác định trị số cetane dẫn xuất (Herzog CID 510)",
        slug: "cid-510",
        model: "CID 510",
        shortDescription: "Phân tích chất lượng cháy của nhiên liệu diesel thông qua phép đo thời gian trễ đánh lửa.",
        description: "Herzog CID 510 - Thiết bị xác định trị số cetane dẫn xuất. Phân tích chất lượng cháy của nhiên liệu diesel thông qua phép đo thời gian trễ đánh lửa.",
        mainImageId: 'a0000000-0000-4000-8000-000000000002',
        status: 'published',
        sortOrder: 2,
        publishedAt: new Date('2026-01-01T00:00:00Z'),
        createdBy: USERS.admin,
      },
      {
        id: 'd0000000-0000-4000-8000-000000000003',
        name: "Thiết bị đo độ nhớt động học tự động (Herzog HVM 472)",
        slug: "hvm-472",
        model: "HVM 472",
        shortDescription: "Hệ thống đo độ nhớt đa dải, hỗ trợ tự động hóa quy trình phân tích sản phẩm dầu mỏ.",
        description: "Herzog HVM 472 - Thiết bị đo độ nhớt động học tự động. Hệ thống đo độ nhớt đa dải, hỗ trợ tự động hóa quy trình phân tích sản phẩm dầu mỏ.",
        mainImageId: 'a0000000-0000-4000-8000-000000000003',
        status: 'published',
        sortOrder: 3,
        publishedAt: new Date('2026-01-01T00:00:00Z'),
        createdBy: USERS.admin,
      },
      {
        id: 'd0000000-0000-4000-8000-000000000004',
        name: "Thiết bị đo điểm chớp cháy cốc kín Pensky-Martens (Herzog OptiFlash)",
        slug: "optiflash-pensky-martens",
        model: "OptiFlash",
        shortDescription: "Thiết bị tự động xác định điểm chớp cháy cho nhiên liệu, dầu nhờn và các sản phẩm dầu mỏ.",
        description: "Herzog OptiFlash - Thiết bị đo điểm chớp cháy cốc kín Pensky-Martens. Thiết bị tự động xác định điểm chớp cháy cho nhiên liệu, dầu nhờn và các sản phẩm dầu mỏ.",
        mainImageId: 'a0000000-0000-4000-8000-000000000004',
        status: 'published',
        sortOrder: 4,
        publishedAt: new Date('2026-01-01T00:00:00Z'),
        createdBy: USERS.admin,
      },
      {
        id: 'd0000000-0000-4000-8000-000000000005',
        name: "Thiết bị chưng cất tự động ở áp suất chân không (Herzog HDV 632)",
        slug: "hdv-632",
        model: "HDV 632",
        shortDescription: "Giải pháp chưng cất chân không cho các sản phẩm dầu mỏ có nhiệt độ sôi cao.",
        description: "Herzog HDV 632 - Thiết bị chưng cất tự động ở áp suất chân không. Giải pháp chưng cất chân không cho các sản phẩm dầu mỏ có nhiệt độ sôi cao.",
        mainImageId: 'a0000000-0000-4000-8000-000000000005',
        status: 'published',
        sortOrder: 5,
        publishedAt: new Date('2026-01-01T00:00:00Z'),
        createdBy: USERS.admin,
      },
      {
        id: 'd0000000-0000-4000-8000-000000000006',
        name: "Thiết bị đo áp suất hơi bão hòa tự động (Herzog HVP 972)",
        slug: "hvp-972",
        model: "HVP 972",
        shortDescription: "Phân tích áp suất hơi của xăng và sản phẩm dầu mỏ trong quy trình kiểm soát chất lượng.",
        description: "Herzog HVP 972 - Thiết bị đo áp suất hơi bão hòa tự động. Phân tích áp suất hơi của xăng và sản phẩm dầu mỏ trong quy trình kiểm soát chất lượng.",
        mainImageId: 'a0000000-0000-4000-8000-000000000006',
        status: 'published',
        sortOrder: 6,
        publishedAt: new Date('2026-01-01T00:00:00Z'),
        createdBy: USERS.admin,
      },
      {
        id: 'd0000000-0000-4000-8000-000000000007',
        name: "Van điều khiển globe hiệu suất cao (Masoneilan 21000 Series)",
        slug: "masoneilan-21000",
        model: "21000 Series",
        shortDescription: "Dòng van điều khiển đa dụng cho các ứng dụng chất lỏng, khí và hơi trong nhà máy công nghiệp.",
        description: "Masoneilan 21000 Series - Van điều khiển globe hiệu suất cao. Dòng van điều khiển đa dụng cho các ứng dụng chất lỏng, khí và hơi trong nhà máy công nghiệp.",
        mainImageId: 'a0000000-0000-4000-8000-000000000007',
        status: 'published',
        sortOrder: 7,
        publishedAt: new Date('2026-01-01T00:00:00Z'),
        createdBy: USERS.admin,
      },
      {
        id: 'd0000000-0000-4000-8000-000000000008',
        name: "Bộ định vị van thông minh (Masoneilan SVI II AP)",
        slug: "svi-ii-ap",
        model: "SVI II AP",
        shortDescription: "Bộ định vị kỹ thuật số hỗ trợ điều khiển chính xác và chẩn đoán tình trạng van.",
        description: "Masoneilan SVI II AP - Bộ định vị van thông minh. Bộ định vị kỹ thuật số hỗ trợ điều khiển chính xác và chẩn đoán tình trạng van.",
        mainImageId: 'a0000000-0000-4000-8000-000000000008',
        status: 'published',
        sortOrder: 8,
        publishedAt: new Date('2026-01-01T00:00:00Z'),
        createdBy: USERS.admin,
      },
      {
        id: 'd0000000-0000-4000-8000-000000000009',
        name: "Bộ truyền động màng lò xo khí nén (Masoneilan 87/88 Series)",
        slug: "actuator-87-88",
        model: "87/88 Series",
        shortDescription: "Bộ truyền động tuyến tính cho van điều khiển Masoneilan với cấu hình tác động thuận hoặc nghịch.",
        description: "Masoneilan 87/88 Series - Bộ truyền động màng lò xo khí nén. Bộ truyền động tuyến tính cho van điều khiển Masoneilan với cấu hình tác động thuận hoặc nghịch.",
        mainImageId: 'a0000000-0000-4000-8000-000000000009',
        status: 'published',
        sortOrder: 9,
        publishedAt: new Date('2026-01-01T00:00:00Z'),
        createdBy: USERS.admin,
      },
      {
        id: 'd0000000-0000-4000-8000-00000000000a',
        name: "Van điều khiển cho ứng dụng hơi (Masoneilan 84000 Series)",
        slug: "masoneilan-84000",
        model: "84000 Series",
        shortDescription: "Van điều khiển được thiết kế cho các điều kiện hơi và chênh áp cao trong nhà máy công nghiệp.",
        description: "Masoneilan 84000 Series - Van điều khiển cho ứng dụng hơi. Van điều khiển được thiết kế cho các điều kiện hơi và chênh áp cao trong nhà máy công nghiệp.",
        mainImageId: 'a0000000-0000-4000-8000-00000000000a',
        status: 'published',
        sortOrder: 10,
        publishedAt: new Date('2026-01-01T00:00:00Z'),
        createdBy: USERS.admin,
      },
      {
        id: 'd0000000-0000-4000-8000-00000000000b',
        name: "Van an toàn cho hệ thống CCGT (Consolidated 2700 Series)",
        slug: "consolidated-2700",
        model: "2700 Series",
        shortDescription: "Dòng van an toàn được thiết kế cho các hệ thống phát điện tuabin khí chu trình hỗn hợp và dịch vụ hơi.",
        description: "Consolidated 2700 Series - Van an toàn cho hệ thống CCGT. Dòng van an toàn được thiết kế cho các hệ thống phát điện tuabin khí chu trình hỗn hợp và dịch vụ hơi.",
        mainImageId: 'a0000000-0000-4000-8000-00000000000b',
        status: 'published',
        sortOrder: 11,
        publishedAt: new Date('2026-01-01T00:00:00Z'),
        createdBy: USERS.admin,
      },
      {
        id: 'd0000000-0000-4000-8000-00000000000c',
        name: "Van an toàn và xả áp (Consolidated 1900/P Series)",
        slug: "consolidated-1900",
        model: "1900/P Series",
        shortDescription: "Dòng van an toàn và xả áp cho ứng dụng hơi, nước bốc hơi và hơi hữu cơ theo ASME Section I.",
        description: "Consolidated 1900/P Series - Van an toàn và xả áp. Dòng van an toàn và xả áp cho ứng dụng hơi, nước bốc hơi và hơi hữu cơ theo ASME Section I.",
        mainImageId: 'a0000000-0000-4000-8000-00000000000c',
        status: 'published',
        sortOrder: 12,
        publishedAt: new Date('2026-01-01T00:00:00Z'),
        createdBy: USERS.admin,
      },
      {
        id: 'd0000000-0000-4000-8000-00000000000d',
        name: "Thiết bị kiểm tra van điện tử (Consolidated EVT-Pro)",
        slug: "evt-pro",
        model: "EVT-Pro",
        shortDescription: "Thiết bị hỗ trợ kiểm tra áp suất cài đặt của van an toàn trong điều kiện lắp đặt thực tế.",
        description: "Consolidated EVT-Pro - Thiết bị kiểm tra van điện tử. Thiết bị hỗ trợ kiểm tra áp suất cài đặt của van an toàn trong điều kiện lắp đặt thực tế.",
        mainImageId: 'a0000000-0000-4000-8000-00000000000d',
        status: 'published',
        sortOrder: 13,
        publishedAt: new Date('2026-01-01T00:00:00Z'),
        createdBy: USERS.admin,
      },
    ]);

    console.log('[6/9] Nạp Gallery hình ảnh bổ sung (Machine Images - 13 ảnh)...');
    await db.insert(schema.machineImages).values([
      {
        id: 'c0000000-0000-4000-8000-000000000001',
        machineId: 'd0000000-0000-4000-8000-000000000001',
        imageId: 'a0000000-0000-4000-8000-000000000001',
        caption: "PAC OptiDist 2",
        sortOrder: 1,
      },
      {
        id: 'c0000000-0000-4000-8000-000000000002',
        machineId: 'd0000000-0000-4000-8000-000000000002',
        imageId: 'a0000000-0000-4000-8000-000000000002',
        caption: "Herzog CID 510",
        sortOrder: 1,
      },
      {
        id: 'c0000000-0000-4000-8000-000000000003',
        machineId: 'd0000000-0000-4000-8000-000000000003',
        imageId: 'a0000000-0000-4000-8000-000000000003',
        caption: "Herzog HVM 472",
        sortOrder: 1,
      },
      {
        id: 'c0000000-0000-4000-8000-000000000004',
        machineId: 'd0000000-0000-4000-8000-000000000004',
        imageId: 'a0000000-0000-4000-8000-000000000004',
        caption: "Herzog OptiFlash",
        sortOrder: 1,
      },
      {
        id: 'c0000000-0000-4000-8000-000000000005',
        machineId: 'd0000000-0000-4000-8000-000000000005',
        imageId: 'a0000000-0000-4000-8000-000000000005',
        caption: "Herzog HDV 632",
        sortOrder: 1,
      },
      {
        id: 'c0000000-0000-4000-8000-000000000006',
        machineId: 'd0000000-0000-4000-8000-000000000006',
        imageId: 'a0000000-0000-4000-8000-000000000006',
        caption: "Herzog HVP 972",
        sortOrder: 1,
      },
      {
        id: 'c0000000-0000-4000-8000-000000000007',
        machineId: 'd0000000-0000-4000-8000-000000000007',
        imageId: 'a0000000-0000-4000-8000-000000000007',
        caption: "Masoneilan 21000 Series",
        sortOrder: 1,
      },
      {
        id: 'c0000000-0000-4000-8000-000000000008',
        machineId: 'd0000000-0000-4000-8000-000000000008',
        imageId: 'a0000000-0000-4000-8000-000000000008',
        caption: "Masoneilan SVI II AP",
        sortOrder: 1,
      },
      {
        id: 'c0000000-0000-4000-8000-000000000009',
        machineId: 'd0000000-0000-4000-8000-000000000009',
        imageId: 'a0000000-0000-4000-8000-000000000009',
        caption: "Masoneilan 87/88 Series",
        sortOrder: 1,
      },
      {
        id: 'c0000000-0000-4000-8000-00000000000a',
        machineId: 'd0000000-0000-4000-8000-00000000000a',
        imageId: 'a0000000-0000-4000-8000-00000000000a',
        caption: "Masoneilan 84000 Series",
        sortOrder: 1,
      },
      {
        id: 'c0000000-0000-4000-8000-00000000000b',
        machineId: 'd0000000-0000-4000-8000-00000000000b',
        imageId: 'a0000000-0000-4000-8000-00000000000b',
        caption: "Consolidated 2700 Series",
        sortOrder: 1,
      },
      {
        id: 'c0000000-0000-4000-8000-00000000000c',
        machineId: 'd0000000-0000-4000-8000-00000000000c',
        imageId: 'a0000000-0000-4000-8000-00000000000c',
        caption: "Consolidated 1900/P Series",
        sortOrder: 1,
      },
      {
        id: 'c0000000-0000-4000-8000-00000000000d',
        machineId: 'd0000000-0000-4000-8000-00000000000d',
        imageId: 'a0000000-0000-4000-8000-00000000000d',
        caption: "Consolidated EVT-Pro",
        sortOrder: 1,
      },
    ]);

    console.log('[7/9] Nạp Ứng dụng, Điểm nổi bật, Thông số kỹ thuật & Tiêu chuẩn từng máy...');
    // 37 Applications
    await db.insert(schema.machineApplications).values([
      {
            "machineId": "d0000000-0000-4000-8000-000000000001",
            "title": "Xăng",
            "description": "Ứng dụng phân tích và kiểm soát trong quy trình: Xăng (Gasoline)",
            "sortOrder": 1
      },
      {
            "machineId": "d0000000-0000-4000-8000-000000000001",
            "title": "Diesel",
            "description": "Ứng dụng phân tích và kiểm soát trong quy trình: Diesel (Diesel)",
            "sortOrder": 2
      },
      {
            "machineId": "d0000000-0000-4000-8000-000000000001",
            "title": "Nhiên liệu hàng không",
            "description": "Ứng dụng phân tích và kiểm soát trong quy trình: Nhiên liệu hàng không (Aviation fuel)",
            "sortOrder": 3
      },
      {
            "machineId": "d0000000-0000-4000-8000-000000000002",
            "title": "Diesel",
            "description": "Ứng dụng phân tích và kiểm soát trong quy trình: Diesel (Diesel)",
            "sortOrder": 1
      },
      {
            "machineId": "d0000000-0000-4000-8000-000000000002",
            "title": "Nhiên liệu sinh học",
            "description": "Ứng dụng phân tích và kiểm soát trong quy trình: Nhiên liệu sinh học (Biofuels)",
            "sortOrder": 2
      },
      {
            "machineId": "d0000000-0000-4000-8000-000000000003",
            "title": "Dầu nhờn",
            "description": "Ứng dụng phân tích và kiểm soát trong quy trình: Dầu nhờn (Lubricating oils)",
            "sortOrder": 1
      },
      {
            "machineId": "d0000000-0000-4000-8000-000000000003",
            "title": "Nhiên liệu",
            "description": "Ứng dụng phân tích và kiểm soát trong quy trình: Nhiên liệu (Fuels)",
            "sortOrder": 2
      },
      {
            "machineId": "d0000000-0000-4000-8000-000000000003",
            "title": "Sản phẩm dầu mỏ",
            "description": "Ứng dụng phân tích và kiểm soát trong quy trình: Sản phẩm dầu mỏ (Petroleum products)",
            "sortOrder": 3
      },
      {
            "machineId": "d0000000-0000-4000-8000-000000000004",
            "title": "Dầu nhờn",
            "description": "Ứng dụng phân tích và kiểm soát trong quy trình: Dầu nhờn (Lubricating oils)",
            "sortOrder": 1
      },
      {
            "machineId": "d0000000-0000-4000-8000-000000000004",
            "title": "Diesel",
            "description": "Ứng dụng phân tích và kiểm soát trong quy trình: Diesel (Diesel)",
            "sortOrder": 2
      },
      {
            "machineId": "d0000000-0000-4000-8000-000000000004",
            "title": "Sản phẩm dầu mỏ",
            "description": "Ứng dụng phân tích và kiểm soát trong quy trình: Sản phẩm dầu mỏ (Petroleum products)",
            "sortOrder": 3
      },
      {
            "machineId": "d0000000-0000-4000-8000-000000000005",
            "title": "Dầu nặng",
            "description": "Ứng dụng phân tích và kiểm soát trong quy trình: Dầu nặng (Heavy oils)",
            "sortOrder": 1
      },
      {
            "machineId": "d0000000-0000-4000-8000-000000000005",
            "title": "Dầu nhờn",
            "description": "Ứng dụng phân tích và kiểm soát trong quy trình: Dầu nhờn (Lubricating oils)",
            "sortOrder": 2
      },
      {
            "machineId": "d0000000-0000-4000-8000-000000000005",
            "title": "Phân đoạn chân không",
            "description": "Ứng dụng phân tích và kiểm soát trong quy trình: Phân đoạn chân không (Vacuum fractions)",
            "sortOrder": 3
      },
      {
            "machineId": "d0000000-0000-4000-8000-000000000006",
            "title": "Xăng",
            "description": "Ứng dụng phân tích và kiểm soát trong quy trình: Xăng (Gasoline)",
            "sortOrder": 1
      },
      {
            "machineId": "d0000000-0000-4000-8000-000000000006",
            "title": "Nhiên liệu",
            "description": "Ứng dụng phân tích và kiểm soát trong quy trình: Nhiên liệu (Fuels)",
            "sortOrder": 2
      },
      {
            "machineId": "d0000000-0000-4000-8000-000000000006",
            "title": "Dung môi nhẹ",
            "description": "Ứng dụng phân tích và kiểm soát trong quy trình: Dung môi nhẹ (Light solvents)",
            "sortOrder": 3
      },
      {
            "machineId": "d0000000-0000-4000-8000-000000000007",
            "title": "Hơi",
            "description": "Ứng dụng phân tích và kiểm soát trong quy trình: Hơi (Steam)",
            "sortOrder": 1
      },
      {
            "machineId": "d0000000-0000-4000-8000-000000000007",
            "title": "Khí",
            "description": "Ứng dụng phân tích và kiểm soát trong quy trình: Khí (Gas)",
            "sortOrder": 2
      },
      {
            "machineId": "d0000000-0000-4000-8000-000000000007",
            "title": "Chất lỏng công nghệ",
            "description": "Ứng dụng phân tích và kiểm soát trong quy trình: Chất lỏng công nghệ (Process liquids)",
            "sortOrder": 3
      },
      {
            "machineId": "d0000000-0000-4000-8000-000000000008",
            "title": "Van điều khiển",
            "description": "Ứng dụng phân tích và kiểm soát trong quy trình: Van điều khiển (Control valves)",
            "sortOrder": 1
      },
      {
            "machineId": "d0000000-0000-4000-8000-000000000008",
            "title": "Chẩn đoán van",
            "description": "Ứng dụng phân tích và kiểm soát trong quy trình: Chẩn đoán van (Valve diagnostics)",
            "sortOrder": 2
      },
      {
            "machineId": "d0000000-0000-4000-8000-000000000008",
            "title": "Điều khiển quá trình",
            "description": "Ứng dụng phân tích và kiểm soát trong quy trình: Điều khiển quá trình (Process control)",
            "sortOrder": 3
      },
      {
            "machineId": "d0000000-0000-4000-8000-000000000009",
            "title": "Van điều khiển tuyến tính",
            "description": "Ứng dụng phân tích và kiểm soát trong quy trình: Van điều khiển tuyến tính (Linear control valves)",
            "sortOrder": 1
      },
      {
            "machineId": "d0000000-0000-4000-8000-000000000009",
            "title": "Hệ thống khí nén",
            "description": "Ứng dụng phân tích và kiểm soát trong quy trình: Hệ thống khí nén (Pneumatic systems)",
            "sortOrder": 2
      },
      {
            "machineId": "d0000000-0000-4000-8000-00000000000a",
            "title": "Hơi",
            "description": "Ứng dụng phân tích và kiểm soát trong quy trình: Hơi (Steam)",
            "sortOrder": 1
      },
      {
            "machineId": "d0000000-0000-4000-8000-00000000000a",
            "title": "Năng lượng",
            "description": "Ứng dụng phân tích và kiểm soát trong quy trình: Năng lượng (Power generation)",
            "sortOrder": 2
      },
      {
            "machineId": "d0000000-0000-4000-8000-00000000000a",
            "title": "Quá trình công nghiệp",
            "description": "Ứng dụng phân tích và kiểm soát trong quy trình: Quá trình công nghiệp (Industrial processes)",
            "sortOrder": 3
      },
      {
            "machineId": "d0000000-0000-4000-8000-00000000000b",
            "title": "Hơi",
            "description": "Ứng dụng phân tích và kiểm soát trong quy trình: Hơi (Steam)",
            "sortOrder": 1
      },
      {
            "machineId": "d0000000-0000-4000-8000-00000000000b",
            "title": "Phát điện",
            "description": "Ứng dụng phân tích và kiểm soát trong quy trình: Phát điện (Power generation)",
            "sortOrder": 2
      },
      {
            "machineId": "d0000000-0000-4000-8000-00000000000b",
            "title": "Hệ thống CCGT",
            "description": "Ứng dụng phân tích và kiểm soát trong quy trình: Hệ thống CCGT (CCGT systems)",
            "sortOrder": 3
      },
      {
            "machineId": "d0000000-0000-4000-8000-00000000000c",
            "title": "Hơi",
            "description": "Ứng dụng phân tích và kiểm soát trong quy trình: Hơi (Steam)",
            "sortOrder": 1
      },
      {
            "machineId": "d0000000-0000-4000-8000-00000000000c",
            "title": "Nước bốc hơi",
            "description": "Ứng dụng phân tích và kiểm soát trong quy trình: Nước bốc hơi (Flashing water)",
            "sortOrder": 2
      },
      {
            "machineId": "d0000000-0000-4000-8000-00000000000c",
            "title": "Hơi hữu cơ",
            "description": "Ứng dụng phân tích và kiểm soát trong quy trình: Hơi hữu cơ (Organic vapor service)",
            "sortOrder": 3
      },
      {
            "machineId": "d0000000-0000-4000-8000-00000000000d",
            "title": "Kiểm định van",
            "description": "Ứng dụng phân tích và kiểm soát trong quy trình: Kiểm định van (Valve testing)",
            "sortOrder": 1
      },
      {
            "machineId": "d0000000-0000-4000-8000-00000000000d",
            "title": "Bảo trì nhà máy",
            "description": "Ứng dụng phân tích và kiểm soát trong quy trình: Bảo trì nhà máy (Plant maintenance)",
            "sortOrder": 2
      },
      {
            "machineId": "d0000000-0000-4000-8000-00000000000d",
            "title": "Van an toàn",
            "description": "Ứng dụng phân tích và kiểm soát trong quy trình: Van an toàn (Safety valves)",
            "sortOrder": 3
      }
]);

    // 39 Highlights
    await db.insert(schema.machineHighlights).values([
      {
            "machineId": "d0000000-0000-4000-8000-000000000001",
            "title": "Vận hành tự động với giao diện trực quan",
            "description": "Vận hành tự động với giao diện trực quan (Automated operation with an intuitive interface)",
            "icon": "zap",
            "sortOrder": 1
      },
      {
            "machineId": "d0000000-0000-4000-8000-000000000001",
            "title": "Kiểm soát tốc độ chưng cất trong suốt phép thử",
            "description": "Kiểm soát tốc độ chưng cất trong suốt phép thử (Controls the distillation rate throughout the test)",
            "icon": "shield",
            "sortOrder": 2
      },
      {
            "machineId": "d0000000-0000-4000-8000-000000000001",
            "title": "Giảm thao tác cài đặt nhiệt thủ công",
            "description": "Giảm thao tác cài đặt nhiệt thủ công (Reduces manual heating setup)",
            "icon": "check-circle",
            "sortOrder": 3
      },
      {
            "machineId": "d0000000-0000-4000-8000-000000000002",
            "title": "Thời gian phân tích ngắn",
            "description": "Thời gian phân tích ngắn (Short analysis time)",
            "icon": "zap",
            "sortOrder": 1
      },
      {
            "machineId": "d0000000-0000-4000-8000-000000000002",
            "title": "Lượng mẫu nhỏ",
            "description": "Lượng mẫu nhỏ (Small sample volume)",
            "icon": "shield",
            "sortOrder": 2
      },
      {
            "machineId": "d0000000-0000-4000-8000-000000000002",
            "title": "Phù hợp phòng thí nghiệm kiểm soát chất lượng",
            "description": "Phù hợp phòng thí nghiệm kiểm soát chất lượng (Suitable for quality control laboratories)",
            "icon": "check-circle",
            "sortOrder": 3
      },
      {
            "machineId": "d0000000-0000-4000-8000-000000000003",
            "title": "Đo tự động nhiều dải độ nhớt",
            "description": "Đo tự động nhiều dải độ nhớt (Automatic measurement across multiple viscosity ranges)",
            "icon": "zap",
            "sortOrder": 1
      },
      {
            "machineId": "d0000000-0000-4000-8000-000000000003",
            "title": "Giảm thời gian thao tác của kỹ thuật viên",
            "description": "Giảm thời gian thao tác của kỹ thuật viên (Reduces operator handling time)",
            "icon": "shield",
            "sortOrder": 2
      },
      {
            "machineId": "d0000000-0000-4000-8000-000000000003",
            "title": "Quản lý kết quả trên giao diện tích hợp",
            "description": "Quản lý kết quả trên giao diện tích hợp (Manages results through the integrated interface)",
            "icon": "check-circle",
            "sortOrder": 3
      },
      {
            "machineId": "d0000000-0000-4000-8000-000000000004",
            "title": "Nhận biết điểm chớp cháy tự động",
            "description": "Nhận biết điểm chớp cháy tự động (Automatic flash point detection)",
            "icon": "zap",
            "sortOrder": 1
      },
      {
            "machineId": "d0000000-0000-4000-8000-000000000004",
            "title": "Kiểm soát gia nhiệt chính xác",
            "description": "Kiểm soát gia nhiệt chính xác (Precise heating control)",
            "icon": "shield",
            "sortOrder": 2
      },
      {
            "machineId": "d0000000-0000-4000-8000-000000000004",
            "title": "Hỗ trợ quy trình an toàn trong phòng thí nghiệm",
            "description": "Hỗ trợ quy trình an toàn trong phòng thí nghiệm (Supports safer laboratory workflows)",
            "icon": "check-circle",
            "sortOrder": 3
      },
      {
            "machineId": "d0000000-0000-4000-8000-000000000005",
            "title": "Kiểm soát áp suất chân không",
            "description": "Kiểm soát áp suất chân không (Vacuum pressure control)",
            "icon": "zap",
            "sortOrder": 1
      },
      {
            "machineId": "d0000000-0000-4000-8000-000000000005",
            "title": "Tự động ghi nhận nhiệt độ và thể tích",
            "description": "Tự động ghi nhận nhiệt độ và thể tích (Automatically records temperature and volume)",
            "icon": "shield",
            "sortOrder": 2
      },
      {
            "machineId": "d0000000-0000-4000-8000-000000000005",
            "title": "Thiết kế phù hợp phòng thí nghiệm công nghiệp",
            "description": "Thiết kế phù hợp phòng thí nghiệm công nghiệp (Designed for industrial laboratories)",
            "icon": "check-circle",
            "sortOrder": 3
      },
      {
            "machineId": "d0000000-0000-4000-8000-000000000006",
            "title": "Chuẩn bị mẫu đơn giản",
            "description": "Chuẩn bị mẫu đơn giản (Simple sample preparation)",
            "icon": "zap",
            "sortOrder": 1
      },
      {
            "machineId": "d0000000-0000-4000-8000-000000000006",
            "title": "Điều khiển nhiệt độ tự động",
            "description": "Điều khiển nhiệt độ tự động (Automatic temperature control)",
            "icon": "shield",
            "sortOrder": 2
      },
      {
            "machineId": "d0000000-0000-4000-8000-000000000006",
            "title": "Kết quả nhanh và dễ theo dõi",
            "description": "Kết quả nhanh và dễ theo dõi (Fast, easy-to-track results)",
            "icon": "check-circle",
            "sortOrder": 3
      },
      {
            "machineId": "d0000000-0000-4000-8000-000000000007",
            "title": "Cấu trúc thân van globe",
            "description": "Cấu trúc thân van globe (Globe-style valve body)",
            "icon": "zap",
            "sortOrder": 1
      },
      {
            "machineId": "d0000000-0000-4000-8000-000000000007",
            "title": "Nhiều lựa chọn trim và vật liệu",
            "description": "Nhiều lựa chọn trim và vật liệu (Multiple trim and material options)",
            "icon": "shield",
            "sortOrder": 2
      },
      {
            "machineId": "d0000000-0000-4000-8000-000000000007",
            "title": "Phù hợp nhiều điều kiện công nghệ",
            "description": "Phù hợp nhiều điều kiện công nghệ (Suitable for a wide range of process conditions)",
            "icon": "check-circle",
            "sortOrder": 3
      },
      {
            "machineId": "d0000000-0000-4000-8000-000000000008",
            "title": "Hiệu chỉnh và cài đặt số",
            "description": "Hiệu chỉnh và cài đặt số (Digital calibration and configuration)",
            "icon": "zap",
            "sortOrder": 1
      },
      {
            "machineId": "d0000000-0000-4000-8000-000000000008",
            "title": "Hỗ trợ chẩn đoán tình trạng van",
            "description": "Hỗ trợ chẩn đoán tình trạng van (Supports valve condition diagnostics)",
            "icon": "shield",
            "sortOrder": 2
      },
      {
            "machineId": "d0000000-0000-4000-8000-000000000008",
            "title": "Tích hợp vào hệ thống điều khiển",
            "description": "Tích hợp vào hệ thống điều khiển (Integrates with process control systems)",
            "icon": "check-circle",
            "sortOrder": 3
      },
      {
            "machineId": "d0000000-0000-4000-8000-000000000009",
            "title": "Cấu trúc màng lò xo",
            "description": "Cấu trúc màng lò xo (Spring-diaphragm construction)",
            "icon": "zap",
            "sortOrder": 1
      },
      {
            "machineId": "d0000000-0000-4000-8000-000000000009",
            "title": "Dễ bảo trì và hiệu chỉnh",
            "description": "Dễ bảo trì và hiệu chỉnh (Easy to maintain and calibrate)",
            "icon": "shield",
            "sortOrder": 2
      },
      {
            "machineId": "d0000000-0000-4000-8000-000000000009",
            "title": "Tương thích nhiều dòng van Masoneilan",
            "description": "Tương thích nhiều dòng van Masoneilan (Compatible with multiple Masoneilan valve series)",
            "icon": "check-circle",
            "sortOrder": 3
      },
      {
            "machineId": "d0000000-0000-4000-8000-00000000000a",
            "title": "Thiết kế cho điều kiện hơi",
            "description": "Thiết kế cho điều kiện hơi (Designed for steam service)",
            "icon": "zap",
            "sortOrder": 1
      },
      {
            "machineId": "d0000000-0000-4000-8000-00000000000a",
            "title": "Kiểm soát dòng chảy ổn định",
            "description": "Kiểm soát dòng chảy ổn định (Stable flow control)",
            "icon": "shield",
            "sortOrder": 2
      },
      {
            "machineId": "d0000000-0000-4000-8000-00000000000a",
            "title": "Nhiều lựa chọn cấu hình",
            "description": "Nhiều lựa chọn cấu hình (Multiple configuration options)",
            "icon": "check-circle",
            "sortOrder": 3
      },
      {
            "machineId": "d0000000-0000-4000-8000-00000000000b",
            "title": "Thiết kế bảo vệ quá áp",
            "description": "Thiết kế bảo vệ quá áp (Designed for overpressure protection)",
            "icon": "zap",
            "sortOrder": 1
      },
      {
            "machineId": "d0000000-0000-4000-8000-00000000000b",
            "title": "Thiết kế hướng đến ứng dụng CCGT",
            "description": "Thiết kế hướng đến ứng dụng CCGT (Designed for CCGT applications)",
            "icon": "shield",
            "sortOrder": 2
      },
      {
            "machineId": "d0000000-0000-4000-8000-00000000000b",
            "title": "Cấu trúc lò xo cho dịch vụ hơi",
            "description": "Cấu trúc lò xo cho dịch vụ hơi (Spring-loaded construction for steam service)",
            "icon": "check-circle",
            "sortOrder": 3
      },
      {
            "machineId": "d0000000-0000-4000-8000-00000000000c",
            "title": "Đế Thermodisc hỗ trợ độ kín trong dịch vụ hơi",
            "description": "Đế Thermodisc hỗ trợ độ kín trong dịch vụ hơi (Thermodisc seat supports tightness in steam service)",
            "icon": "zap",
            "sortOrder": 1
      },
      {
            "machineId": "d0000000-0000-4000-8000-00000000000c",
            "title": "Có cấu hình thông thường và balanced bellows",
            "description": "Có cấu hình thông thường và balanced bellows (Available in conventional and balanced-bellows configurations)",
            "icon": "shield",
            "sortOrder": 2
      },
      {
            "machineId": "d0000000-0000-4000-8000-00000000000c",
            "title": "Có cấu hình lò xo lộ thiên để làm mát",
            "description": "Có cấu hình lò xo lộ thiên để làm mát (Available with an exposed-spring configuration for cooling)",
            "icon": "check-circle",
            "sortOrder": 3
      },
      {
            "machineId": "d0000000-0000-4000-8000-00000000000d",
            "title": "Kiểm tra tại vị trí lắp đặt",
            "description": "Kiểm tra tại vị trí lắp đặt (Testing at the installed location)",
            "icon": "zap",
            "sortOrder": 1
      },
      {
            "machineId": "d0000000-0000-4000-8000-00000000000d",
            "title": "Giảm thời gian tháo lắp van",
            "description": "Giảm thời gian tháo lắp van (Reduces valve removal and reinstallation time)",
            "icon": "shield",
            "sortOrder": 2
      },
      {
            "machineId": "d0000000-0000-4000-8000-00000000000d",
            "title": "Hỗ trợ lưu và đánh giá kết quả",
            "description": "Hỗ trợ lưu và đánh giá kết quả (Supports result storage and evaluation)",
            "icon": "check-circle",
            "sortOrder": 3
      }
]);

    // 39 Specifications
    await db.insert(schema.machineSpecs).values([
      {
            "machineId": "d0000000-0000-4000-8000-000000000001",
            "groupName": "Chưng cất",
            "specName": "Phương pháp",
            "specValue": "Chưng cất khí quyển tự động",
            "unit": null,
            "sortOrder": 1
      },
      {
            "machineId": "d0000000-0000-4000-8000-000000000001",
            "groupName": "Chưng cất",
            "specName": "Mẫu thử",
            "specValue": "Sản phẩm dầu mỏ và nhiên liệu",
            "unit": null,
            "sortOrder": 2
      },
      {
            "machineId": "d0000000-0000-4000-8000-000000000001",
            "groupName": "Chưng cất",
            "specName": "Điều khiển",
            "specValue": "Màn hình cảm ứng tích hợp",
            "unit": null,
            "sortOrder": 3
      },
      {
            "machineId": "d0000000-0000-4000-8000-000000000002",
            "groupName": "Chỉ số cetane",
            "specName": "Kết quả",
            "specValue": "Trị số cetane dẫn xuất",
            "unit": null,
            "sortOrder": 1
      },
      {
            "machineId": "d0000000-0000-4000-8000-000000000002",
            "groupName": "Chỉ số cetane",
            "specName": "Phương pháp",
            "specValue": "Buồng đốt thể tích không đổi",
            "unit": null,
            "sortOrder": 2
      },
      {
            "machineId": "d0000000-0000-4000-8000-000000000002",
            "groupName": "Chỉ số cetane",
            "specName": "Ứng dụng",
            "specValue": "Kiểm soát chất lượng nhiên liệu diesel",
            "unit": null,
            "sortOrder": 3
      },
      {
            "machineId": "d0000000-0000-4000-8000-000000000003",
            "groupName": "Độ nhớt",
            "specName": "Đại lượng",
            "specValue": "Độ nhớt động học",
            "unit": null,
            "sortOrder": 1
      },
      {
            "machineId": "d0000000-0000-4000-8000-000000000003",
            "groupName": "Độ nhớt",
            "specName": "Phương pháp",
            "specValue": "Ống mao quản tự động",
            "unit": null,
            "sortOrder": 2
      },
      {
            "machineId": "d0000000-0000-4000-8000-000000000003",
            "groupName": "Độ nhớt",
            "specName": "Điều khiển nhiệt",
            "specValue": "Bể ổn nhiệt tích hợp",
            "unit": null,
            "sortOrder": 3
      },
      {
            "machineId": "d0000000-0000-4000-8000-000000000004",
            "groupName": "Điểm chớp cháy",
            "specName": "Cốc thử",
            "specValue": "Pensky-Martens cốc kín",
            "unit": null,
            "sortOrder": 1
      },
      {
            "machineId": "d0000000-0000-4000-8000-000000000004",
            "groupName": "Điểm chớp cháy",
            "specName": "Đánh lửa",
            "specValue": "Tự động",
            "unit": null,
            "sortOrder": 2
      },
      {
            "machineId": "d0000000-0000-4000-8000-000000000004",
            "groupName": "Điểm chớp cháy",
            "specName": "Hiển thị",
            "specValue": "Màn hình điều khiển tích hợp",
            "unit": null,
            "sortOrder": 3
      },
      {
            "machineId": "d0000000-0000-4000-8000-000000000005",
            "groupName": "Chưng cất",
            "specName": "Phương pháp",
            "specValue": "Chưng cất chân không",
            "unit": null,
            "sortOrder": 1
      },
      {
            "machineId": "d0000000-0000-4000-8000-000000000005",
            "groupName": "Chưng cất",
            "specName": "Điều khiển áp suất",
            "specValue": "Tự động",
            "unit": null,
            "sortOrder": 2
      },
      {
            "machineId": "d0000000-0000-4000-8000-000000000005",
            "groupName": "Chưng cất",
            "specName": "Dữ liệu",
            "specValue": "Ghi nhận và xuất báo cáo",
            "unit": null,
            "sortOrder": 3
      },
      {
            "machineId": "d0000000-0000-4000-8000-000000000006",
            "groupName": "Áp suất hơi",
            "specName": "Đại lượng",
            "specValue": "Áp suất hơi",
            "unit": null,
            "sortOrder": 1
      },
      {
            "machineId": "d0000000-0000-4000-8000-000000000006",
            "groupName": "Áp suất hơi",
            "specName": "Mẫu thử",
            "specValue": "Xăng và sản phẩm nhẹ",
            "unit": null,
            "sortOrder": 2
      },
      {
            "machineId": "d0000000-0000-4000-8000-000000000006",
            "groupName": "Áp suất hơi",
            "specName": "Vận hành",
            "specValue": "Tự động",
            "unit": null,
            "sortOrder": 3
      },
      {
            "machineId": "d0000000-0000-4000-8000-000000000007",
            "groupName": "Van điều khiển",
            "specName": "Kiểu van",
            "specValue": "Van điều khiển globe",
            "unit": null,
            "sortOrder": 1
      },
      {
            "machineId": "d0000000-0000-4000-8000-000000000007",
            "groupName": "Van điều khiển",
            "specName": "Thương hiệu",
            "specValue": "Masoneilan",
            "unit": null,
            "sortOrder": 2
      },
      {
            "machineId": "d0000000-0000-4000-8000-000000000007",
            "groupName": "Van điều khiển",
            "specName": "Ứng dụng",
            "specValue": "Điều khiển lưu lượng và áp suất",
            "unit": null,
            "sortOrder": 3
      },
      {
            "machineId": "d0000000-0000-4000-8000-000000000008",
            "groupName": "Bộ định vị",
            "specName": "Thiết bị",
            "specValue": "Bộ định vị van kỹ thuật số",
            "unit": null,
            "sortOrder": 1
      },
      {
            "machineId": "d0000000-0000-4000-8000-000000000008",
            "groupName": "Bộ định vị",
            "specName": "Giao tiếp",
            "specValue": "HART",
            "unit": null,
            "sortOrder": 2
      },
      {
            "machineId": "d0000000-0000-4000-8000-000000000008",
            "groupName": "Bộ định vị",
            "specName": "Lắp đặt",
            "specValue": "Trên bộ truyền động van",
            "unit": null,
            "sortOrder": 3
      },
      {
            "machineId": "d0000000-0000-4000-8000-000000000009",
            "groupName": "Bộ truyền động",
            "specName": "Kiểu",
            "specValue": "Bộ truyền động màng lò xo",
            "unit": null,
            "sortOrder": 1
      },
      {
            "machineId": "d0000000-0000-4000-8000-000000000009",
            "groupName": "Bộ truyền động",
            "specName": "Nguồn điều khiển",
            "specValue": "Khí nén",
            "unit": null,
            "sortOrder": 2
      },
      {
            "machineId": "d0000000-0000-4000-8000-000000000009",
            "groupName": "Bộ truyền động",
            "specName": "Chuyển động",
            "specValue": "Tuyến tính",
            "unit": null,
            "sortOrder": 3
      },
      {
            "machineId": "d0000000-0000-4000-8000-00000000000a",
            "groupName": "Van điều khiển",
            "specName": "Kiểu van",
            "specValue": "Van điều khiển hơi",
            "unit": null,
            "sortOrder": 1
      },
      {
            "machineId": "d0000000-0000-4000-8000-00000000000a",
            "groupName": "Van điều khiển",
            "specName": "Thương hiệu",
            "specValue": "Masoneilan",
            "unit": null,
            "sortOrder": 2
      },
      {
            "machineId": "d0000000-0000-4000-8000-00000000000a",
            "groupName": "Van điều khiển",
            "specName": "Dịch vụ",
            "specValue": "Hơi và môi chất nhiệt độ cao",
            "unit": null,
            "sortOrder": 3
      },
      {
            "machineId": "d0000000-0000-4000-8000-00000000000b",
            "groupName": "Van an toàn",
            "specName": "Kiểu van",
            "specValue": "Van an toàn lò xo",
            "unit": null,
            "sortOrder": 1
      },
      {
            "machineId": "d0000000-0000-4000-8000-00000000000b",
            "groupName": "Van an toàn",
            "specName": "Thương hiệu",
            "specValue": "Consolidated",
            "unit": null,
            "sortOrder": 2
      },
      {
            "machineId": "d0000000-0000-4000-8000-00000000000b",
            "groupName": "Van an toàn",
            "specName": "Ứng dụng chính",
            "specValue": "Phát điện tuabin khí chu trình hỗn hợp",
            "unit": null,
            "sortOrder": 3
      },
      {
            "machineId": "d0000000-0000-4000-8000-00000000000c",
            "groupName": "Van an toàn",
            "specName": "Kiểu van",
            "specValue": "Van an toàn và xả áp",
            "unit": null,
            "sortOrder": 1
      },
      {
            "machineId": "d0000000-0000-4000-8000-00000000000c",
            "groupName": "Van an toàn",
            "specName": "Thương hiệu",
            "specValue": "Consolidated",
            "unit": null,
            "sortOrder": 2
      },
      {
            "machineId": "d0000000-0000-4000-8000-00000000000c",
            "groupName": "Van an toàn",
            "specName": "Lưu chất",
            "specValue": "Hơi, nước bốc hơi và hơi hữu cơ",
            "unit": null,
            "sortOrder": 3
      },
      {
            "machineId": "d0000000-0000-4000-8000-00000000000d",
            "groupName": "Thiết bị kiểm tra",
            "specName": "Thiết bị",
            "specValue": "Thiết bị kiểm tra van điện tử",
            "unit": null,
            "sortOrder": 1
      },
      {
            "machineId": "d0000000-0000-4000-8000-00000000000d",
            "groupName": "Thiết bị kiểm tra",
            "specName": "Ứng dụng",
            "specValue": "Kiểm tra van an toàn tại chỗ",
            "unit": null,
            "sortOrder": 2
      },
      {
            "machineId": "d0000000-0000-4000-8000-00000000000d",
            "groupName": "Thiết bị kiểm tra",
            "specName": "Dữ liệu",
            "specValue": "Ghi nhận kết quả điện tử",
            "unit": null,
            "sortOrder": 3
      }
]);

    // Machine Standards (Liên kết N-N)
    await db.insert(schema.machineStandards).values([
      {
            "machineId": "d0000000-0000-4000-8000-000000000001",
            "standardId": "b0000000-0000-4000-8000-000000000001",
            "note": "Phương pháp tiêu chuẩn áp dụng: ASTM D86",
            "sortOrder": 1
      },
      {
            "machineId": "d0000000-0000-4000-8000-000000000001",
            "standardId": "b0000000-0000-4000-8000-000000000002",
            "note": "Phương pháp tiêu chuẩn áp dụng: ISO 3405",
            "sortOrder": 2
      },
      {
            "machineId": "d0000000-0000-4000-8000-000000000001",
            "standardId": "b0000000-0000-4000-8000-000000000003",
            "note": "Phương pháp tiêu chuẩn áp dụng: IP 123",
            "sortOrder": 3
      },
      {
            "machineId": "d0000000-0000-4000-8000-000000000002",
            "standardId": "b0000000-0000-4000-8000-000000000004",
            "note": "Phương pháp tiêu chuẩn áp dụng: ASTM D7668",
            "sortOrder": 1
      },
      {
            "machineId": "d0000000-0000-4000-8000-000000000003",
            "standardId": "b0000000-0000-4000-8000-000000000005",
            "note": "Phương pháp tiêu chuẩn áp dụng: ASTM D445",
            "sortOrder": 1
      },
      {
            "machineId": "d0000000-0000-4000-8000-000000000003",
            "standardId": "b0000000-0000-4000-8000-000000000006",
            "note": "Phương pháp tiêu chuẩn áp dụng: ISO 3104",
            "sortOrder": 2
      },
      {
            "machineId": "d0000000-0000-4000-8000-000000000004",
            "standardId": "b0000000-0000-4000-8000-000000000007",
            "note": "Phương pháp tiêu chuẩn áp dụng: ASTM D93",
            "sortOrder": 1
      },
      {
            "machineId": "d0000000-0000-4000-8000-000000000004",
            "standardId": "b0000000-0000-4000-8000-000000000008",
            "note": "Phương pháp tiêu chuẩn áp dụng: ISO 2719",
            "sortOrder": 2
      },
      {
            "machineId": "d0000000-0000-4000-8000-000000000005",
            "standardId": "b0000000-0000-4000-8000-000000000009",
            "note": "Phương pháp tiêu chuẩn áp dụng: ASTM D1160",
            "sortOrder": 1
      },
      {
            "machineId": "d0000000-0000-4000-8000-000000000005",
            "standardId": "b0000000-0000-4000-8000-00000000000a",
            "note": "Phương pháp tiêu chuẩn áp dụng: ISO 6616",
            "sortOrder": 2
      },
      {
            "machineId": "d0000000-0000-4000-8000-000000000006",
            "standardId": "b0000000-0000-4000-8000-00000000000b",
            "note": "Phương pháp tiêu chuẩn áp dụng: ASTM D5191",
            "sortOrder": 1
      },
      {
            "machineId": "d0000000-0000-4000-8000-000000000007",
            "standardId": "b0000000-0000-4000-8000-00000000000c",
            "note": "Phương pháp tiêu chuẩn áp dụng: ASME B16.34",
            "sortOrder": 1
      },
      {
            "machineId": "d0000000-0000-4000-8000-000000000008",
            "standardId": "b0000000-0000-4000-8000-00000000000d",
            "note": "Phương pháp tiêu chuẩn áp dụng: HART hai chiều",
            "sortOrder": 1
      },
      {
            "machineId": "d0000000-0000-4000-8000-00000000000a",
            "standardId": "b0000000-0000-4000-8000-00000000000c",
            "note": "Phương pháp tiêu chuẩn áp dụng: ASME B16.34",
            "sortOrder": 1
      },
      {
            "machineId": "d0000000-0000-4000-8000-00000000000b",
            "standardId": "b0000000-0000-4000-8000-00000000000e",
            "note": "Phương pháp tiêu chuẩn áp dụng: ASME Section I",
            "sortOrder": 1
      },
      {
            "machineId": "d0000000-0000-4000-8000-00000000000b",
            "standardId": "b0000000-0000-4000-8000-00000000000f",
            "note": "Phương pháp tiêu chuẩn áp dụng: ASME Section VIII",
            "sortOrder": 2
      },
      {
            "machineId": "d0000000-0000-4000-8000-00000000000c",
            "standardId": "b0000000-0000-4000-8000-00000000000e",
            "note": "Phương pháp tiêu chuẩn áp dụng: ASME Section I",
            "sortOrder": 1
      },
      {
            "machineId": "d0000000-0000-4000-8000-000000000009",
            "standardId": "b0000000-0000-4000-8000-000000000010",
            "note": "Cấu hình tác động: 87: khí đóng / 88: khí mở",
            "sortOrder": 1
      },
      {
            "machineId": "d0000000-0000-4000-8000-00000000000d",
            "standardId": "b0000000-0000-4000-8000-000000000011",
            "note": "Phương pháp kiểm tra: Kiểm tra tại vị trí lắp đặt thực tế",
            "sortOrder": 1
      }
]);

    console.log('[8/9] Nạp dữ liệu Tin tức & Sự kiện (News & Events - 3 bài)...');
    await db.insert(schema.newsEvents).values([
      {
        id: 'e0000000-0000-4000-8000-000000000001',
        type: 'news',
        title: "LT Việt Nam hoàn thành lắp đặt và bàn giao PAC OptiDist 2 tại Quatest 2",
        slug: "ban-giao-pac-optidist-2",
        shortDescription: "Đội ngũ kỹ thuật hoàn thành lắp đặt, hướng dẫn vận hành và chuyển giao thiết bị chưng cất tự động.",
        thumbnailImageId: 'a0000000-0000-4000-8000-00000000000e',
        content: {"version":1,"blocks":[{"type":"heading","data":{"text":"LT Việt Nam hoàn thành lắp đặt và bàn giao PAC OptiDist 2 tại Quatest 2","level":2}},{"type":"paragraph","data":{"text":"Dự án tập trung vào việc đưa hệ thống chưng cất tự động vào vận hành ổn định tại phòng thí nghiệm của khách hàng."}},{"type":"paragraph","data":{"text":"Phạm vi thực hiện gồm lắp đặt thiết bị, kiểm tra điều kiện vận hành, chạy thử và hướng dẫn người sử dụng."}},{"type":"paragraph","data":{"text":"Hồ sơ kỹ thuật và hướng dẫn vận hành được tập hợp để người sử dụng thuận tiện tra cứu sau bàn giao."}}]},
        status: 'published',
        publishedAt: new Date('2026-06-01T08:00:00Z'),
        
        authorId: USERS.admin,
      },
      {
        id: 'e0000000-0000-4000-8000-000000000002',
        type: 'event',
        title: "LT Việt Nam phối hợp tổ chức hội thảo bảo dưỡng và kiểm định van an toàn",
        slug: "hoi-thao-van-an-toan",
        shortDescription: "Hội thảo được tổ chức tại Hà Nội cùng Bộ Công Thương và Baker Hughes GE, với đại biểu từ hơn 20 nhà máy công nghiệp.",
        thumbnailImageId: 'a0000000-0000-4000-8000-00000000000f',
        content: {"version":1,"blocks":[{"type":"heading","data":{"text":"LT Việt Nam phối hợp tổ chức hội thảo bảo dưỡng và kiểm định van an toàn","level":2}},{"type":"paragraph","data":{"text":"Cuối năm 2019 tại Hà Nội, Bộ Công Thương, LT Việt Nam và Baker Hughes GE phối hợp tổ chức hội thảo về bảo dưỡng và kiểm định van an toàn trong nhà máy công nghiệp."}},{"type":"paragraph","data":{"text":"Hội thảo do lãnh đạo Cục An toàn và Môi trường Công nghiệp chủ trì, với đại biểu đến từ hơn 20 nhà máy lọc dầu, nhiệt điện, phân bón và công nghiệp lớn."}},{"type":"paragraph","data":{"text":"Các chuyên gia trình bày quy trình bảo dưỡng, sửa chữa và kiểm định van an toàn, đồng thời trao đổi kinh nghiệm vận hành trong những điều kiện làm việc khắc nghiệt."}},{"type":"quote","data":{"text":"Tìm hiểu giải pháp van an toàn cho nhà máy — Xem danh mục van an toàn Consolidated và các thiết bị hỗ trợ vận hành hiện có trên website.","author":"Xem giải pháp van Baker Hughes"}}]},
        status: 'published',
        publishedAt: new Date('2019-06-01T08:00:00Z'),
        eventStartAt: new Date('2019-11-20T08:30:00Z'),
        eventEndAt: new Date('2019-11-20T17:00:00Z'),
        location: 'Khách sạn Melia, 44 Lý Thường Kiệt, Hoàn Kiếm, Hà Nội',
        authorId: USERS.admin,
      },
      {
        id: 'e0000000-0000-4000-8000-000000000003',
        type: 'news',
        title: "Chuyển giao thiết bị xác định điểm đông đặc Phase Technology 70Xi tại Skypec",
        slug: "chuyen-giao-dfa-70xi",
        shortDescription: "LT Việt Nam hoàn thành giao hàng, lắp đặt, chạy thử và đào tạo chuyển giao công nghệ tại chi nhánh Skypec Hà Nội.",
        thumbnailImageId: 'a0000000-0000-4000-8000-000000000010',
        content: {"version":1,"blocks":[{"type":"heading","data":{"text":"Chuyển giao thiết bị xác định điểm đông đặc Phase Technology 70Xi tại Skypec","level":2}},{"type":"paragraph","data":{"text":"Trong hai ngày 7 và 8 tháng 7 năm 2025, đội ngũ LT Việt Nam triển khai thiết bị phân tích điểm đông đặc Phase Technology tại chi nhánh Hà Nội của Công ty Cổ phần Nhiên liệu bay Petrolimex (Skypec)."}},{"type":"paragraph","data":{"text":"Phạm vi công việc gồm lắp đặt tại hiện trường, tích hợp, hiệu chuẩn, chạy thử và xác nhận khả năng hoạt động của thiết bị."}},{"type":"paragraph","data":{"text":"Chương trình chuyển giao bao gồm đào tạo lý thuyết và thực hành, hướng dẫn bảo trì, xử lý sự cố và bàn giao tài liệu kỹ thuật cùng hướng dẫn sử dụng."}},{"type":"quote","data":{"text":"Bạn đang cần thiết bị xác định điểm đông đặc? — Chia sẻ loại mẫu, phương pháp hoặc tiêu chuẩn áp dụng để đội ngũ kỹ thuật tiếp nhận đúng nhu cầu.","author":"Trao đổi về ứng dụng này"}}]},
        status: 'published',
        publishedAt: new Date('2025-06-01T08:00:00Z'),
        
        authorId: USERS.admin,
      },
    ]);

    console.log('[9/9] Nạp dữ liệu Liên hệ & Yêu cầu tư vấn mẫu (Contacts)...');
    await db.insert(schema.contacts).values([
      {
        id: 'f0000001-0000-4000-8000-000000000001',
        fullName: 'Nguyễn Văn Hải',
        companyName: 'Công ty Cổ phần Lọc hóa dầu Bình Sơn (BSR)',
        email: 'hai.nv@bsr.com.vn',
        phone: '0912 345 678',
        subject: 'Yêu cầu báo giá bảo trì định kỳ van an toàn Consolidated',
        message: 'Kính gửi LT Việt Nam, chúng tôi đang chuẩn bị kế hoạch bảo dưỡng định kỳ cho phân xưởng chưng cất tháp dầu thô. Xin vui lòng gửi phương án kiểm định van an toàn tại hiện trường bằng thiết bị EVT-Pro.',
        status: 'new',
        assignedTo: USERS.admin,
        adminNote: 'Đã chuyển phòng kỹ thuật van chuẩn bị tài liệu báo giá.',
        createdAt: new Date('2026-09-15T09:30:00Z'),
      },
      {
        id: 'f0000002-0000-4000-8000-000000000002',
        fullName: 'Trần Thị Thu Trang',
        companyName: 'Phòng Thử nghiệm Quatest 2',
        email: 'trang.tt@quatest2.gov.vn',
        phone: '0983 678 910',
        subject: 'Tư vấn bổ sung phụ kiện cho thiết bị PAC OptiDist 2',
        message: 'Chào đội ngũ kỹ thuật, chúng tôi cần mua bổ sung bình hứng và nhiệt kế chuẩn cho máy OptiDist 2 vừa bàn giao. Nhờ quý công ty gửi danh mục phụ tùng chính hãng.',
        status: 'processing',
        assignedTo: USERS.editor,
        adminNote: 'Đang liên hệ đại diện PAC Singapore để xác nhận mã linh kiện.',
        createdAt: new Date('2026-09-14T14:20:00Z'),
      },
      {
        id: 'f0000003-0000-4000-8000-000000000003',
        fullName: 'Lê Hoàng Nam',
        companyName: 'Tổng Công ty Khí Việt Nam (PV Gas)',
        email: 'nam.lh@pvgas.com.vn',
        phone: '0903 112 233',
        subject: 'Tư vấn van điều khiển Masoneilan 21000 cho hệ thống khí khô',
        message: 'Chúng tôi muốn tìm hiểu thông số kỹ thuật và điều kiện làm việc của van điều khiển Masoneilan Class 600 cho dự án nâng công suất trạm phân phối khí.',
        status: 'resolved',
        assignedTo: USERS.admin,
        adminNote: 'Đã gửi catalog kỹ thuật và tài liệu sizing van Masoneilan ngày 16/09.',
        resolvedAt: new Date('2026-09-16T16:00:00Z'),
        createdAt: new Date('2026-09-12T10:15:00Z'),
      },
    ]);

    console.log('\n========================================================');
    console.log('🎉 NẠP TOÀN BỘ 100% DỮ LIỆU THÀNH CÔNG VÀO DATABASE POSTGRESQL!');
    console.log(' - Users: 2 tài khoản (Admin, Editor)');
    console.log(' - Media Assets: 16 hình ảnh sản phẩm & sự kiện');
    console.log(' - Standards: 15 tiêu chuẩn quốc tế');
    console.log(' - Machines: 13 dòng máy thực tế 100% từ Website');
    console.log(' - Machine Images (Gallery): 13 ảnh thiết bị');
    console.log(' - Machine Applications: 37 ứng dụng chi tiết');
    console.log(' - Machine Highlights: 39 ưu điểm vượt trội');
    console.log(' - Machine Specs: 39 thông số kỹ thuật chi tiết');
    console.log(' - Machine Standards: 17 liên kết tiêu chuẩn');
    console.log(' - News & Events: 3 bài viết đầy đủ đoạn văn & nextAction');
    console.log(' - Contacts: 3 yêu cầu tư vấn thực tế từ các nhà máy đối tác');
    console.log('========================================================\n');
  } catch (error) {
    console.error('❌ Lỗi khi nạp dữ liệu vào database:', error);
    process.exit(1);
  } finally {
    await client.end();
  }
}

seed();

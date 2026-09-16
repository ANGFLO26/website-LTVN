import { readFileSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';
import postgres from 'postgres';
import { drizzle } from 'drizzle-orm/postgres-js';
import * as schema from './schema.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// 1. Read DATABASE_URL from .env
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
console.log('🌱 Bắt đầu nạp dữ liệu (Database Seeding) vào PostgreSQL...');
console.log(`🔗 Database: ${databaseUrl.replace(/:[^:@]+@/, ':****@')}\n`);

const client = postgres(databaseUrl);
const db = drizzle(client, { schema });

// ============================================================================
// Deterministic Identifiers
// ============================================================================
const USERS = {
  admin: '11111111-1111-4111-8111-111111111111',
  editor: '22222222-2222-4222-8222-222222222222',
};

const MEDIA = {
  optidist: 'a0000001-0000-4000-8000-000000000001',
  cid510: 'a0000002-0000-4000-8000-000000000002',
  hvm472: 'a0000003-0000-4000-8000-000000000003',
  optiflash: 'a0000004-0000-4000-8000-000000000004',
  hdv632: 'a0000005-0000-4000-8000-000000000005',
  hvp972: 'a0000006-0000-4000-8000-000000000006',
  valve21000: 'a0000007-0000-4000-8000-000000000007',
  svi_ii_ap: 'a0000008-0000-4000-8000-000000000008',
  actuator87_88: 'a0000009-0000-4000-8000-000000000009',
  valve84000: 'a0000010-0000-4000-8000-000000000010',
  consolidated2700: 'a0000011-0000-4000-8000-000000000011',
  consolidated1900: 'a0000012-0000-4000-8000-000000000012',
  evtPro: 'a0000013-0000-4000-8000-000000000013',
  newsOptidistQuatest: 'a0000014-0000-4000-8000-000000000014',
  newsSafetyValve: 'a0000015-0000-4000-8000-000000000015',
  newsPhaseSkypec: 'a0000016-0000-4000-8000-000000000016',
};

const STANDARDS = {
  astm_d86: 'b0000001-0000-4000-8000-000000000001',
  iso_3405: 'b0000002-0000-4000-8000-000000000002',
  ip_123: 'b0000003-0000-4000-8000-000000000003',
  astm_d7668: 'b0000004-0000-4000-8000-000000000004',
  astm_d445: 'b0000005-0000-4000-8000-000000000005',
  iso_3104: 'b0000006-0000-4000-8000-000000000006',
  astm_d93: 'b0000007-0000-4000-8000-000000000007',
  iso_2719: 'b0000008-0000-4000-8000-000000000008',
  astm_d1160: 'b0000009-0000-4000-8000-000000000009',
  iso_6616: 'b0000010-0000-4000-8000-000000000010',
  astm_d5191: 'b0000011-0000-4000-8000-000000000011',
  asme_b16_34: 'b0000012-0000-4000-8000-000000000012',
  hart_protocol: 'b0000013-0000-4000-8000-000000000013',
  asme_sec_1: 'b0000014-0000-4000-8000-000000000014',
  asme_sec_8: 'b0000015-0000-4000-8000-000000000015',
};

const MACHINES = {
  optidist: 'd0000001-0000-4000-8000-000000000001',
  cid510: 'd0000002-0000-4000-8000-000000000002',
  hvm472: 'd0000003-0000-4000-8000-000000000003',
  optiflash: 'd0000004-0000-4000-8000-000000000004',
  hdv632: 'd0000005-0000-4000-8000-000000000005',
  hvp972: 'd0000006-0000-4000-8000-000000000006',
  masoneilan21000: 'd0000007-0000-4000-8000-000000000007',
  svi_ii_ap: 'd0000008-0000-4000-8000-000000000008',
  actuator87_88: 'd0000009-0000-4000-8000-000000000009',
  masoneilan84000: 'd0000010-0000-4000-8000-000000000010',
  consolidated2700: 'd0000011-0000-4000-8000-000000000011',
  consolidated1900: 'd0000012-0000-4000-8000-000000000012',
  evtPro: 'd0000013-0000-4000-8000-000000000013',
};

async function seed() {
  try {
    // 2. Clear old test data in reverse foreign key order
    console.log('[1/8] Dọn dẹp dữ liệu cũ...');
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

    // 3. Seed Users
    console.log('[2/8] Nạp dữ liệu Quản trị viên (Users)...');
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

    // 4. Seed Media Assets
    console.log('[3/8] Nạp dữ liệu Kho hình ảnh (Media Assets)...');
    await db.insert(schema.mediaAssets).values([
      {
        id: MEDIA.optidist,
        fileName: 'optidist-2-official.png',
        storageKey: 'products/optidist-2-official.png',
        publicUrl: '/images/products/optidist-2-official.png',
        altText: 'PAC OptiDist 2 Automatic Distillation Analyzer',
        mimeType: 'image/png',
        sizeBytes: 1312311,
        width: 1200,
        height: 1200,
        uploadedBy: USERS.admin,
      },
      {
        id: MEDIA.cid510,
        fileName: 'cid-510-transparent.png',
        storageKey: 'products/cid-510-transparent.png',
        publicUrl: '/images/products/cid-510-transparent.png',
        altText: 'Herzog CID 510 Derived Cetane Number Analyzer',
        mimeType: 'image/png',
        sizeBytes: 1976401,
        width: 1200,
        height: 1200,
        uploadedBy: USERS.admin,
      },
      {
        id: MEDIA.hvm472,
        fileName: 'hvm-472.jpg',
        storageKey: 'products/hvm-472.jpg',
        publicUrl: '/images/products/hvm-472.jpg',
        altText: 'Herzog HVM 472 Automated Kinematic Viscometer',
        mimeType: 'image/jpeg',
        sizeBytes: 166477,
        width: 1000,
        height: 1000,
        uploadedBy: USERS.admin,
      },
      {
        id: MEDIA.optiflash,
        fileName: 'optiflash.jpg',
        storageKey: 'products/optiflash.jpg',
        publicUrl: '/images/products/optiflash.jpg',
        altText: 'PAC Herzog OptiFlash Pensky-Martens Closed Cup Flash Point',
        mimeType: 'image/jpeg',
        sizeBytes: 120647,
        width: 1000,
        height: 1000,
        uploadedBy: USERS.admin,
      },
      {
        id: MEDIA.hdv632,
        fileName: 'hdv-632.jpg',
        storageKey: 'products/hdv-632.jpg',
        publicUrl: '/images/products/hdv-632.jpg',
        altText: 'Herzog HDV 632 Automated Vacuum Distillation Analyzer',
        mimeType: 'image/jpeg',
        sizeBytes: 136410,
        width: 1000,
        height: 1000,
        uploadedBy: USERS.admin,
      },
      {
        id: MEDIA.hvp972,
        fileName: 'hvp-972.jpg',
        storageKey: 'products/hvp-972.jpg',
        publicUrl: '/images/products/hvp-972.jpg',
        altText: 'Herzog HVP 972 Automatic Vapor Pressure Analyzer',
        mimeType: 'image/jpeg',
        sizeBytes: 1957707,
        width: 1200,
        height: 1200,
        uploadedBy: USERS.admin,
      },
      {
        id: MEDIA.valve21000,
        fileName: 'valve-21000-transparent.png',
        storageKey: 'products/valve-21000-transparent.png',
        publicUrl: '/images/products/valve-21000-transparent.png',
        altText: 'Masoneilan 21000 Series High Performance Globe Control Valve',
        mimeType: 'image/png',
        sizeBytes: 768077,
        width: 1200,
        height: 1200,
        uploadedBy: USERS.admin,
      },
      {
        id: MEDIA.svi_ii_ap,
        fileName: 'svi-ii-ap.png',
        storageKey: 'products/svi-ii-ap.png',
        publicUrl: '/images/products/svi-ii-ap.png',
        altText: 'Masoneilan SVI II AP Smart Digital Valve Positioner',
        mimeType: 'image/png',
        sizeBytes: 341059,
        width: 1000,
        height: 1000,
        uploadedBy: USERS.admin,
      },
      {
        id: MEDIA.actuator87_88,
        fileName: 'actuator-87-88.png',
        storageKey: 'products/actuator-87-88.png',
        publicUrl: '/images/products/actuator-87-88.png',
        altText: 'Masoneilan 87/88 Pneumatic Spring Diaphragm Actuator',
        mimeType: 'image/png',
        sizeBytes: 257773,
        width: 1000,
        height: 1000,
        uploadedBy: USERS.admin,
      },
      {
        id: MEDIA.valve84000,
        fileName: 'valve-84000.png',
        storageKey: 'products/valve-84000.png',
        publicUrl: '/images/products/valve-84000.png',
        altText: 'Masoneilan 84000 Series Steam Conditioning Valve',
        mimeType: 'image/png',
        sizeBytes: 30256,
        width: 800,
        height: 800,
        uploadedBy: USERS.admin,
      },
      {
        id: MEDIA.consolidated2700,
        fileName: 'consolidated-2700-transparent.png',
        storageKey: 'products/consolidated-2700-transparent.png',
        publicUrl: '/images/products/consolidated-2700-transparent.png',
        altText: 'Consolidated 2700 Series Safety Valve for CCGT',
        mimeType: 'image/png',
        sizeBytes: 1160866,
        width: 1200,
        height: 1200,
        uploadedBy: USERS.admin,
      },
      {
        id: MEDIA.consolidated1900,
        fileName: 'consolidated-1900.png',
        storageKey: 'products/consolidated-1900.png',
        publicUrl: '/images/products/consolidated-1900.png',
        altText: 'Consolidated 1900 Series Safety Relief Valve',
        mimeType: 'image/png',
        sizeBytes: 107612,
        width: 800,
        height: 800,
        uploadedBy: USERS.admin,
      },
      {
        id: MEDIA.evtPro,
        fileName: 'evt-pro.png',
        storageKey: 'products/evt-pro.png',
        publicUrl: '/images/products/evt-pro.png',
        altText: 'Consolidated EVT-Pro Electronic Valve Tester',
        mimeType: 'image/png',
        sizeBytes: 391236,
        width: 1000,
        height: 1000,
        uploadedBy: USERS.admin,
      },
      {
        id: MEDIA.newsOptidistQuatest,
        fileName: 'optidist-2-angle-official.png',
        storageKey: 'products/optidist-2-angle-official.png',
        publicUrl: '/images/products/optidist-2-angle-official.png',
        altText: 'Bàn giao PAC OptiDist 2 tại Quatest 2',
        mimeType: 'image/png',
        sizeBytes: 1510261,
        width: 1200,
        height: 1200,
        uploadedBy: USERS.admin,
      },
      {
        id: MEDIA.newsSafetyValve,
        fileName: 'safety-valve-seminar.jpg',
        storageKey: 'news/safety-valve-seminar.jpg',
        publicUrl: '/images/news/safety-valve-seminar.jpg',
        altText: 'Hội thảo bảo dưỡng và kiểm định van an toàn cùng Bộ Công Thương',
        mimeType: 'image/jpeg',
        sizeBytes: 353168,
        width: 1200,
        height: 800,
        uploadedBy: USERS.admin,
      },
      {
        id: MEDIA.newsPhaseSkypec,
        fileName: 'phase-dfa-70xi-transparent.png',
        storageKey: 'news/phase-dfa-70xi-transparent.png',
        publicUrl: '/images/news/phase-dfa-70xi-transparent.png',
        altText: 'Bàn giao Phase Technology 70Xi tại Skypec Hà Nội',
        mimeType: 'image/png',
        sizeBytes: 1511827,
        width: 1200,
        height: 1200,
        uploadedBy: USERS.admin,
      },
    ]);

    // 5. Seed Standards
    console.log('[4/8] Nạp dữ liệu Tiêu chuẩn kỹ thuật (Standards)...');
    await db.insert(schema.standards).values([
      {
        id: STANDARDS.astm_d86,
        code: 'ASTM D86',
        organization: 'ASTM',
        year: 2023,
        title: 'Standard Test Method for Distillation of Petroleum Products and Liquid Fuels at Atmospheric Pressure',
        description: 'Phương pháp tiêu chuẩn xác định khoảng chưng cất của các sản phẩm dầu mỏ ở áp suất khí quyển.',
      },
      {
        id: STANDARDS.iso_3405,
        code: 'ISO 3405',
        organization: 'ISO',
        year: 2019,
        title: 'Petroleum and related products — Determination of distillation characteristics at atmospheric pressure',
        description: 'Tiêu chuẩn quốc tế xác định đặc tính chưng cất của sản phẩm dầu khí ở áp suất khí quyển.',
      },
      {
        id: STANDARDS.ip_123,
        code: 'IP 123',
        organization: 'Energy Institute',
        year: 2019,
        title: 'Petroleum products — Determination of distillation characteristics at atmospheric pressure',
        description: 'Phương pháp kiểm nghiệm chưng cất khí quyển theo tiêu chuẩn Viện Năng lượng Anh Quốc.',
      },
      {
        id: STANDARDS.astm_d7668,
        code: 'ASTM D7668',
        organization: 'ASTM',
        year: 2022,
        title: 'Standard Test Method for Determination of Derived Cetane Number (DCN) of Diesel Fuel Oils',
        description: 'Phương pháp xác định trị số cetane dẫn xuất (DCN) của nhiên liệu diesel bằng buồng đốt thể tích không đổi.',
      },
      {
        id: STANDARDS.astm_d445,
        code: 'ASTM D445',
        organization: 'ASTM',
        year: 2021,
        title: 'Standard Test Method for Kinematic Viscosity of Transparent and Opaque Liquids',
        description: 'Phương pháp đo độ nhớt động học của chất lỏng trong suốt và mờ đục.',
      },
      {
        id: STANDARDS.iso_3104,
        code: 'ISO 3104',
        organization: 'ISO',
        year: 2020,
        title: 'Petroleum products — Transparent and opaque liquids — Determination of kinematic viscosity',
        description: 'Tiêu chuẩn ISO xác định độ nhớt động học và tính toán độ nhớt động lực học.',
      },
      {
        id: STANDARDS.astm_d93,
        code: 'ASTM D93',
        organization: 'ASTM',
        year: 2020,
        title: 'Standard Test Methods for Flash Point by Pensky-Martens Closed Cup Tester',
        description: 'Phương pháp xác định điểm chớp cháy bằng thiết bị cốc kín Pensky-Martens.',
      },
      {
        id: STANDARDS.iso_2719,
        code: 'ISO 2719',
        organization: 'ISO',
        year: 2016,
        title: 'Determination of flash point — Pensky-Martens closed cup method',
        description: 'Tiêu chuẩn xác định điểm chớp cháy theo phương pháp cốc kín Pensky-Martens.',
      },
      {
        id: STANDARDS.astm_d1160,
        code: 'ASTM D1160',
        organization: 'ASTM',
        year: 2018,
        title: 'Standard Test Method for Distillation of Petroleum Products at Reduced Pressure',
        description: 'Phương pháp chưng cất sản phẩm dầu mỏ ở áp suất chân không giảm thấp.',
      },
      {
        id: STANDARDS.iso_6616,
        code: 'ISO 6616',
        organization: 'ISO',
        year: 2000,
        title: 'Petroleum products — Determination of distillation characteristics at reduced pressure',
        description: 'Xác định đặc tính chưng cất chân không của các phân đoạn dầu nặng.',
      },
      {
        id: STANDARDS.astm_d5191,
        code: 'ASTM D5191',
        organization: 'ASTM',
        year: 2022,
        title: 'Standard Test Method for Vapor Pressure of Petroleum Products and Liquid Fuels (Mini Method)',
        description: 'Phương pháp đo áp suất hơi vi lượng của xăng và nhiên liệu lỏng.',
      },
      {
        id: STANDARDS.asme_b16_34,
        code: 'ASME B16.34',
        organization: 'ASME',
        year: 2020,
        title: 'Valves Flanged, Threaded and Welding End',
        description: 'Tiêu chuẩn thiết kế, áp suất và nhiệt độ cho van mặt bích, nối ren và hàn.',
      },
      {
        id: STANDARDS.hart_protocol,
        code: 'HART Protocol',
        organization: 'FieldComm Group',
        year: 2021,
        title: 'Highway Addressable Remote Transducer Protocol',
        description: 'Giao thức truyền thông số hai chiều trên nền tín hiệu tương tự 4-20mA cho van và thiết bị đo.',
      },
      {
        id: STANDARDS.asme_sec_1,
        code: 'ASME Section I',
        organization: 'ASME',
        year: 2021,
        title: 'Rules for Construction of Power Boilers',
        description: 'Quy chuẩn chế tạo nồi hơi và van an toàn áp suất cao trong nhà máy nhiệt điện.',
      },
      {
        id: STANDARDS.asme_sec_8,
        code: 'ASME Section VIII',
        organization: 'ASME',
        year: 2021,
        title: 'Rules for Construction of Pressure Vessels',
        description: 'Quy chuẩn thiết kế và kiểm định bình áp lực và van an toàn công nghiệp.',
      },
    ]);

    // 6. Seed Machines (13 dòng máy thực tế từ website)
    console.log('[5/8] Nạp dữ liệu Thiết bị & Máy móc (Machines)...');
    await db.insert(schema.machines).values([
      // 1. OptiDist 2
      {
        id: MACHINES.optidist,
        name: 'Thiết bị chưng cất khí quyển tự động (PAC OptiDist 2)',
        slug: 'optidist',
        model: 'OptiDist 2',
        shortDescription: 'Hệ thống chưng cất tự động cho xăng, diesel và nhiên liệu hàng không, hỗ trợ kiểm soát tốc độ chưng cất ổn định.',
        description: 'PAC OptiDist 2 là hệ thống phân tích chưng cất khí quyển tự động tiên tiến hàng đầu thế giới, đáp ứng hoàn hảo các tiêu chuẩn ASTM D86, ISO 3405 và IP 123. Thiết bị sở hữu công nghệ cảm biến quang học tiên tiến và bộ gia nhiệt thông minh giúp tối ưu hóa quá trình chưng cất chỉ với một thao tác bấm nút.',
        mainImageId: MEDIA.optidist,
        status: 'published',
        sortOrder: 1,
        publishedAt: new Date('2026-01-01T00:00:00Z'),
        createdBy: USERS.admin,
      },
      // 2. CID 510
      {
        id: MACHINES.cid510,
        name: 'Thiết bị xác định trị số cetane dẫn xuất (Herzog CID 510)',
        slug: 'cid-510',
        model: 'CID 510',
        shortDescription: 'Phân tích chất lượng cháy của nhiên liệu diesel thông qua phép đo thời gian trễ đánh lửa.',
        description: 'Herzog CID 510 là thiết bị đo trị số cetane dẫn xuất (DCN) thế hệ mới theo tiêu chuẩn ASTM D7668. Máy sử dụng buồng đốt thể tích không đổi với kim phun áp suất cao, mang lại độ chính xác vượt trội, thời gian phân tích dưới 20 phút và lượng mẫu cực nhỏ.',
        mainImageId: MEDIA.cid510,
        status: 'published',
        sortOrder: 2,
        publishedAt: new Date('2026-01-02T00:00:00Z'),
        createdBy: USERS.admin,
      },
      // 3. HVM 472
      {
        id: MACHINES.hvm472,
        name: 'Thiết bị đo độ nhớt động học tự động (Herzog HVM 472)',
        slug: 'hvm-472',
        model: 'HVM 472',
        shortDescription: 'Hệ thống đo độ nhớt đa dải, hỗ trợ tự động hóa quy trình phân tích sản phẩm dầu mỏ.',
        description: 'Herzog HVM 472 là thiết bị đo độ nhớt mao quản tự động đa dải, cho phép phân tích cùng lúc hai mẫu độc lập. Máy tích hợp hệ thống rửa và sấy khô tự động, giảm thiểu tối đa thời gian thao tác của kỹ thuật viên và đảm bảo tuân thủ nghiêm ngặt ASTM D445 / ISO 3104.',
        mainImageId: MEDIA.hvm472,
        status: 'published',
        sortOrder: 3,
        publishedAt: new Date('2026-01-03T00:00:00Z'),
        createdBy: USERS.admin,
      },
      // 4. OptiFlash
      {
        id: MACHINES.optiflash,
        name: 'Thiết bị đo điểm chớp cháy cốc kín Pensky-Martens (Herzog OptiFlash)',
        slug: 'optiflash-pensky-martens',
        model: 'OptiFlash',
        shortDescription: 'Thiết bị tự động xác định điểm chớp cháy cho nhiên liệu, dầu nhờn và các sản phẩm dầu mỏ.',
        description: 'OptiFlash Pensky-Martens là giải pháp kiểm tra điểm chớp cháy an toàn và hiện đại nhất, tích hợp hệ thống dập lửa tự động bằng khí trơ và cảm biến quang nhiệt. Tuân thủ đầy đủ ASTM D93 và ISO 2719.',
        mainImageId: MEDIA.optiflash,
        status: 'published',
        sortOrder: 4,
        publishedAt: new Date('2026-01-04T00:00:00Z'),
        createdBy: USERS.admin,
      },
      // 5. HDV 632
      {
        id: MACHINES.hdv632,
        name: 'Thiết bị chưng cất tự động ở áp suất chân không (Herzog HDV 632)',
        slug: 'hdv-632',
        model: 'HDV 632',
        shortDescription: 'Giải pháp chưng cất chân không cho các sản phẩm dầu mỏ có nhiệt độ sôi cao.',
        description: 'Herzog HDV 632 thực hiện phép thử chưng cất chân không hoàn toàn tự động theo ASTM D1160. Thiết bị điều khiển áp suất chân không chính xác từ 0.1 đến 50 kPa, trang bị buồng sưởi tự động và hệ thống ngưng tụ tuần hoàn.',
        mainImageId: MEDIA.hdv632,
        status: 'published',
        sortOrder: 5,
        publishedAt: new Date('2026-01-05T00:00:00Z'),
        createdBy: USERS.admin,
      },
      // 6. HVP 972
      {
        id: MACHINES.hvp972,
        name: 'Thiết bị đo áp suất hơi bão hòa tự động (Herzog HVP 972)',
        slug: 'hvp-972',
        model: 'HVP 972',
        shortDescription: 'Phân tích áp suất hơi của xăng và sản phẩm dầu mỏ trong quy trình kiểm soát chất lượng.',
        description: 'Herzog HVP 972 sử dụng phương pháp đo áp suất hơi vi lượng (Mini Method) theo ASTM D5191. Thiết bị cho kết quả nhanh chóng trong 5 phút, piston tích hợp không dùng bơm chân không ngoài.',
        mainImageId: MEDIA.hvp972,
        status: 'published',
        sortOrder: 6,
        publishedAt: new Date('2026-01-06T00:00:00Z'),
        createdBy: USERS.admin,
      },
      // 7. Masoneilan 21000 Series
      {
        id: MACHINES.masoneilan21000,
        name: 'Van điều khiển globe hiệu suất cao (Masoneilan 21000 Series)',
        slug: 'masoneilan-21000',
        model: '21000 Series',
        shortDescription: 'Dòng van điều khiển đa dụng cho các ứng dụng chất lỏng, khí và hơi trong nhà máy công nghiệp.',
        description: 'Masoneilan 21000 Series là dòng van cầu điều khiển đơn cổng (single-port globe valve) được ứng dụng rộng rãi nhất trong các nhà máy lọc dầu, hóa chất và năng lượng. Thiết kế thân van nặng, chống rung lắc và nhiều tùy chọn trim giảm ồn Lo-dB.',
        mainImageId: MEDIA.valve21000,
        status: 'published',
        sortOrder: 7,
        publishedAt: new Date('2026-01-07T00:00:00Z'),
        createdBy: USERS.admin,
      },
      // 8. SVI II AP
      {
        id: MACHINES.svi_ii_ap,
        name: 'Bộ định vị van thông minh (Masoneilan SVI II AP)',
        slug: 'svi-ii-ap',
        model: 'SVI II AP',
        shortDescription: 'Bộ định vị kỹ thuật số hỗ trợ điều khiển chính xác và chẩn đoán tình trạng van.',
        description: 'Masoneilan SVI II AP (Advanced Performance) là bộ định vị số thông minh giao tiếp HART hai chiều, trang bị công nghệ cảm biến vị trí từ tính không tiếp xúc (non-contact Hall effect sensor), tăng độ bền và độ tin cậy vượt trội trong môi trường rung động cao.',
        mainImageId: MEDIA.svi_ii_ap,
        status: 'published',
        sortOrder: 8,
        publishedAt: new Date('2026-01-08T00:00:00Z'),
        createdBy: USERS.admin,
      },
      // 9. Actuator 87/88
      {
        id: MACHINES.actuator87_88,
        name: 'Bộ truyền động màng lò xo khí nén (Masoneilan 87/88 Series)',
        slug: 'actuator-87-88',
        model: '87/88 Series',
        shortDescription: 'Bộ truyền động tuyến tính cho van điều khiển Masoneilan với cấu hình tác động thuận hoặc nghịch.',
        description: 'Bộ truyền động màng đa lò xo Masoneilan Model 87 (khí đóng / air-to-close) và Model 88 (khí mở / air-to-open) cung cấp lực đóng van mạnh mẽ, cấu trúc đúc nguyên khối vững chắc và phản hồi tuyến tính chính xác.',
        mainImageId: MEDIA.actuator87_88,
        status: 'published',
        sortOrder: 9,
        publishedAt: new Date('2026-01-09T00:00:00Z'),
        createdBy: USERS.admin,
      },
      // 10. Masoneilan 84000 Series
      {
        id: MACHINES.masoneilan84000,
        name: 'Van điều khiển cho ứng dụng hơi và giảm nhiệt (Masoneilan 84000 Series)',
        slug: 'masoneilan-84000',
        model: '84000 Series',
        shortDescription: 'Van điều khiển được thiết kế cho các điều kiện hơi và chênh áp cao trong nhà máy công nghiệp.',
        description: 'Masoneilan SteamForm 84000 Series là dòng van giảm áp và giảm nhiệt hơi nước chuyên dụng (desuperheating & steam conditioning), xử lý hiệu quả chênh áp lớn, triệt tiêu tiếng ồn và ứng suất nhiệt trong các nhà máy nhiệt điện.',
        mainImageId: MEDIA.valve84000,
        status: 'published',
        sortOrder: 10,
        publishedAt: new Date('2026-01-10T00:00:00Z'),
        createdBy: USERS.admin,
      },
      // 11. Consolidated 2700 Series
      {
        id: MACHINES.consolidated2700,
        name: 'Van an toàn cho hệ thống CCGT và hơi cao áp (Consolidated 2700 Series)',
        slug: 'consolidated-2700',
        model: '2700 Series',
        shortDescription: 'Dòng van an toàn được thiết kế cho các hệ thống phát điện tuabin khí chu trình hỗn hợp và dịch vụ hơi.',
        description: 'Consolidated 2700 Series đáp ứng tiêu chuẩn ASME Section I & Section VIII, được tối ưu hóa đặc biệt cho các bộ sinh hơi thu hồi nhiệt (HRSG) trong nhà máy điện chu trình hỗn hợp CCGT. Đĩa van Thermodisc chịu nhiệt cao, đảm bảo độ kín tuyệt đối ở 96% áp suất xả.',
        mainImageId: MEDIA.consolidated2700,
        status: 'published',
        sortOrder: 11,
        publishedAt: new Date('2026-01-11T00:00:00Z'),
        createdBy: USERS.admin,
      },
      // 12. Consolidated 1900 Series
      {
        id: MACHINES.consolidated1900,
        name: 'Van an toàn và xả áp công nghiệp (Consolidated 1900/P Series)',
        slug: 'consolidated-1900',
        model: '1900/P Series',
        shortDescription: 'Dòng van an toàn và xả áp cho ứng dụng hơi, nước bốc hơi và hơi hữu cơ theo ASME Section I.',
        description: 'Consolidated 1900 Series là van an toàn xả áp (Safety Relief Valve) thông dụng nhất cho các nhà máy lọc dầu, hóa dầu và đường ống dẫn khí. Có đầy đủ cấu hình Conventional và Balanced Bellows chống ảnh hưởng của áp suất ngược.',
        mainImageId: MEDIA.consolidated1900,
        status: 'published',
        sortOrder: 12,
        publishedAt: new Date('2026-01-12T00:00:00Z'),
        createdBy: USERS.admin,
      },
      // 13. EVT-Pro
      {
        id: MACHINES.evtPro,
        name: 'Thiết bị kiểm tra van an toàn điện tử tại chỗ (Consolidated EVT-Pro)',
        slug: 'evt-pro',
        model: 'EVT-Pro',
        shortDescription: 'Thiết bị hỗ trợ kiểm tra áp suất cài đặt của van an toàn trong điều kiện lắp đặt thực tế.',
        description: 'Consolidated EVT-Pro (Electronic Valve Tester) là hệ thống kiểm định van an toàn trực tiếp trên đường ống (in-situ testing) mà không cần ngắt vận hành hệ thống hay tháo van về xưởng. Độ chính xác cao, lưu trữ và in biểu đồ thử nghiệm điện tử phục vụ nghiệm thu an toàn.',
        mainImageId: MEDIA.evtPro,
        status: 'published',
        sortOrder: 13,
        publishedAt: new Date('2026-01-13T00:00:00Z'),
        createdBy: USERS.admin,
      },
    ]);

    // 7. Seed Machine Sub-relations: Specs, Highlights, Applications, Standards
    console.log('[6/8] Nạp dữ liệu Thông số, Điểm nổi bật, Ứng dụng & Tiêu chuẩn cho từng máy...');

    // Applications
    await db.insert(schema.machineApplications).values([
      // OptiDist
      { machineId: MACHINES.optidist, title: 'Xăng thương phẩm & xăng pha ethanol', description: 'Kiểm tra đường cong chưng cất phân đoạn', sortOrder: 1 },
      { machineId: MACHINES.optidist, title: 'Nhiên liệu Diesel (DO)', description: 'Xác định điểm sôi cuối và cặn chưng cất', sortOrder: 2 },
      { machineId: MACHINES.optidist, title: 'Nhiên liệu hàng không Jet A-1', description: 'Đảm bảo nghiêm ngặt tiêu chuẩn bay quốc tế', sortOrder: 3 },
      // CID 510
      { machineId: MACHINES.cid510, title: 'Nhiên liệu Diesel truyền thống', description: 'Đo lường thời gian trễ đánh lửa ID', sortOrder: 1 },
      { machineId: MACHINES.cid510, title: 'Nhiên liệu sinh học Biodiesel & HVO', description: 'Đánh giá chất lượng cháy của hỗn hợp sinh học', sortOrder: 2 },
      // HVM 472
      { machineId: MACHINES.hvm472, title: 'Dầu nhờn động cơ và công nghiệp', description: 'Phân tích độ nhớt ở 40°C và 100°C', sortOrder: 1 },
      { machineId: MACHINES.hvm472, title: 'Nhiên liệu FO và dầu gốc', description: 'Đo độ nhớt động học trên mao quản tự động', sortOrder: 2 },
      // OptiFlash
      { machineId: MACHINES.optiflash, title: 'Dầu nhờn và phụ gia', description: 'Xác định điểm bắt cháy an toàn', sortOrder: 1 },
      { machineId: MACHINES.optiflash, title: 'Diesel và dầu đốt lò', description: 'Tuân thủ tiêu chuẩn phòng chống cháy nổ', sortOrder: 2 },
      // HDV 632
      { machineId: MACHINES.hdv632, title: 'Dầu nặng & cặn tháp khí quyển', description: 'Chưng cất chân không đến 500°C AET', sortOrder: 1 },
      { machineId: MACHINES.hdv632, title: 'Phân đoạn dầu bôi trơn', description: 'Kiểm soát chất lượng dầu nhờn gốc', sortOrder: 2 },
      // HVP 972
      { machineId: MACHINES.hvp972, title: 'Xăng thương phẩm', description: 'Đo áp suất hơi Reid quy đổi DVPE', sortOrder: 1 },
      { machineId: MACHINES.hvp972, title: 'Dung môi nhẹ và condensate', description: 'Kiểm soát tính dễ bay hơi của sản phẩm', sortOrder: 2 },
      // Masoneilan 21000
      { machineId: MACHINES.masoneilan21000, title: 'Hơi nhiệt độ cao và áp suất cao', description: 'Điều khiển lưu lượng hơi bảo vệ hệ thống', sortOrder: 1 },
      { machineId: MACHINES.masoneilan21000, title: 'Chất lỏng và hydrocarbon công nghệ', description: 'Chống ăn mòn và giảm thiểu sụt áp', sortOrder: 2 },
      // SVI II AP
      { machineId: MACHINES.svi_ii_ap, title: 'Van điều khiển tuyến tính & quay', description: 'Hiệu chuẩn số và giám sát hành trình van', sortOrder: 1 },
      { machineId: MACHINES.svi_ii_ap, title: 'Hệ thống DCS / PLC nhà máy', description: 'Tích hợp tín hiệu 4-20mA HART', sortOrder: 2 },
      // Actuator 87/88
      { machineId: MACHINES.actuator87_88, title: 'Van điều khiển tuyến tính Masoneilan', description: 'Tác động màng lò xo tin cậy cao', sortOrder: 1 },
      // Masoneilan 84000
      { machineId: MACHINES.masoneilan84000, title: 'Trạm giảm áp giảm nhiệt hơi PRDS', description: 'Kiểm soát hơi trong nhà máy điện và hóa chất', sortOrder: 1 },
      // Consolidated 2700
      { machineId: MACHINES.consolidated2700, title: 'Hệ thống lò hơi CCGT / HRSG', description: 'Xả quá áp bảo vệ bao hơi và bộ quá nhiệt', sortOrder: 1 },
      // Consolidated 1900
      { machineId: MACHINES.consolidated1900, title: 'Bình áp lực và tháp chưng cất', description: 'Bảo vệ an toàn chống nổ trong nhà máy lọc dầu', sortOrder: 1 },
      // EVT-Pro
      { machineId: MACHINES.evtPro, title: 'Kiểm định định kỳ van an toàn tại hiện trường', description: 'Xác định set pressure không cần ngừng máy', sortOrder: 1 },
    ]);

    // Highlights
    await db.insert(schema.machineHighlights).values([
      // OptiDist
      { machineId: MACHINES.optidist, title: 'Vận hành tự động hoàn toàn', description: 'Chỉ cần nạp mẫu và nhấn nút khởi động', icon: 'zap', sortOrder: 1 },
      { machineId: MACHINES.optidist, title: 'Kiểm soát tốc độ gia nhiệt thông minh', description: 'Tối ưu hóa gia nhiệt chính xác từ điểm sôi đầu (IBP) đến điểm sôi cuối (FBP)', icon: 'activity', sortOrder: 2 },
      { machineId: MACHINES.optidist, title: 'An toàn phòng lab tối đa', description: 'Tích hợp cảm biến quang báo cháy và hệ thống dập lửa CO2 tự động', icon: 'shield', sortOrder: 3 },
      // CID 510
      { machineId: MACHINES.cid510, title: 'Thời gian phân tích siêu tốc', description: 'Cho kết quả DCN chính xác chỉ trong vòng dưới 20 phút', icon: 'clock', sortOrder: 1 },
      { machineId: MACHINES.cid510, title: 'Tiết kiệm mẫu thử', description: 'Chỉ yêu cầu thể tích mẫu dưới 100 mL', icon: 'droplet', sortOrder: 2 },
      // HVM 472
      { machineId: MACHINES.hvm472, title: 'Hai vị trí đo độc lập', description: 'Phân tích đồng thời hai mẫu với hai thang đo khác nhau', icon: 'layers', sortOrder: 1 },
      { machineId: MACHINES.hvm472, title: 'Tự động làm sạch và sấy khô', description: 'Loại bỏ hoàn toàn nguy cơ nhiễm chéo giữa các mẻ đo', icon: 'refresh-cw', sortOrder: 2 },
      // OptiFlash
      { machineId: MACHINES.optiflash, title: 'Phát hiện chớp cháy tự động', description: 'Cảm biến quang nhiệt cực nhạy phát hiện chớp cháy đầu tiên', icon: 'flame', sortOrder: 1 },
      // HDV 632
      { machineId: MACHINES.hdv632, title: 'Điều khiển chân không tự động', description: 'Duy trì áp suất ổn định từ 0.1 đến 50 kPa', icon: 'wind', sortOrder: 1 },
      // HVP 972
      { machineId: MACHINES.hvp972, title: 'Đo vi lượng Mini Method', description: 'Chuẩn bị mẫu đơn giản, kết quả sau 5 phút', icon: 'gauge', sortOrder: 1 },
      // Masoneilan 21000
      { machineId: MACHINES.masoneilan21000, title: 'Cấu trúc thân van hạng nặng', description: 'Độ bền cao, chịu rung động và chênh áp lớn', icon: 'cpu', sortOrder: 1 },
      // SVI II AP
      { machineId: MACHINES.svi_ii_ap, title: 'Cảm biến vị trí từ tính Hall Effect', description: 'Không tiếp xúc cơ học, tuổi thọ không giới hạn', icon: 'target', sortOrder: 1 },
      // Consolidated 2700
      { machineId: MACHINES.consolidated2700, title: 'Đĩa van Thermodisc chịu nhiệt cao', description: 'Kín tuyệt đối ở 96% áp suất xả, chống rò rỉ hơi', icon: 'check-circle', sortOrder: 1 },
      // EVT-Pro
      { machineId: MACHINES.evtPro, title: 'Kiểm tra van trực tiếp tại chỗ', description: 'Không cần tháo van ra khỏi hệ thống đường ống', icon: 'tool', sortOrder: 1 },
    ]);

    // Specs
    await db.insert(schema.machineSpecs).values([
      // OptiDist
      { machineId: MACHINES.optidist, groupName: 'Vận hành', specName: 'Phương pháp thử', specValue: 'Chưng cất khí quyển tự động', unit: null, sortOrder: 1 },
      { machineId: MACHINES.optidist, groupName: 'Vận hành', specName: 'Mẫu thử nghiệm', specValue: 'Xăng, Diesel, Nhiên liệu bay Jet A-1', unit: null, sortOrder: 2 },
      { machineId: MACHINES.optidist, groupName: 'Nhiệt độ', specName: 'Dải nhiệt độ đo', specValue: '0 đến 450', unit: '°C', sortOrder: 3 },
      { machineId: MACHINES.optidist, groupName: 'Đo lường', specName: 'Độ chính xác thể tích', specValue: '± 0.1', unit: 'mL', sortOrder: 4 },
      // CID 510
      { machineId: MACHINES.cid510, groupName: 'Đo lường', specName: 'Chỉ số đo lường', specValue: 'Trị số Cetane dẫn xuất (DCN)', unit: null, sortOrder: 1 },
      { machineId: MACHINES.cid510, groupName: 'Đo lường', specName: 'Dải đo DCN', specValue: '35 đến 85', unit: 'DCN', sortOrder: 2 },
      { machineId: MACHINES.cid510, groupName: 'Vận hành', specName: 'Thời gian phân tích', specValue: 'Dưới 20', unit: 'phút', sortOrder: 3 },
      // HVM 472
      { machineId: MACHINES.hvm472, groupName: 'Đo lường', specName: 'Dải đo độ nhớt', specValue: '0.3 đến 10,000', unit: 'mm²/s', sortOrder: 1 },
      { machineId: MACHINES.hvm472, groupName: 'Nhiệt độ', specName: 'Dải nhiệt độ bể ổn nhiệt', specValue: '20 đến 150', unit: '°C', sortOrder: 2 },
      // OptiFlash
      { machineId: MACHINES.optiflash, groupName: 'Nhiệt độ', specName: 'Dải nhiệt độ chớp cháy', specValue: 'Môi trường đến 400', unit: '°C', sortOrder: 1 },
      // HDV 632
      { machineId: MACHINES.hdv632, groupName: 'Áp suất', specName: 'Dải áp suất chân không', specValue: '0.1 đến 50', unit: 'kPa', sortOrder: 1 },
      // HVP 972
      { machineId: MACHINES.hvp972, groupName: 'Áp suất', specName: 'Dải áp suất hơi', specValue: '0 đến 1,000', unit: 'kPa', sortOrder: 1 },
      // Masoneilan 21000
      { machineId: MACHINES.masoneilan21000, groupName: 'Kỹ thuật van', specName: 'Kích cỡ danh định (Size)', specValue: '3/4 inch đến 8 inch (DN 20 đến DN 200)', unit: null, sortOrder: 1 },
      { machineId: MACHINES.masoneilan21000, groupName: 'Kỹ thuật van', specName: 'Cấp áp suất (Pressure Rating)', specValue: 'ASME Class 150 đến Class 2500', unit: null, sortOrder: 2 },
      // SVI II AP
      { machineId: MACHINES.svi_ii_ap, groupName: 'Điều khiển', specName: 'Tín hiệu ngõ vào', specValue: '4 - 20 mA (HART)', unit: 'mA', sortOrder: 1 },
      { machineId: MACHINES.svi_ii_ap, groupName: 'Điều khiển', specName: 'Áp suất cấp khí', specValue: '1.4 đến 7.0', unit: 'bar', sortOrder: 2 },
      // Consolidated 2700
      { machineId: MACHINES.consolidated2700, groupName: 'Áp suất & Nhiệt', specName: 'Áp suất cài đặt tối đa', specValue: 'Lên tới 207', unit: 'bar', sortOrder: 1 },
      { machineId: MACHINES.consolidated2700, groupName: 'Áp suất & Nhiệt', specName: 'Nhiệt độ làm việc tối đa', specValue: 'Lên tới 593', unit: '°C', sortOrder: 2 },
    ]);

    // Machine Standards (Liên kết N-N)
    await db.insert(schema.machineStandards).values([
      // OptiDist -> ASTM D86, ISO 3405, IP 123
      { machineId: MACHINES.optidist, standardId: STANDARDS.astm_d86, note: 'Phương pháp tiêu chuẩn chính thức', sortOrder: 1 },
      { machineId: MACHINES.optidist, standardId: STANDARDS.iso_3405, note: 'Phương pháp tiêu chuẩn quốc tế ISO', sortOrder: 2 },
      { machineId: MACHINES.optidist, standardId: STANDARDS.ip_123, note: 'Tiêu chuẩn viện dầu khí Anh', sortOrder: 3 },
      // CID 510 -> ASTM D7668
      { machineId: MACHINES.cid510, standardId: STANDARDS.astm_d7668, note: 'Phương pháp buồng đốt thể tích không đổi DCN', sortOrder: 1 },
      // HVM 472 -> ASTM D445, ISO 3104
      { machineId: MACHINES.hvm472, standardId: STANDARDS.astm_d445, note: 'Đo độ nhớt động học', sortOrder: 1 },
      { machineId: MACHINES.hvm472, standardId: STANDARDS.iso_3104, note: 'Tiêu chuẩn quốc tế ISO', sortOrder: 2 },
      // OptiFlash -> ASTM D93, ISO 2719
      { machineId: MACHINES.optiflash, standardId: STANDARDS.astm_d93, note: 'Điểm chớp cháy cốc kín Pensky-Martens', sortOrder: 1 },
      { machineId: MACHINES.optiflash, standardId: STANDARDS.iso_2719, note: 'Tiêu chuẩn quốc tế ISO', sortOrder: 2 },
      // HDV 632 -> ASTM D1160, ISO 6616
      { machineId: MACHINES.hdv632, standardId: STANDARDS.astm_d1160, note: 'Chưng cất chân không', sortOrder: 1 },
      { machineId: MACHINES.hdv632, standardId: STANDARDS.iso_6616, note: 'Chưng cất chân không ISO', sortOrder: 2 },
      // HVP 972 -> ASTM D5191
      { machineId: MACHINES.hvp972, standardId: STANDARDS.astm_d5191, note: 'Áp suất hơi vi lượng', sortOrder: 1 },
      // Masoneilan 21000 -> ASME B16.34
      { machineId: MACHINES.masoneilan21000, standardId: STANDARDS.asme_b16_34, note: 'Thiết kế van mặt bích và mối hàn', sortOrder: 1 },
      // SVI II AP -> HART Protocol
      { machineId: MACHINES.svi_ii_ap, standardId: STANDARDS.hart_protocol, note: 'Giao thức truyền thông số hai chiều', sortOrder: 1 },
      // Consolidated 2700 -> ASME Section I, ASME Section VIII
      { machineId: MACHINES.consolidated2700, standardId: STANDARDS.asme_sec_1, note: 'Nồi hơi phát điện CCGT', sortOrder: 1 },
      { machineId: MACHINES.consolidated2700, standardId: STANDARDS.asme_sec_8, note: 'Bình áp lực hơi', sortOrder: 2 },
      // Consolidated 1900 -> ASME Section I
      { machineId: MACHINES.consolidated1900, standardId: STANDARDS.asme_sec_1, note: 'Van an toàn xả áp nồi hơi', sortOrder: 1 },
    ]);

    // 8. Seed News & Events
    console.log('[7/8] Nạp dữ liệu Tin tức & Sự kiện (News & Events)...');
    await db.insert(schema.newsEvents).values([
      {
        id: 'e0000001-0000-4000-8000-000000000001',
        type: 'news',
        title: 'LT Việt Nam hoàn thành lắp đặt và bàn giao PAC OptiDist 2 tại Quatest 2',
        slug: 'ban-giao-pac-optidist-2',
        shortDescription: 'Đội ngũ kỹ thuật hoàn thành lắp đặt, hướng dẫn vận hành và chuyển giao thiết bị chưng cất tự động tại Trung tâm Kỹ thuật Tiêu chuẩn Đo lường Chất lượng 2.',
        thumbnailImageId: MEDIA.newsOptidistQuatest,
        content: {
          version: 1,
          blocks: [
            {
              type: 'heading',
              data: { text: 'Triển khai và chuyển giao công nghệ tại Quatest 2', level: 2 },
            },
            {
              type: 'paragraph',
              data: {
                text: 'Dự án tập trung vào việc đưa hệ thống chưng cất tự động PAC OptiDist 2 vào vận hành ổn định tại phòng thí nghiệm kiểm định của Trung tâm Kỹ thuật Tiêu chuẩn Đo lường Chất lượng 2 (Quatest 2).',
              },
            },
            {
              type: 'paragraph',
              data: {
                text: 'Phạm vi thực hiện bao gồm lắp đặt hoàn chỉnh thiết bị, kiểm tra toàn diện điều kiện vận hành, chạy thử nghiệm mẫu chuẩn và đào tạo chuyên sâu cho các kiểm định viên phòng thử nghiệm xăng dầu.',
              },
            },
            {
              type: 'quote',
              data: {
                text: 'Hệ thống PAC OptiDist 2 giúp rút ngắn thời gian phân tích và đảm bảo độ lặp lại cao nhất theo tiêu chuẩn ASTM D86.',
                author: 'Kỹ sư trưởng LT Việt Nam',
              },
            },
          ],
        },
        status: 'published',
        publishedAt: new Date('2026-03-01T08:00:00Z'),
        authorId: USERS.admin,
      },
      {
        id: 'e0000002-0000-4000-8000-000000000002',
        type: 'event',
        title: 'Hội thảo chuyên đề: Bảo dưỡng và kiểm định van an toàn cùng Bộ Công Thương',
        slug: 'hoi-thao-van-an-toan',
        shortDescription: 'Hội thảo được tổ chức tại Hà Nội phối hợp cùng Bộ Công Thương và Baker Hughes GE, với đại biểu từ hơn 20 nhà máy công nghiệp lớn.',
        thumbnailImageId: MEDIA.newsSafetyValve,
        content: {
          version: 1,
          blocks: [
            {
              type: 'heading',
              data: { text: 'Nâng cao an toàn vận hành trong nhà máy công nghiệp', level: 2 },
            },
            {
              type: 'paragraph',
              data: {
                text: 'Hội thảo do lãnh đạo Cục An toàn và Môi trường Công nghiệp (Bộ Công Thương) chủ trì, quy tụ hơn 80 chuyên gia đến từ các nhà máy lọc dầu, nhiệt điện, phân bón và hóa chất trên cả nước.',
              },
            },
            {
              type: 'paragraph',
              data: {
                text: 'Các chuyên gia kỹ thuật của LT Việt Nam và Baker Hughes đã trình bày quy trình bảo dưỡng, sửa chữa và kiểm định van an toàn Consolidated theo chuẩn ASME, đồng thời giới thiệu giải pháp kiểm định van trực tiếp trên đường ống EVT-Pro.',
              },
            },
          ],
        },
        status: 'published',
        publishedAt: new Date('2019-11-20T08:00:00Z'),
        eventStartAt: new Date('2019-11-20T08:30:00Z'),
        eventEndAt: new Date('2019-11-20T17:00:00Z'),
        location: 'Khách sạn Melia, 44 Lý Thường Kiệt, Hoàn Kiếm, Hà Nội',
        authorId: USERS.admin,
      },
      {
        id: 'e0000003-0000-4000-8000-000000000003',
        type: 'news',
        title: 'Chuyển giao thiết bị xác định điểm đông đặc Phase Technology 70Xi tại Skypec',
        slug: 'chuyen-giao-dfa-70xi',
        shortDescription: 'LT Việt Nam hoàn thành giao hàng, lắp đặt, chạy thử và đào tạo chuyển giao công nghệ phân tích nhiên liệu bay tại chi nhánh Skypec Hà Nội.',
        thumbnailImageId: MEDIA.newsPhaseSkypec,
        content: {
          version: 1,
          blocks: [
            {
              type: 'heading',
              data: { text: 'Đảm bảo tiêu chuẩn chất lượng nhiên liệu hàng không Jet A-1', level: 2 },
            },
            {
              type: 'paragraph',
              data: {
                text: 'Đội ngũ kỹ thuật LT Việt Nam đã hoàn tất bàn giao và nghiệm thu thiết bị phân tích điểm đông đặc tự động Phase Technology tại Công ty Cổ phần Nhiên liệu bay Petrolimex (Skypec).',
              },
            },
            {
              type: 'paragraph',
              data: {
                text: 'Quy trình kiểm tra vận hành thử nghiệm nghiêm ngặt đã khẳng định khả năng đo lường chính xác điểm đông đặc với thời gian phân tích tối ưu, phục vụ trực tiếp cho hoạt động kiểm soát chất lượng nhiên liệu hàng không.',
              },
            },
          ],
        },
        status: 'published',
        publishedAt: new Date('2025-07-09T09:00:00Z'),
        authorId: USERS.admin,
      },
    ]);

    // 9. Seed Contacts
    console.log('[8/8] Nạp dữ liệu Liên hệ & Yêu cầu tư vấn mẫu (Contacts)...');
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
    console.log('🎉 NẠP DỮ LIỆU THÀNH CÔNG VÀO POSTGRESQL (NEON DATABASE)!');
    console.log(' - Users: 2 tài khoản (Admin, Editor)');
    console.log(' - Media Assets: 16 hình ảnh sản phẩm & sự kiện');
    console.log(' - Standards: 15 tiêu chuẩn quốc tế (ASTM, ISO, IP, ASME, HART)');
    console.log(' - Machines: 13 dòng máy thực tế từ Website chính');
    console.log(' - Machine Specs, Apps, Highlights, Standards: Hàng chục bản ghi liên kết');
    console.log(' - News & Events: 3 bài viết thực tế bàn giao & sự kiện');
    console.log(' - Contacts: 3 yêu cầu tư vấn thực tế từ nhà máy đối tác');
    console.log('========================================================\n');
  } catch (error) {
    console.error('❌ Lỗi khi nạp dữ liệu vào database:', error);
    process.exit(1);
  } finally {
    await client.end();
  }
}

seed();

import type {
  Machine,
  Standard,
  MediaAsset,
  NewsEvent,
  Contact,
  User,
} from '../types';

// Helper UUID validation
export function isValidUuid(id?: string | null): boolean {
  return typeof id === 'string' && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id);
}

// Initial Seed Data with valid UUID v4 compliant hex strings (Synced with Database)
const INITIAL_USERS: User[] = [
  {
    id: '11111111-1111-4111-8111-111111111111',
    email: 'admin@ltvietnam.com.vn',
    fullName: 'Quản Trị Viên Hệ Thống',
    role: 'admin',
    status: 'active',
    lastLoginAt: '2026-09-14T22:30:00Z',
    createdAt: '2026-01-10T08:00:00Z',
    updatedAt: '2026-09-14T22:30:00Z',
  },
  {
    id: '22222222-2222-4222-8222-222222222222',
    email: 'editor@ltvietnam.com.vn',
    fullName: 'Biên Tập Viên Kỹ Thuật',
    role: 'editor',
    status: 'active',
    lastLoginAt: '2026-09-14T14:15:00Z',
    createdAt: '2026-02-15T09:30:00Z',
    updatedAt: '2026-09-14T14:15:00Z',
  },
];

const INITIAL_MEDIA: MediaAsset[] = [
  {
    id: 'a0000001-0000-4000-8000-000000000001',
    fileName: 'optidist-2-official.png',
    storageKey: 'products/optidist-2-official.png',
    publicUrl: '/images/products/optidist-2-official.png',
    altText: 'PAC OptiDist 2 Automatic Distillation Analyzer',
    mimeType: 'image/png',
    sizeBytes: 1312311,
    width: 1200,
    height: 1200,
    createdAt: '2026-01-01T00:00:00Z',
  },
  {
    id: 'a0000002-0000-4000-8000-000000000002',
    fileName: 'cid-510-transparent.png',
    storageKey: 'products/cid-510-transparent.png',
    publicUrl: '/images/products/cid-510-transparent.png',
    altText: 'Herzog CID 510 Derived Cetane Number Analyzer',
    mimeType: 'image/png',
    sizeBytes: 1976401,
    width: 1200,
    height: 1200,
    createdAt: '2026-01-02T00:00:00Z',
  },
  {
    id: 'a0000003-0000-4000-8000-000000000003',
    fileName: 'hvm-472.jpg',
    storageKey: 'products/hvm-472.jpg',
    publicUrl: '/images/products/hvm-472.jpg',
    altText: 'Herzog HVM 472 Automated Kinematic Viscometer',
    mimeType: 'image/jpeg',
    sizeBytes: 166477,
    width: 1000,
    height: 1000,
    createdAt: '2026-01-03T00:00:00Z',
  },
  {
    id: 'a0000004-0000-4000-8000-000000000004',
    fileName: 'optiflash.jpg',
    storageKey: 'products/optiflash.jpg',
    publicUrl: '/images/products/optiflash.jpg',
    altText: 'PAC Herzog OptiFlash Pensky-Martens Closed Cup Flash Point',
    mimeType: 'image/jpeg',
    sizeBytes: 120647,
    width: 1000,
    height: 1000,
    createdAt: '2026-01-04T00:00:00Z',
  },
  {
    id: 'a0000005-0000-4000-8000-000000000005',
    fileName: 'hdv-632.jpg',
    storageKey: 'products/hdv-632.jpg',
    publicUrl: '/images/products/hdv-632.jpg',
    altText: 'Herzog HDV 632 Automated Vacuum Distillation Analyzer',
    mimeType: 'image/jpeg',
    sizeBytes: 136410,
    width: 1000,
    height: 1000,
    createdAt: '2026-01-05T00:00:00Z',
  },
  {
    id: 'a0000006-0000-4000-8000-000000000006',
    fileName: 'hvp-972.jpg',
    storageKey: 'products/hvp-972.jpg',
    publicUrl: '/images/products/hvp-972.jpg',
    altText: 'Herzog HVP 972 Automatic Vapor Pressure Analyzer',
    mimeType: 'image/jpeg',
    sizeBytes: 1957707,
    width: 1200,
    height: 1200,
    createdAt: '2026-01-06T00:00:00Z',
  },
  {
    id: 'a0000007-0000-4000-8000-000000000007',
    fileName: 'valve-21000-transparent.png',
    storageKey: 'products/valve-21000-transparent.png',
    publicUrl: '/images/products/valve-21000-transparent.png',
    altText: 'Masoneilan 21000 Series High Performance Globe Control Valve',
    mimeType: 'image/png',
    sizeBytes: 768077,
    width: 1200,
    height: 1200,
    createdAt: '2026-01-07T00:00:00Z',
  },
  {
    id: 'a0000008-0000-4000-8000-000000000008',
    fileName: 'svi-ii-ap.png',
    storageKey: 'products/svi-ii-ap.png',
    publicUrl: '/images/products/svi-ii-ap.png',
    altText: 'Masoneilan SVI II AP Smart Digital Valve Positioner',
    mimeType: 'image/png',
    sizeBytes: 341059,
    width: 1000,
    height: 1000,
    createdAt: '2026-01-08T00:00:00Z',
  },
  {
    id: 'a0000009-0000-4000-8000-000000000009',
    fileName: 'actuator-87-88.png',
    storageKey: 'products/actuator-87-88.png',
    publicUrl: '/images/products/actuator-87-88.png',
    altText: 'Masoneilan 87/88 Pneumatic Spring Diaphragm Actuator',
    mimeType: 'image/png',
    sizeBytes: 257773,
    width: 1000,
    height: 1000,
    createdAt: '2026-01-09T00:00:00Z',
  },
  {
    id: 'a0000010-0000-4000-8000-000000000010',
    fileName: 'valve-84000.png',
    storageKey: 'products/valve-84000.png',
    publicUrl: '/images/products/valve-84000.png',
    altText: 'Masoneilan 84000 Series Steam Conditioning Valve',
    mimeType: 'image/png',
    sizeBytes: 30256,
    width: 800,
    height: 800,
    createdAt: '2026-01-10T00:00:00Z',
  },
  {
    id: 'a0000011-0000-4000-8000-000000000011',
    fileName: 'consolidated-2700-transparent.png',
    storageKey: 'products/consolidated-2700-transparent.png',
    publicUrl: '/images/products/consolidated-2700-transparent.png',
    altText: 'Consolidated 2700 Series Safety Valve for CCGT',
    mimeType: 'image/png',
    sizeBytes: 1160866,
    width: 1200,
    height: 1200,
    createdAt: '2026-01-11T00:00:00Z',
  },
  {
    id: 'a0000012-0000-4000-8000-000000000012',
    fileName: 'consolidated-1900.png',
    storageKey: 'products/consolidated-1900.png',
    publicUrl: '/images/products/consolidated-1900.png',
    altText: 'Consolidated 1900 Series Safety Relief Valve',
    mimeType: 'image/png',
    sizeBytes: 107612,
    width: 800,
    height: 800,
    createdAt: '2026-01-12T00:00:00Z',
  },
  {
    id: 'a0000013-0000-4000-8000-000000000013',
    fileName: 'evt-pro.png',
    storageKey: 'products/evt-pro.png',
    publicUrl: '/images/products/evt-pro.png',
    altText: 'Consolidated EVT-Pro Electronic Valve Tester',
    mimeType: 'image/png',
    sizeBytes: 391236,
    width: 1000,
    height: 1000,
    createdAt: '2026-01-13T00:00:00Z',
  },
  {
    id: 'a0000014-0000-4000-8000-000000000014',
    fileName: 'optidist-2-angle-official.png',
    storageKey: 'products/optidist-2-angle-official.png',
    publicUrl: '/images/products/optidist-2-angle-official.png',
    altText: 'Bàn giao PAC OptiDist 2 tại Quatest 2',
    mimeType: 'image/png',
    sizeBytes: 1510261,
    width: 1200,
    height: 1200,
    createdAt: '2026-03-01T00:00:00Z',
  },
  {
    id: 'a0000015-0000-4000-8000-000000000015',
    fileName: 'safety-valve-seminar.jpg',
    storageKey: 'news/safety-valve-seminar.jpg',
    publicUrl: '/images/news/safety-valve-seminar.jpg',
    altText: 'Hội thảo bảo dưỡng và kiểm định van an toàn cùng Bộ Công Thương',
    mimeType: 'image/jpeg',
    sizeBytes: 353168,
    width: 1200,
    height: 800,
    createdAt: '2019-11-20T00:00:00Z',
  },
  {
    id: 'a0000016-0000-4000-8000-000000000016',
    fileName: 'phase-dfa-70xi-transparent.png',
    storageKey: 'news/phase-dfa-70xi-transparent.png',
    publicUrl: '/images/news/phase-dfa-70xi-transparent.png',
    altText: 'Bàn giao Phase Technology 70Xi tại Skypec Hà Nội',
    mimeType: 'image/png',
    sizeBytes: 1511827,
    width: 1200,
    height: 1200,
    createdAt: '2025-07-09T00:00:00Z',
  },
];

const INITIAL_STANDARDS: Standard[] = [
  {
    id: 'b0000001-0000-4000-8000-000000000001',
    code: 'ASTM D86',
    organization: 'ASTM',
    year: 2023,
    title: 'Standard Test Method for Distillation of Petroleum Products at Atmospheric Pressure',
    description: 'Phương pháp tiêu chuẩn xác định khoảng chưng cất của các sản phẩm dầu mỏ ở áp suất khí quyển.',
    createdAt: '2026-01-01T00:00:00Z',
  },
  {
    id: 'b0000002-0000-4000-8000-000000000002',
    code: 'ISO 3405',
    organization: 'ISO',
    year: 2019,
    title: 'Petroleum and related products — Determination of distillation characteristics at atmospheric pressure',
    description: 'Tiêu chuẩn quốc tế xác định đặc tính chưng cất của sản phẩm dầu khí ở áp suất khí quyển.',
    createdAt: '2026-01-01T00:00:00Z',
  },
  {
    id: 'b0000003-0000-4000-8000-000000000003',
    code: 'IP 123',
    organization: 'Energy Institute',
    year: 2019,
    title: 'Petroleum products — Determination of distillation characteristics at atmospheric pressure',
    description: 'Phương pháp kiểm nghiệm chưng cất khí quyển theo tiêu chuẩn Viện Năng lượng Anh Quốc.',
    createdAt: '2026-01-01T00:00:00Z',
  },
  {
    id: 'b0000004-0000-4000-8000-000000000004',
    code: 'ASTM D7668',
    organization: 'ASTM',
    year: 2022,
    title: 'Standard Test Method for Determination of Derived Cetane Number (DCN) of Diesel Fuel Oils',
    description: 'Phương pháp xác định trị số cetane dẫn xuất (DCN) của nhiên liệu diesel bằng buồng đốt thể tích không đổi.',
    createdAt: '2026-01-01T00:00:00Z',
  },
  {
    id: 'b0000005-0000-4000-8000-000000000005',
    code: 'ASTM D445',
    organization: 'ASTM',
    year: 2021,
    title: 'Standard Test Method for Kinematic Viscosity of Transparent and Opaque Liquids',
    description: 'Phương pháp đo độ nhớt động học của chất lỏng trong suốt và mờ đục.',
    createdAt: '2026-01-01T00:00:00Z',
  },
  {
    id: 'b0000006-0000-4000-8000-000000000006',
    code: 'ISO 3104',
    organization: 'ISO',
    year: 2020,
    title: 'Petroleum products — Transparent and opaque liquids — Determination of kinematic viscosity',
    description: 'Tiêu chuẩn ISO xác định độ nhớt động học và tính toán độ nhớt động lực học.',
    createdAt: '2026-01-01T00:00:00Z',
  },
  {
    id: 'b0000007-0000-4000-8000-000000000007',
    code: 'ASTM D93',
    organization: 'ASTM',
    year: 2020,
    title: 'Standard Test Methods for Flash Point by Pensky-Martens Closed Cup Tester',
    description: 'Phương pháp xác định điểm chớp cháy bằng thiết bị cốc kín Pensky-Martens.',
    createdAt: '2026-01-01T00:00:00Z',
  },
  {
    id: 'b0000008-0000-4000-8000-000000000008',
    code: 'ISO 2719',
    organization: 'ISO',
    year: 2016,
    title: 'Determination of flash point — Pensky-Martens closed cup method',
    description: 'Tiêu chuẩn xác định điểm chớp cháy theo phương pháp cốc kín Pensky-Martens.',
    createdAt: '2026-01-01T00:00:00Z',
  },
  {
    id: 'b0000009-0000-4000-8000-000000000009',
    code: 'ASTM D1160',
    organization: 'ASTM',
    year: 2018,
    title: 'Standard Test Method for Distillation of Petroleum Products at Reduced Pressure',
    description: 'Phương pháp chưng cất sản phẩm dầu mỏ ở áp suất chân không giảm thấp.',
    createdAt: '2026-01-01T00:00:00Z',
  },
  {
    id: 'b0000010-0000-4000-8000-000000000010',
    code: 'ISO 6616',
    organization: 'ISO',
    year: 2000,
    title: 'Petroleum products — Determination of distillation characteristics at reduced pressure',
    description: 'Xác định đặc tính chưng cất chân không của các phân đoạn dầu nặng.',
    createdAt: '2026-01-01T00:00:00Z',
  },
  {
    id: 'b0000011-0000-4000-8000-000000000011',
    code: 'ASTM D5191',
    organization: 'ASTM',
    year: 2022,
    title: 'Standard Test Method for Vapor Pressure of Petroleum Products (Mini Method)',
    description: 'Phương pháp đo áp suất hơi vi lượng của xăng và nhiên liệu lỏng.',
    createdAt: '2026-01-01T00:00:00Z',
  },
  {
    id: 'b0000012-0000-4000-8000-000000000012',
    code: 'ASME B16.34',
    organization: 'ASME',
    year: 2020,
    title: 'Valves Flanged, Threaded and Welding End',
    description: 'Tiêu chuẩn thiết kế, áp suất và nhiệt độ cho van mặt bích, nối ren và hàn.',
    createdAt: '2026-01-01T00:00:00Z',
  },
  {
    id: 'b0000013-0000-4000-8000-000000000013',
    code: 'HART Protocol',
    organization: 'FieldComm Group',
    year: 2021,
    title: 'Highway Addressable Remote Transducer Protocol',
    description: 'Giao thức truyền thông số hai chiều trên nền tín hiệu tương tự 4-20mA cho van và thiết bị đo.',
    createdAt: '2026-01-01T00:00:00Z',
  },
  {
    id: 'b0000014-0000-4000-8000-000000000014',
    code: 'ASME Section I',
    organization: 'ASME',
    year: 2021,
    title: 'Rules for Construction of Power Boilers',
    description: 'Quy chuẩn chế tạo nồi hơi và van an toàn áp suất cao trong nhà máy nhiệt điện.',
    createdAt: '2026-01-01T00:00:00Z',
  },
  {
    id: 'b0000015-0000-4000-8000-000000000015',
    code: 'ASME Section VIII',
    organization: 'ASME',
    year: 2021,
    title: 'Rules for Construction of Pressure Vessels',
    description: 'Quy chuẩn thiết kế và kiểm định bình áp lực và van an toàn công nghiệp.',
    createdAt: '2026-01-01T00:00:00Z',
  },
];

const INITIAL_MACHINES: Machine[] = [
  {
    id: 'd0000001-0000-4000-8000-000000000001',
    name: 'Thiết bị chưng cất khí quyển tự động (PAC OptiDist 2)',
    slug: 'optidist',
    model: 'OptiDist 2',
    shortDescription: 'Hệ thống chưng cất tự động cho xăng, diesel và nhiên liệu hàng không, hỗ trợ kiểm soát tốc độ chưng cất ổn định.',
    description: 'PAC OptiDist 2 là hệ thống phân tích chưng cất khí quyển tự động tiên tiến hàng đầu thế giới, đáp ứng hoàn hảo các tiêu chuẩn ASTM D86, ISO 3405 và IP 123. Thiết bị sở hữu công nghệ cảm biến quang học tiên tiến và bộ gia nhiệt thông minh giúp tối ưu hóa quá trình chưng cất chỉ với một thao tác bấm nút.',
    mainImageId: 'a0000001-0000-4000-8000-000000000001',
    status: 'published',
    sortOrder: 1,
    publishedAt: '2026-01-01T00:00:00Z',
    createdAt: '2026-01-01T00:00:00Z',
    updatedAt: '2026-09-14T10:00:00Z',
    applications: [
      { id: '10000000-0000-0000-0000-000000000001', machineId: 'd0000001-0000-4000-8000-000000000001', title: 'Xăng thương phẩm & xăng pha ethanol', description: 'Kiểm tra đường cong chưng cất phân đoạn', sortOrder: 1 },
      { id: '10000000-0000-0000-0000-000000000002', machineId: 'd0000001-0000-4000-8000-000000000001', title: 'Nhiên liệu Diesel (DO)', description: 'Xác định điểm sôi cuối và cặn chưng cất', sortOrder: 2 },
      { id: '10000000-0000-0000-0000-000000000003', machineId: 'd0000001-0000-4000-8000-000000000001', title: 'Nhiên liệu hàng không Jet A-1', description: 'Đảm bảo nghiêm ngặt tiêu chuẩn bay quốc tế', sortOrder: 3 },
    ],
    highlights: [
      { id: '20000000-0000-0000-0000-000000000001', machineId: 'd0000001-0000-4000-8000-000000000001', title: 'Vận hành tự động hoàn toàn', description: 'Chỉ cần nạp mẫu và nhấn nút khởi động', icon: 'zap', sortOrder: 1 },
      { id: '20000000-0000-0000-0000-000000000002', machineId: 'd0000001-0000-4000-8000-000000000001', title: 'Kiểm soát tốc độ gia nhiệt thông minh', description: 'Tối ưu hóa gia nhiệt chính xác từ điểm sôi đầu đến điểm sôi cuối', icon: 'activity', sortOrder: 2 },
      { id: '20000000-0000-0000-0000-000000000003', machineId: 'd0000001-0000-4000-8000-000000000001', title: 'An toàn phòng lab tối đa', description: 'Tích hợp cảm biến quang báo cháy và hệ thống dập lửa CO2', icon: 'shield', sortOrder: 3 },
    ],
    specs: [
      { id: '30000000-0000-0000-0000-000000000001', machineId: 'd0000001-0000-4000-8000-000000000001', groupName: 'Vận hành', specName: 'Phương pháp thử', specValue: 'Chưng cất khí quyển tự động', unit: '', sortOrder: 1 },
      { id: '30000000-0000-0000-0000-000000000002', machineId: 'd0000001-0000-4000-8000-000000000001', groupName: 'Vận hành', specName: 'Mẫu thử nghiệm', specValue: 'Xăng, Diesel, Nhiên liệu bay Jet A-1', unit: '', sortOrder: 2 },
      { id: '30000000-0000-0000-0000-000000000003', machineId: 'd0000001-0000-4000-8000-000000000001', groupName: 'Nhiệt độ', specName: 'Dải nhiệt độ đo', specValue: '0 đến 450 °C', unit: '°C', sortOrder: 3 },
      { id: '30000000-0000-0000-0000-000000000004', machineId: 'd0000001-0000-4000-8000-000000000001', groupName: 'Đo lường', specName: 'Độ chính xác thể tích', specValue: '± 0.1 mL', unit: 'mL', sortOrder: 4 },
    ],
  },
  {
    id: 'd0000002-0000-4000-8000-000000000002',
    name: 'Thiết bị xác định trị số cetane dẫn xuất (Herzog CID 510)',
    slug: 'cid-510',
    model: 'CID 510',
    shortDescription: 'Phân tích chất lượng cháy của nhiên liệu diesel thông qua phép đo thời gian trễ đánh lửa.',
    description: 'Herzog CID 510 là thiết bị đo trị số cetane dẫn xuất (DCN) thế hệ mới theo tiêu chuẩn ASTM D7668.',
    mainImageId: 'a0000002-0000-4000-8000-000000000002',
    status: 'published',
    sortOrder: 2,
    publishedAt: '2026-01-02T00:00:00Z',
    createdAt: '2026-01-02T00:00:00Z',
    updatedAt: '2026-09-14T10:00:00Z',
    applications: [
      { id: '10000000-0000-0000-0000-000000000004', machineId: 'd0000002-0000-4000-8000-000000000002', title: 'Nhiên liệu Diesel truyền thống', description: 'Đo lường thời gian trễ đánh lửa ID', sortOrder: 1 },
      { id: '10000000-0000-0000-0000-000000000005', machineId: 'd0000002-0000-4000-8000-000000000002', title: 'Nhiên liệu sinh học Biodiesel & HVO', description: 'Đánh giá chất lượng cháy của hỗn hợp sinh học', sortOrder: 2 },
    ],
    highlights: [
      { id: '20000000-0000-0000-0000-000000000004', machineId: 'd0000002-0000-4000-8000-000000000002', title: 'Thời gian phân tích siêu tốc', description: 'Cho kết quả DCN chính xác dưới 20 phút', icon: 'clock', sortOrder: 1 },
      { id: '20000000-0000-0000-0000-000000000005', machineId: 'd0000002-0000-4000-8000-000000000002', title: 'Tiết kiệm mẫu thử', description: 'Chỉ yêu cầu thể tích mẫu dưới 100 mL', icon: 'droplet', sortOrder: 2 },
    ],
    specs: [
      { id: '30000000-0000-0000-0000-000000000005', machineId: 'd0000002-0000-4000-8000-000000000002', groupName: 'Đo lường', specName: 'Chỉ số đo lường', specValue: 'Trị số Cetane dẫn xuất (DCN)', unit: '', sortOrder: 1 },
      { id: '30000000-0000-0000-0000-000000000006', machineId: 'd0000002-0000-4000-8000-000000000002', groupName: 'Đo lường', specName: 'Dải đo DCN', specValue: '35 đến 85 DCN', unit: 'DCN', sortOrder: 2 },
    ],
  },
  {
    id: 'd0000003-0000-4000-8000-000000000003',
    name: 'Thiết bị đo độ nhớt động học tự động (Herzog HVM 472)',
    slug: 'hvm-472',
    model: 'HVM 472',
    shortDescription: 'Hệ thống đo độ nhớt đa dải, hỗ trợ tự động hóa quy trình phân tích sản phẩm dầu mỏ.',
    description: 'Herzog HVM 472 là thiết bị đo độ nhớt mao quản tự động đa dải, phân tích cùng lúc hai mẫu độc lập.',
    mainImageId: 'a0000003-0000-4000-8000-000000000003',
    status: 'published',
    sortOrder: 3,
    publishedAt: '2026-01-03T00:00:00Z',
    createdAt: '2026-01-03T00:00:00Z',
    updatedAt: '2026-09-14T10:00:00Z',
    applications: [
      { id: '10000000-0000-0000-0000-000000000007', machineId: 'd0000003-0000-4000-8000-000000000003', title: 'Dầu nhờn động cơ và công nghiệp', description: 'Phân tích độ nhớt ở 40°C và 100°C', sortOrder: 1 },
    ],
    highlights: [
      { id: '20000000-0000-0000-0000-000000000006', machineId: 'd0000003-0000-4000-8000-000000000003', title: 'Hai vị trí đo độc lập', description: 'Phân tích đồng thời hai mẫu', icon: 'layers', sortOrder: 1 },
    ],
    specs: [
      { id: '30000000-0000-0000-0000-000000000007', machineId: 'd0000003-0000-4000-8000-000000000003', groupName: 'Đo lường', specName: 'Dải đo độ nhớt', specValue: '0.3 đến 10,000 mm²/s', unit: 'mm²/s', sortOrder: 1 },
    ],
  },
  {
    id: 'd0000007-0000-4000-8000-000000000007',
    name: 'Van điều khiển globe hiệu suất cao (Masoneilan 21000 Series)',
    slug: 'masoneilan-21000',
    model: '21000 Series',
    shortDescription: 'Dòng van điều khiển đa dụng cho các ứng dụng chất lỏng, khí và hơi trong nhà máy công nghiệp.',
    description: 'Masoneilan 21000 Series là dòng van cầu điều khiển đơn cổng được ứng dụng rộng rãi nhất trong các nhà máy lọc dầu, hóa chất.',
    mainImageId: 'a0000007-0000-4000-8000-000000000007',
    status: 'published',
    sortOrder: 4,
    publishedAt: '2026-01-07T00:00:00Z',
    createdAt: '2026-01-07T00:00:00Z',
    updatedAt: '2026-09-14T10:00:00Z',
    applications: [
      { id: '10000000-0000-0000-0000-000000000008', machineId: 'd0000007-0000-4000-8000-000000000007', title: 'Hơi nhiệt độ cao và áp suất cao', description: 'Điều khiển lưu lượng hơi bảo vệ hệ thống', sortOrder: 1 },
    ],
    highlights: [
      { id: '20000000-0000-0000-0000-000000000007', machineId: 'd0000007-0000-4000-8000-000000000007', title: 'Cấu trúc thân van hạng nặng', description: 'Độ bền cao, chịu rung động và chênh áp lớn', icon: 'cpu', sortOrder: 1 },
    ],
    specs: [
      { id: '30000000-0000-0000-0000-000000000008', machineId: 'd0000007-0000-4000-8000-000000000007', groupName: 'Kỹ thuật van', specName: 'Kích cỡ danh định (Size)', specValue: '3/4 inch đến 8 inch (DN 20 đến DN 200)', unit: '', sortOrder: 1 },
    ],
  },
  {
    id: 'd0000011-0000-4000-8000-000000000011',
    name: 'Van an toàn cho hệ thống CCGT và hơi cao áp (Consolidated 2700 Series)',
    slug: 'consolidated-2700',
    model: '2700 Series',
    shortDescription: 'Dòng van an toàn được thiết kế cho các hệ thống phát điện tuabin khí chu trình hỗn hợp và dịch vụ hơi.',
    description: 'Consolidated 2700 Series đáp ứng tiêu chuẩn ASME Section I & Section VIII, được tối ưu hóa đặc biệt cho các bộ sinh hơi HRSG.',
    mainImageId: 'a0000011-0000-4000-8000-000000000011',
    status: 'published',
    sortOrder: 5,
    publishedAt: '2026-01-11T00:00:00Z',
    createdAt: '2026-01-11T00:00:00Z',
    updatedAt: '2026-09-14T10:00:00Z',
    applications: [
      { id: '10000000-0000-0000-0000-000000000009', machineId: 'd0000011-0000-4000-8000-000000000011', title: 'Hệ thống lò hơi CCGT / HRSG', description: 'Xả quá áp bảo vệ bao hơi', sortOrder: 1 },
    ],
    highlights: [
      { id: '20000000-0000-0000-0000-000000000008', machineId: 'd0000011-0000-4000-8000-000000000011', title: 'Đĩa van Thermodisc chịu nhiệt cao', description: 'Kín tuyệt đối ở 96% áp suất xả', icon: 'check-circle', sortOrder: 1 },
    ],
    specs: [
      { id: '30000000-0000-0000-0000-000000000009', machineId: 'd0000011-0000-4000-8000-000000000011', groupName: 'Áp suất & Nhiệt', specName: 'Áp suất cài đặt tối đa', specValue: 'Lên tới 207 bar', unit: 'bar', sortOrder: 1 },
    ],
  },
];

const INITIAL_CONTACTS: Contact[] = [
  {
    id: 'f0000001-0000-4000-8000-000000000001',
    fullName: 'Nguyễn Văn Hải',
    companyName: 'Công ty Cổ phần Lọc hóa dầu Bình Sơn (BSR)',
    email: 'hai.nv@bsr.com.vn',
    phone: '0912 345 678',
    subject: 'Yêu cầu báo giá bảo trì định kỳ van an toàn Consolidated',
    message: 'Kính gửi LT Việt Nam, chúng tôi đang chuẩn bị kế hoạch bảo dưỡng định kỳ cho phân xưởng chưng cất tháp dầu thô. Xin vui lòng gửi phương án kiểm định van an toàn tại hiện trường bằng thiết bị EVT-Pro.',
    status: 'new',
    assignedTo: '11111111-1111-4111-8111-111111111111',
    adminNote: 'Đã chuyển phòng kỹ thuật van chuẩn bị tài liệu báo giá.',
    createdAt: '2026-09-15T09:30:00Z',
    updatedAt: '2026-09-15T09:30:00Z',
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
    assignedTo: '22222222-2222-4222-8222-222222222222',
    adminNote: 'Đang liên hệ đại diện PAC Singapore để xác nhận mã linh kiện.',
    createdAt: '2026-09-14T14:20:00Z',
    updatedAt: '2026-09-14T14:20:00Z',
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
    assignedTo: '11111111-1111-4111-8111-111111111111',
    adminNote: 'Đã gửi catalog kỹ thuật và tài liệu sizing van Masoneilan ngày 16/09.',
    resolvedAt: '2026-09-16T16:00:00Z',
    createdAt: '2026-09-12T10:15:00Z',
    updatedAt: '2026-09-16T16:00:00Z',
  },
];

const INITIAL_NEWS: NewsEvent[] = [
  {
    id: 'e0000001-0000-4000-8000-000000000001',
    type: 'news',
    title: 'LT Việt Nam hoàn thành lắp đặt và bàn giao PAC OptiDist 2 tại Quatest 2',
    slug: 'ban-giao-pac-optidist-2',
    shortDescription: 'Đội ngũ kỹ thuật hoàn thành lắp đặt, hướng dẫn vận hành và chuyển giao thiết bị chưng cất tự động tại Quatest 2.',
    thumbnailImageId: 'a0000014-0000-4000-8000-000000000014',
    status: 'published',
    publishedAt: '2026-03-01T08:00:00Z',
    authorId: '11111111-1111-4111-8111-111111111111',
    content: {
      version: 1,
      blocks: [
        {
          type: 'heading',
          data: { level: 2, text: 'Triển khai và chuyển giao công nghệ tại Quatest 2' },
        },
        {
          type: 'paragraph',
          data: { text: 'Dự án tập trung vào việc đưa hệ thống chưng cất tự động PAC OptiDist 2 vào vận hành ổn định tại phòng thí nghiệm kiểm định của Quatest 2.' },
        },
      ],
    },
    createdAt: '2026-03-01T08:00:00Z',
    updatedAt: '2026-03-01T08:00:00Z',
  },
  {
    id: 'e0000002-0000-4000-8000-000000000002',
    type: 'event',
    title: 'Hội thảo chuyên đề: Bảo dưỡng và kiểm định van an toàn cùng Bộ Công Thương',
    slug: 'hoi-thao-van-an-toan',
    shortDescription: 'Hội thảo được tổ chức tại Hà Nội phối hợp cùng Bộ Công Thương và Baker Hughes GE, với đại biểu từ hơn 20 nhà máy công nghiệp lớn.',
    thumbnailImageId: 'a0000015-0000-4000-8000-000000000015',
    status: 'published',
    publishedAt: '2019-11-20T08:00:00Z',
    eventStartAt: '2019-11-20T08:30:00Z',
    eventEndAt: '2019-11-20T17:00:00Z',
    location: 'Khách sạn Melia, 44 Lý Thường Kiệt, Hoàn Kiếm, Hà Nội',
    authorId: '11111111-1111-4111-8111-111111111111',
    content: {
      version: 1,
      blocks: [
        {
          type: 'heading',
          data: { level: 2, text: 'Nâng cao an toàn vận hành trong nhà máy công nghiệp' },
        },
        {
          type: 'paragraph',
          data: { text: 'Hội thảo do lãnh đạo Cục An toàn và Môi trường Công nghiệp chủ trì, quy tụ hơn 80 chuyên gia hàng đầu.' },
        },
      ],
    },
    createdAt: '2019-11-20T08:00:00Z',
    updatedAt: '2019-11-20T08:00:00Z',
  },
  {
    id: 'e0000003-0000-4000-8000-000000000003',
    type: 'news',
    title: 'Chuyển giao thiết bị xác định điểm đông đặc Phase Technology 70Xi tại Skypec',
    slug: 'chuyen-giao-dfa-70xi',
    shortDescription: 'LT Việt Nam hoàn thành giao hàng, lắp đặt, chạy thử và đào tạo chuyển giao công nghệ tại chi nhánh Skypec Hà Nội.',
    thumbnailImageId: 'a0000016-0000-4000-8000-000000000016',
    status: 'published',
    publishedAt: '2025-07-09T09:00:00Z',
    authorId: '11111111-1111-4111-8111-111111111111',
    content: {
      version: 1,
      blocks: [
        {
          type: 'heading',
          data: { level: 2, text: 'Đảm bảo tiêu chuẩn chất lượng nhiên liệu hàng không Jet A-1' },
        },
        {
          type: 'paragraph',
          data: { text: 'Đội ngũ kỹ thuật LT Việt Nam đã hoàn tất bàn giao và nghiệm thu thiết bị phân tích điểm đông đặc tự động Phase Technology tại Skypec.' },
        },
      ],
    },
    createdAt: '2025-07-09T09:00:00Z',
    updatedAt: '2025-07-09T09:00:00Z',
  },
];

// Helper Storage Manager (Offline-first resilient fallback)
function getStored<T>(key: string, defaultData: T): T {
  try {
    const item = localStorage.getItem(`ltvn_admin_${key}`);
    return item ? JSON.parse(item) : defaultData;
  } catch {
    return defaultData;
  }
}

function setStored<T>(key: string, data: T): void {
  try {
    localStorage.setItem(`ltvn_admin_${key}`, JSON.stringify(data));
  } catch (e) {
    console.warn('Storage quota exceeded or unavailable', e);
  }
}

// HTTP request helper with timeout and fallback
async function apiRequest<T>(endpoint: string, options?: RequestInit): Promise<T | null> {
  try {
    const res = await fetch(endpoint, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...(options?.headers || {}),
      },
      signal: AbortSignal.timeout(6000),
    });
    if (!res.ok) {
      console.warn(`[API] ${options?.method || 'GET'} ${endpoint} status ${res.status}`);
      return null;
    }
    return (await res.json()) as T;
  } catch (err) {
    console.warn(`[API] ${options?.method || 'GET'} ${endpoint} network failure:`, err);
    return null;
  }
}

// Data Store Service connecting Admin Portal to NestJS Backend & Neon PostgreSQL
export const api = {
  // Check backend health
  async checkBackend(): Promise<boolean> {
    try {
      const res = await fetch('/api', { method: 'GET', signal: AbortSignal.timeout(2000) });
      return res.ok;
    } catch {
      return false;
    }
  },

  // Machines
  async getMachines(): Promise<Machine[]> {
    const remote = await apiRequest<Machine[]>('/api/machines');
    if (remote && Array.isArray(remote)) {
      setStored('machines', remote);
      return remote;
    }
    return getStored('machines', INITIAL_MACHINES);
  },

  async saveMachine(machine: Machine): Promise<Machine> {
    let saved: Machine | null = null;
    const isExisting = Boolean(machine.id && isValidUuid(machine.id));

    if (isExisting) {
      saved = await apiRequest<Machine>(`/api/machines/${machine.id}`, {
        method: 'PUT',
        body: JSON.stringify(machine),
      });
    }

    if (!saved) {
      saved = await apiRequest<Machine>('/api/machines', {
        method: 'POST',
        body: JSON.stringify(machine),
      });
    }

    const result = saved || {
      ...machine,
      id: machine.id || crypto.randomUUID(),
      updatedAt: new Date().toISOString(),
      createdAt: machine.createdAt || new Date().toISOString(),
    };

    const list = getStored('machines', INITIAL_MACHINES);
    const idx = list.findIndex((m) => m.id === result.id);
    if (idx >= 0) {
      list[idx] = result;
    } else {
      list.unshift(result);
    }
    setStored('machines', list);
    return result;
  },

  async deleteMachine(id: string): Promise<void> {
    if (isValidUuid(id)) {
      await apiRequest(`/api/machines/${id}`, { method: 'DELETE' });
    }
    const list = getStored('machines', INITIAL_MACHINES).filter((m) => m.id !== id);
    setStored('machines', list);
  },

  // Standards
  async getStandards(): Promise<Standard[]> {
    const remote = await apiRequest<Standard[]>('/api/standards');
    if (remote && Array.isArray(remote)) {
      setStored('standards', remote);
      return remote;
    }
    return getStored('standards', INITIAL_STANDARDS);
  },

  async saveStandard(standard: Standard): Promise<Standard> {
    let saved: Standard | null = null;
    const isExisting = Boolean(standard.id && isValidUuid(standard.id));

    if (isExisting) {
      saved = await apiRequest<Standard>(`/api/standards/${standard.id}`, {
        method: 'PUT',
        body: JSON.stringify(standard),
      });
    }

    if (!saved) {
      saved = await apiRequest<Standard>('/api/standards', {
        method: 'POST',
        body: JSON.stringify(standard),
      });
    }

    const result = saved || {
      ...standard,
      id: standard.id || crypto.randomUUID(),
      createdAt: standard.createdAt || new Date().toISOString(),
    };

    const list = getStored('standards', INITIAL_STANDARDS);
    const idx = list.findIndex((s) => s.id === result.id);
    if (idx >= 0) {
      list[idx] = result;
    } else {
      list.unshift(result);
    }
    setStored('standards', list);
    return result;
  },

  async deleteStandard(id: string): Promise<void> {
    if (isValidUuid(id)) {
      await apiRequest(`/api/standards/${id}`, { method: 'DELETE' });
    }
    const list = getStored('standards', INITIAL_STANDARDS).filter((s) => s.id !== id);
    setStored('standards', list);
  },

  // Media
  async getMedia(): Promise<MediaAsset[]> {
    const remote = await apiRequest<MediaAsset[]>('/api/media');
    if (remote && Array.isArray(remote)) {
      setStored('media', remote);
      return remote;
    }
    return getStored('media', INITIAL_MEDIA);
  },

  async saveMedia(asset: MediaAsset): Promise<MediaAsset> {
    const saved = await apiRequest<MediaAsset>('/api/media', {
      method: 'POST',
      body: JSON.stringify(asset),
    });

    const result = saved || {
      ...asset,
      id: asset.id || crypto.randomUUID(),
      createdAt: asset.createdAt || new Date().toISOString(),
    };

    const list = getStored('media', INITIAL_MEDIA);
    const idx = list.findIndex((m) => m.id === result.id);
    if (idx >= 0) {
      list[idx] = result;
    } else {
      list.unshift(result);
    }
    setStored('media', list);
    return result;
  },

  async deleteMedia(id: string): Promise<void> {
    if (isValidUuid(id)) {
      await apiRequest(`/api/media/${id}`, { method: 'DELETE' });
    }
    const list = getStored('media', INITIAL_MEDIA).filter((m) => m.id !== id);
    setStored('media', list);
  },

  // News Events
  async getNewsEvents(): Promise<NewsEvent[]> {
    const remote = await apiRequest<NewsEvent[]>('/api/news-events');
    if (remote && Array.isArray(remote)) {
      setStored('news_events', remote);
      return remote;
    }
    return getStored('news_events', INITIAL_NEWS);
  },

  async saveNewsEvent(item: NewsEvent): Promise<NewsEvent> {
    let saved: NewsEvent | null = null;
    const isExisting = Boolean(item.id && isValidUuid(item.id));

    if (isExisting) {
      saved = await apiRequest<NewsEvent>(`/api/news-events/${item.id}`, {
        method: 'PUT',
        body: JSON.stringify(item),
      });
    }

    if (!saved) {
      saved = await apiRequest<NewsEvent>('/api/news-events', {
        method: 'POST',
        body: JSON.stringify(item),
      });
    }

    const result = saved || {
      ...item,
      id: item.id || crypto.randomUUID(),
      updatedAt: new Date().toISOString(),
      createdAt: item.createdAt || new Date().toISOString(),
    };

    const list = getStored('news_events', INITIAL_NEWS);
    const idx = list.findIndex((n) => n.id === result.id);
    if (idx >= 0) {
      list[idx] = result;
    } else {
      list.unshift(result);
    }
    setStored('news_events', list);
    return result;
  },

  async deleteNewsEvent(id: string): Promise<void> {
    if (isValidUuid(id)) {
      await apiRequest(`/api/news-events/${id}`, { method: 'DELETE' });
    }
    const list = getStored('news_events', INITIAL_NEWS).filter((n) => n.id !== id);
    setStored('news_events', list);
  },

  // Contacts
  async getContacts(): Promise<Contact[]> {
    const remote = await apiRequest<Contact[]>('/api/contacts');
    if (remote && Array.isArray(remote)) {
      setStored('contacts', remote);
      return remote;
    }
    return getStored('contacts', INITIAL_CONTACTS);
  },

  async updateContactStatus(id: string, status: Contact['status'], note?: string): Promise<void> {
    if (isValidUuid(id)) {
      await apiRequest(`/api/contacts/${id}/status`, {
        method: 'PATCH',
        body: JSON.stringify({ status, adminNote: note }),
      });
    }
    const list = getStored('contacts', INITIAL_CONTACTS);
    const target = list.find((c) => c.id === id);
    if (target) {
      target.status = status;
      if (note !== undefined) target.adminNote = note;
      if (status === 'resolved') target.resolvedAt = new Date().toISOString();
      target.updatedAt = new Date().toISOString();
      setStored('contacts', list);
    }
  },

  async deleteContact(id: string): Promise<void> {
    if (isValidUuid(id)) {
      await apiRequest(`/api/contacts/${id}`, { method: 'DELETE' });
    }
    const list = getStored('contacts', INITIAL_CONTACTS).filter((c) => c.id !== id);
    setStored('contacts', list);
  },

  // Users
  async getUsers(): Promise<User[]> {
    const remote = await apiRequest<User[]>('/api/users');
    if (remote && Array.isArray(remote)) {
      setStored('users', remote);
      return remote;
    }
    return getStored('users', INITIAL_USERS);
  },

  async saveUser(user: User): Promise<User> {
    let saved: User | null = null;
    const isExisting = Boolean(user.id && isValidUuid(user.id));

    if (isExisting) {
      saved = await apiRequest<User>(`/api/users/${user.id}`, {
        method: 'PUT',
        body: JSON.stringify(user),
      });
    }

    if (!saved) {
      saved = await apiRequest<User>('/api/users', {
        method: 'POST',
        body: JSON.stringify(user),
      });
    }

    const result = saved || {
      ...user,
      id: user.id || crypto.randomUUID(),
      updatedAt: new Date().toISOString(),
      createdAt: user.createdAt || new Date().toISOString(),
    };

    const list = getStored('users', INITIAL_USERS);
    const idx = list.findIndex((u) => u.id === result.id);
    if (idx >= 0) {
      list[idx] = result;
    } else {
      list.unshift(result);
    }
    setStored('users', list);
    return result;
  },

  async deleteUser(id: string): Promise<void> {
    if (isValidUuid(id)) {
      await apiRequest(`/api/users/${id}`, { method: 'DELETE' });
    }
    const list = getStored('users', INITIAL_USERS).filter((u) => u.id !== id);
    setStored('users', list);
  },
};

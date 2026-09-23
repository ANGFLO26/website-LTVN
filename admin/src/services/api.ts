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
  {
    id: 'b0000000-0000-4000-8000-000000000010',
    code: '87/88 Config',
    organization: 'Masoneilan',
    year: 2021,
    title: 'Pneumatic Spring-Diaphragm Actuation Configuration',
    description: 'Cấu hình tác động: 87: khí đóng (air to close) / 88: khí mở (air to open).',
    createdAt: '2026-01-01T00:00:00Z',
  },
  {
    id: 'b0000000-0000-4000-8000-000000000011',
    code: 'In-situ Testing',
    organization: 'ASME PTC 25 / Consolidated',
    year: 2022,
    title: 'In-situ Safety Valve Set Pressure Testing Method',
    description: 'Phương pháp kiểm tra áp suất cài đặt của van an toàn tại vị trí lắp đặt thực tế.',
    createdAt: '2026-01-01T00:00:00Z',
  },
];

const INITIAL_MACHINES: Machine[] = [
  {
    "id": "d0000001-0000-4000-8000-000000000001",
    "name": "Thiết bị chưng cất khí quyển tự động (PAC OptiDist 2)",
    "slug": "optidist",
    "model": "OptiDist 2",
    "shortDescription": "Hệ thống chưng cất tự động cho xăng, diesel và nhiên liệu hàng không, hỗ trợ kiểm soát tốc độ chưng cất ổn định.",
    "description": "Hệ thống chưng cất tự động cho xăng, diesel và nhiên liệu hàng không, hỗ trợ kiểm soát tốc độ chưng cất ổn định. An automated distillation system for gasoline, diesel and aviation fuel, with stable distillation rate control.",
    "mainImageId": "a0000001-0000-4000-8000-000000000001",
    "status": "published",
    "sortOrder": 1,
    "publishedAt": "2026-01-01T00:00:00Z",
    "createdAt": "2026-01-01T00:00:00Z",
    "updatedAt": "2026-09-14T10:00:00Z",
    "applications": [
      {
        "id": "10000000-0000-0000-0000-000000000001",
        "machineId": "d0000001-0000-4000-8000-000000000001",
        "title": "Xăng",
        "description": "Gasoline",
        "sortOrder": 1
      },
      {
        "id": "10000000-0000-0000-0000-000000000002",
        "machineId": "d0000001-0000-4000-8000-000000000001",
        "title": "Diesel",
        "description": "Diesel",
        "sortOrder": 2
      },
      {
        "id": "10000000-0000-0000-0000-000000000003",
        "machineId": "d0000001-0000-4000-8000-000000000001",
        "title": "Nhiên liệu hàng không",
        "description": "Aviation fuel",
        "sortOrder": 3
      }
    ],
    "highlights": [
      {
        "id": "20000000-0000-0000-0000-000000000001",
        "machineId": "d0000001-0000-4000-8000-000000000001",
        "title": "Vận hành tự động với giao diện trực quan",
        "description": "Automated operation with an intuitive interface",
        "icon": "check-circle",
        "sortOrder": 1
      },
      {
        "id": "20000000-0000-0000-0000-000000000002",
        "machineId": "d0000001-0000-4000-8000-000000000001",
        "title": "Kiểm soát tốc độ chưng cất trong suốt phép thử",
        "description": "Controls the distillation rate throughout the test",
        "icon": "check-circle",
        "sortOrder": 2
      },
      {
        "id": "20000000-0000-0000-0000-000000000003",
        "machineId": "d0000001-0000-4000-8000-000000000001",
        "title": "Giảm thao tác cài đặt nhiệt thủ công",
        "description": "Reduces manual heating setup",
        "icon": "check-circle",
        "sortOrder": 3
      }
    ],
    "specs": [
      {
        "id": "30000000-0000-0000-0000-000000000001",
        "machineId": "d0000001-0000-4000-8000-000000000001",
        "groupName": "Thông số chung",
        "specName": "Phương pháp",
        "specValue": "Chưng cất khí quyển tự động",
        "unit": "",
        "sortOrder": 1
      },
      {
        "id": "30000000-0000-0000-0000-000000000002",
        "machineId": "d0000001-0000-4000-8000-000000000001",
        "groupName": "Thông số chung",
        "specName": "Mẫu thử",
        "specValue": "Sản phẩm dầu mỏ và nhiên liệu",
        "unit": "",
        "sortOrder": 2
      },
      {
        "id": "30000000-0000-0000-0000-000000000003",
        "machineId": "d0000001-0000-4000-8000-000000000001",
        "groupName": "Thông số chung",
        "specName": "Điều khiển",
        "specValue": "Màn hình cảm ứng tích hợp",
        "unit": "",
        "sortOrder": 3
      }
    ]
  },
  {
    "id": "d0000002-0000-4000-8000-000000000001",
    "name": "Thiết bị xác định trị số cetane dẫn xuất (Herzog CID 510)",
    "slug": "cid-510",
    "model": "CID 510",
    "shortDescription": "Phân tích chất lượng cháy của nhiên liệu diesel thông qua phép đo thời gian trễ đánh lửa.",
    "description": "Phân tích chất lượng cháy của nhiên liệu diesel thông qua phép đo thời gian trễ đánh lửa. Evaluates diesel fuel ignition quality by measuring ignition delay.",
    "mainImageId": "a0000002-0000-4000-8000-000000000002",
    "status": "published",
    "sortOrder": 2,
    "publishedAt": "2026-01-01T00:00:00Z",
    "createdAt": "2026-01-01T00:00:00Z",
    "updatedAt": "2026-09-14T10:00:00Z",
    "applications": [
      {
        "id": "10000000-0000-0000-0000-000000000011",
        "machineId": "d0000002-0000-4000-8000-000000000001",
        "title": "Diesel",
        "description": "Diesel",
        "sortOrder": 1
      },
      {
        "id": "10000000-0000-0000-0000-000000000012",
        "machineId": "d0000002-0000-4000-8000-000000000001",
        "title": "Nhiên liệu sinh học",
        "description": "Biofuels",
        "sortOrder": 2
      }
    ],
    "highlights": [
      {
        "id": "20000000-0000-0000-0000-000000000011",
        "machineId": "d0000002-0000-4000-8000-000000000001",
        "title": "Thời gian phân tích ngắn",
        "description": "Short analysis time",
        "icon": "check-circle",
        "sortOrder": 1
      },
      {
        "id": "20000000-0000-0000-0000-000000000012",
        "machineId": "d0000002-0000-4000-8000-000000000001",
        "title": "Lượng mẫu nhỏ",
        "description": "Small sample volume",
        "icon": "check-circle",
        "sortOrder": 2
      },
      {
        "id": "20000000-0000-0000-0000-000000000013",
        "machineId": "d0000002-0000-4000-8000-000000000001",
        "title": "Phù hợp phòng thí nghiệm kiểm soát chất lượng",
        "description": "Suitable for quality control laboratories",
        "icon": "check-circle",
        "sortOrder": 3
      }
    ],
    "specs": [
      {
        "id": "30000000-0000-0000-0000-000000000011",
        "machineId": "d0000002-0000-4000-8000-000000000001",
        "groupName": "Thông số chung",
        "specName": "Kết quả",
        "specValue": "Trị số cetane dẫn xuất",
        "unit": "",
        "sortOrder": 1
      },
      {
        "id": "30000000-0000-0000-0000-000000000012",
        "machineId": "d0000002-0000-4000-8000-000000000001",
        "groupName": "Thông số chung",
        "specName": "Phương pháp",
        "specValue": "Buồng đốt thể tích không đổi",
        "unit": "",
        "sortOrder": 2
      },
      {
        "id": "30000000-0000-0000-0000-000000000013",
        "machineId": "d0000002-0000-4000-8000-000000000001",
        "groupName": "Thông số chung",
        "specName": "Ứng dụng",
        "specValue": "Kiểm soát chất lượng nhiên liệu diesel",
        "unit": "",
        "sortOrder": 3
      }
    ]
  },
  {
    "id": "d0000003-0000-4000-8000-000000000001",
    "name": "Thiết bị đo độ nhớt động học tự động (Herzog HVM 472)",
    "slug": "hvm-472",
    "model": "HVM 472",
    "shortDescription": "Hệ thống đo độ nhớt đa dải, hỗ trợ tự động hóa quy trình phân tích sản phẩm dầu mỏ.",
    "description": "Hệ thống đo độ nhớt đa dải, hỗ trợ tự động hóa quy trình phân tích sản phẩm dầu mỏ. A multi-range viscosity measurement system that automates petroleum product analysis.",
    "mainImageId": "a0000003-0000-4000-8000-000000000003",
    "status": "published",
    "sortOrder": 3,
    "publishedAt": "2026-01-01T00:00:00Z",
    "createdAt": "2026-01-01T00:00:00Z",
    "updatedAt": "2026-09-14T10:00:00Z",
    "applications": [
      {
        "id": "10000000-0000-0000-0000-000000000021",
        "machineId": "d0000003-0000-4000-8000-000000000001",
        "title": "Dầu nhờn",
        "description": "Lubricating oils",
        "sortOrder": 1
      },
      {
        "id": "10000000-0000-0000-0000-000000000022",
        "machineId": "d0000003-0000-4000-8000-000000000001",
        "title": "Nhiên liệu",
        "description": "Fuels",
        "sortOrder": 2
      },
      {
        "id": "10000000-0000-0000-0000-000000000023",
        "machineId": "d0000003-0000-4000-8000-000000000001",
        "title": "Sản phẩm dầu mỏ",
        "description": "Petroleum products",
        "sortOrder": 3
      }
    ],
    "highlights": [
      {
        "id": "20000000-0000-0000-0000-000000000021",
        "machineId": "d0000003-0000-4000-8000-000000000001",
        "title": "Đo tự động nhiều dải độ nhớt",
        "description": "Automatic measurement across multiple viscosity ranges",
        "icon": "check-circle",
        "sortOrder": 1
      },
      {
        "id": "20000000-0000-0000-0000-000000000022",
        "machineId": "d0000003-0000-4000-8000-000000000001",
        "title": "Giảm thời gian thao tác của kỹ thuật viên",
        "description": "Reduces operator handling time",
        "icon": "check-circle",
        "sortOrder": 2
      },
      {
        "id": "20000000-0000-0000-0000-000000000023",
        "machineId": "d0000003-0000-4000-8000-000000000001",
        "title": "Quản lý kết quả trên giao diện tích hợp",
        "description": "Manages results through the integrated interface",
        "icon": "check-circle",
        "sortOrder": 3
      }
    ],
    "specs": [
      {
        "id": "30000000-0000-0000-0000-000000000021",
        "machineId": "d0000003-0000-4000-8000-000000000001",
        "groupName": "Thông số chung",
        "specName": "Đại lượng",
        "specValue": "Độ nhớt động học",
        "unit": "",
        "sortOrder": 1
      },
      {
        "id": "30000000-0000-0000-0000-000000000022",
        "machineId": "d0000003-0000-4000-8000-000000000001",
        "groupName": "Thông số chung",
        "specName": "Phương pháp",
        "specValue": "Ống mao quản tự động",
        "unit": "",
        "sortOrder": 2
      },
      {
        "id": "30000000-0000-0000-0000-000000000023",
        "machineId": "d0000003-0000-4000-8000-000000000001",
        "groupName": "Thông số chung",
        "specName": "Điều khiển nhiệt",
        "specValue": "Bể ổn nhiệt tích hợp",
        "unit": "",
        "sortOrder": 3
      }
    ]
  },
  {
    "id": "d0000004-0000-4000-8000-000000000001",
    "name": "Thiết bị đo điểm chớp cháy cốc kín Pensky-Martens (Herzog OptiFlash)",
    "slug": "optiflash-pensky-martens",
    "model": "OptiFlash",
    "shortDescription": "Thiết bị tự động xác định điểm chớp cháy cho nhiên liệu, dầu nhờn và các sản phẩm dầu mỏ.",
    "description": "Thiết bị tự động xác định điểm chớp cháy cho nhiên liệu, dầu nhờn và các sản phẩm dầu mỏ. An automatic instrument for determining the flash point of fuels, lubricating oils and petroleum products.",
    "mainImageId": "a0000004-0000-4000-8000-000000000004",
    "status": "published",
    "sortOrder": 4,
    "publishedAt": "2026-01-01T00:00:00Z",
    "createdAt": "2026-01-01T00:00:00Z",
    "updatedAt": "2026-09-14T10:00:00Z",
    "applications": [
      {
        "id": "10000000-0000-0000-0000-000000000031",
        "machineId": "d0000004-0000-4000-8000-000000000001",
        "title": "Dầu nhờn",
        "description": "Lubricating oils",
        "sortOrder": 1
      },
      {
        "id": "10000000-0000-0000-0000-000000000032",
        "machineId": "d0000004-0000-4000-8000-000000000001",
        "title": "Diesel",
        "description": "Diesel",
        "sortOrder": 2
      },
      {
        "id": "10000000-0000-0000-0000-000000000033",
        "machineId": "d0000004-0000-4000-8000-000000000001",
        "title": "Sản phẩm dầu mỏ",
        "description": "Petroleum products",
        "sortOrder": 3
      }
    ],
    "highlights": [
      {
        "id": "20000000-0000-0000-0000-000000000031",
        "machineId": "d0000004-0000-4000-8000-000000000001",
        "title": "Nhận biết điểm chớp cháy tự động",
        "description": "Automatic flash point detection",
        "icon": "check-circle",
        "sortOrder": 1
      },
      {
        "id": "20000000-0000-0000-0000-000000000032",
        "machineId": "d0000004-0000-4000-8000-000000000001",
        "title": "Kiểm soát gia nhiệt chính xác",
        "description": "Precise heating control",
        "icon": "check-circle",
        "sortOrder": 2
      },
      {
        "id": "20000000-0000-0000-0000-000000000033",
        "machineId": "d0000004-0000-4000-8000-000000000001",
        "title": "Hỗ trợ quy trình an toàn trong phòng thí nghiệm",
        "description": "Supports safer laboratory workflows",
        "icon": "check-circle",
        "sortOrder": 3
      }
    ],
    "specs": [
      {
        "id": "30000000-0000-0000-0000-000000000031",
        "machineId": "d0000004-0000-4000-8000-000000000001",
        "groupName": "Thông số chung",
        "specName": "Cốc thử",
        "specValue": "Pensky-Martens cốc kín",
        "unit": "",
        "sortOrder": 1
      },
      {
        "id": "30000000-0000-0000-0000-000000000032",
        "machineId": "d0000004-0000-4000-8000-000000000001",
        "groupName": "Thông số chung",
        "specName": "Đánh lửa",
        "specValue": "Tự động",
        "unit": "",
        "sortOrder": 2
      },
      {
        "id": "30000000-0000-0000-0000-000000000033",
        "machineId": "d0000004-0000-4000-8000-000000000001",
        "groupName": "Thông số chung",
        "specName": "Hiển thị",
        "specValue": "Màn hình điều khiển tích hợp",
        "unit": "",
        "sortOrder": 3
      }
    ]
  },
  {
    "id": "d0000005-0000-4000-8000-000000000001",
    "name": "Thiết bị chưng cất tự động ở áp suất chân không (Herzog HDV 632)",
    "slug": "hdv-632",
    "model": "HDV 632",
    "shortDescription": "Giải pháp chưng cất chân không cho các sản phẩm dầu mỏ có nhiệt độ sôi cao.",
    "description": "Giải pháp chưng cất chân không cho các sản phẩm dầu mỏ có nhiệt độ sôi cao. A vacuum distillation solution for high-boiling petroleum products.",
    "mainImageId": "a0000005-0000-4000-8000-000000000005",
    "status": "published",
    "sortOrder": 5,
    "publishedAt": "2026-01-01T00:00:00Z",
    "createdAt": "2026-01-01T00:00:00Z",
    "updatedAt": "2026-09-14T10:00:00Z",
    "applications": [
      {
        "id": "10000000-0000-0000-0000-000000000041",
        "machineId": "d0000005-0000-4000-8000-000000000001",
        "title": "Dầu nặng",
        "description": "Heavy oils",
        "sortOrder": 1
      },
      {
        "id": "10000000-0000-0000-0000-000000000042",
        "machineId": "d0000005-0000-4000-8000-000000000001",
        "title": "Dầu nhờn",
        "description": "Lubricating oils",
        "sortOrder": 2
      },
      {
        "id": "10000000-0000-0000-0000-000000000043",
        "machineId": "d0000005-0000-4000-8000-000000000001",
        "title": "Phân đoạn chân không",
        "description": "Vacuum fractions",
        "sortOrder": 3
      }
    ],
    "highlights": [
      {
        "id": "20000000-0000-0000-0000-000000000041",
        "machineId": "d0000005-0000-4000-8000-000000000001",
        "title": "Kiểm soát áp suất chân không",
        "description": "Vacuum pressure control",
        "icon": "check-circle",
        "sortOrder": 1
      },
      {
        "id": "20000000-0000-0000-0000-000000000042",
        "machineId": "d0000005-0000-4000-8000-000000000001",
        "title": "Tự động ghi nhận nhiệt độ và thể tích",
        "description": "Automatically records temperature and volume",
        "icon": "check-circle",
        "sortOrder": 2
      },
      {
        "id": "20000000-0000-0000-0000-000000000043",
        "machineId": "d0000005-0000-4000-8000-000000000001",
        "title": "Thiết kế phù hợp phòng thí nghiệm công nghiệp",
        "description": "Designed for industrial laboratories",
        "icon": "check-circle",
        "sortOrder": 3
      }
    ],
    "specs": [
      {
        "id": "30000000-0000-0000-0000-000000000041",
        "machineId": "d0000005-0000-4000-8000-000000000001",
        "groupName": "Thông số chung",
        "specName": "Phương pháp",
        "specValue": "Chưng cất chân không",
        "unit": "",
        "sortOrder": 1
      },
      {
        "id": "30000000-0000-0000-0000-000000000042",
        "machineId": "d0000005-0000-4000-8000-000000000001",
        "groupName": "Thông số chung",
        "specName": "Điều khiển áp suất",
        "specValue": "Tự động",
        "unit": "",
        "sortOrder": 2
      },
      {
        "id": "30000000-0000-0000-0000-000000000043",
        "machineId": "d0000005-0000-4000-8000-000000000001",
        "groupName": "Thông số chung",
        "specName": "Dữ liệu",
        "specValue": "Ghi nhận và xuất báo cáo",
        "unit": "",
        "sortOrder": 3
      }
    ]
  },
  {
    "id": "d0000006-0000-4000-8000-000000000001",
    "name": "Thiết bị đo áp suất hơi bão hòa tự động (Herzog HVP 972)",
    "slug": "hvp-972",
    "model": "HVP 972",
    "shortDescription": "Phân tích áp suất hơi của xăng và sản phẩm dầu mỏ trong quy trình kiểm soát chất lượng.",
    "description": "Phân tích áp suất hơi của xăng và sản phẩm dầu mỏ trong quy trình kiểm soát chất lượng. Measures the vapor pressure of gasoline and petroleum products for quality control.",
    "mainImageId": "a0000006-0000-4000-8000-000000000006",
    "status": "published",
    "sortOrder": 6,
    "publishedAt": "2026-01-01T00:00:00Z",
    "createdAt": "2026-01-01T00:00:00Z",
    "updatedAt": "2026-09-14T10:00:00Z",
    "applications": [
      {
        "id": "10000000-0000-0000-0000-000000000051",
        "machineId": "d0000006-0000-4000-8000-000000000001",
        "title": "Xăng",
        "description": "Gasoline",
        "sortOrder": 1
      },
      {
        "id": "10000000-0000-0000-0000-000000000052",
        "machineId": "d0000006-0000-4000-8000-000000000001",
        "title": "Nhiên liệu",
        "description": "Fuels",
        "sortOrder": 2
      },
      {
        "id": "10000000-0000-0000-0000-000000000053",
        "machineId": "d0000006-0000-4000-8000-000000000001",
        "title": "Dung môi nhẹ",
        "description": "Light solvents",
        "sortOrder": 3
      }
    ],
    "highlights": [
      {
        "id": "20000000-0000-0000-0000-000000000051",
        "machineId": "d0000006-0000-4000-8000-000000000001",
        "title": "Chuẩn bị mẫu đơn giản",
        "description": "Simple sample preparation",
        "icon": "check-circle",
        "sortOrder": 1
      },
      {
        "id": "20000000-0000-0000-0000-000000000052",
        "machineId": "d0000006-0000-4000-8000-000000000001",
        "title": "Điều khiển nhiệt độ tự động",
        "description": "Automatic temperature control",
        "icon": "check-circle",
        "sortOrder": 2
      },
      {
        "id": "20000000-0000-0000-0000-000000000053",
        "machineId": "d0000006-0000-4000-8000-000000000001",
        "title": "Kết quả nhanh và dễ theo dõi",
        "description": "Fast, easy-to-track results",
        "icon": "check-circle",
        "sortOrder": 3
      }
    ],
    "specs": [
      {
        "id": "30000000-0000-0000-0000-000000000051",
        "machineId": "d0000006-0000-4000-8000-000000000001",
        "groupName": "Thông số chung",
        "specName": "Đại lượng",
        "specValue": "Áp suất hơi",
        "unit": "",
        "sortOrder": 1
      },
      {
        "id": "30000000-0000-0000-0000-000000000052",
        "machineId": "d0000006-0000-4000-8000-000000000001",
        "groupName": "Thông số chung",
        "specName": "Mẫu thử",
        "specValue": "Xăng và sản phẩm nhẹ",
        "unit": "",
        "sortOrder": 2
      },
      {
        "id": "30000000-0000-0000-0000-000000000053",
        "machineId": "d0000006-0000-4000-8000-000000000001",
        "groupName": "Thông số chung",
        "specName": "Vận hành",
        "specValue": "Tự động",
        "unit": "",
        "sortOrder": 3
      }
    ]
  },
  {
    "id": "d0000007-0000-4000-8000-000000000001",
    "name": "Van điều khiển globe hiệu suất cao (Masoneilan 21000 Series)",
    "slug": "masoneilan-21000",
    "model": "21000 Series",
    "shortDescription": "Dòng van điều khiển đa dụng cho các ứng dụng chất lỏng, khí và hơi trong nhà máy công nghiệp.",
    "description": "Dòng van điều khiển đa dụng cho các ứng dụng chất lỏng, khí và hơi trong nhà máy công nghiệp. A general-purpose control valve series for liquid, gas and steam applications in industrial plants.",
    "mainImageId": "a0000007-0000-4000-8000-000000000007",
    "status": "published",
    "sortOrder": 7,
    "publishedAt": "2026-01-01T00:00:00Z",
    "createdAt": "2026-01-01T00:00:00Z",
    "updatedAt": "2026-09-14T10:00:00Z",
    "applications": [
      {
        "id": "10000000-0000-0000-0000-000000000061",
        "machineId": "d0000007-0000-4000-8000-000000000001",
        "title": "Hơi",
        "description": "Steam",
        "sortOrder": 1
      },
      {
        "id": "10000000-0000-0000-0000-000000000062",
        "machineId": "d0000007-0000-4000-8000-000000000001",
        "title": "Khí",
        "description": "Gas",
        "sortOrder": 2
      },
      {
        "id": "10000000-0000-0000-0000-000000000063",
        "machineId": "d0000007-0000-4000-8000-000000000001",
        "title": "Chất lỏng công nghệ",
        "description": "Process liquids",
        "sortOrder": 3
      }
    ],
    "highlights": [
      {
        "id": "20000000-0000-0000-0000-000000000061",
        "machineId": "d0000007-0000-4000-8000-000000000001",
        "title": "Cấu trúc thân van globe",
        "description": "Globe-style valve body",
        "icon": "check-circle",
        "sortOrder": 1
      },
      {
        "id": "20000000-0000-0000-0000-000000000062",
        "machineId": "d0000007-0000-4000-8000-000000000001",
        "title": "Nhiều lựa chọn trim và vật liệu",
        "description": "Multiple trim and material options",
        "icon": "check-circle",
        "sortOrder": 2
      },
      {
        "id": "20000000-0000-0000-0000-000000000063",
        "machineId": "d0000007-0000-4000-8000-000000000001",
        "title": "Phù hợp nhiều điều kiện công nghệ",
        "description": "Suitable for a wide range of process conditions",
        "icon": "check-circle",
        "sortOrder": 3
      }
    ],
    "specs": [
      {
        "id": "30000000-0000-0000-0000-000000000061",
        "machineId": "d0000007-0000-4000-8000-000000000001",
        "groupName": "Thông số chung",
        "specName": "Kiểu van",
        "specValue": "Van điều khiển globe",
        "unit": "",
        "sortOrder": 1
      },
      {
        "id": "30000000-0000-0000-0000-000000000062",
        "machineId": "d0000007-0000-4000-8000-000000000001",
        "groupName": "Thông số chung",
        "specName": "Thương hiệu",
        "specValue": "Masoneilan",
        "unit": "",
        "sortOrder": 2
      },
      {
        "id": "30000000-0000-0000-0000-000000000063",
        "machineId": "d0000007-0000-4000-8000-000000000001",
        "groupName": "Thông số chung",
        "specName": "Ứng dụng",
        "specValue": "Điều khiển lưu lượng và áp suất",
        "unit": "",
        "sortOrder": 3
      }
    ]
  },
  {
    "id": "d0000008-0000-4000-8000-000000000001",
    "name": "Bộ định vị van thông minh (Masoneilan SVI II AP)",
    "slug": "svi-ii-ap",
    "model": "SVI II AP",
    "shortDescription": "Bộ định vị kỹ thuật số hỗ trợ điều khiển chính xác và chẩn đoán tình trạng van.",
    "description": "Bộ định vị kỹ thuật số hỗ trợ điều khiển chính xác và chẩn đoán tình trạng van. A digital positioner that supports precise control and valve condition diagnostics.",
    "mainImageId": "a0000008-0000-4000-8000-000000000008",
    "status": "published",
    "sortOrder": 8,
    "publishedAt": "2026-01-01T00:00:00Z",
    "createdAt": "2026-01-01T00:00:00Z",
    "updatedAt": "2026-09-14T10:00:00Z",
    "applications": [
      {
        "id": "10000000-0000-0000-0000-000000000071",
        "machineId": "d0000008-0000-4000-8000-000000000001",
        "title": "Van điều khiển",
        "description": "Control valves",
        "sortOrder": 1
      },
      {
        "id": "10000000-0000-0000-0000-000000000072",
        "machineId": "d0000008-0000-4000-8000-000000000001",
        "title": "Chẩn đoán van",
        "description": "Valve diagnostics",
        "sortOrder": 2
      },
      {
        "id": "10000000-0000-0000-0000-000000000073",
        "machineId": "d0000008-0000-4000-8000-000000000001",
        "title": "Điều khiển quá trình",
        "description": "Process control",
        "sortOrder": 3
      }
    ],
    "highlights": [
      {
        "id": "20000000-0000-0000-0000-000000000071",
        "machineId": "d0000008-0000-4000-8000-000000000001",
        "title": "Hiệu chỉnh và cài đặt số",
        "description": "Digital calibration and configuration",
        "icon": "check-circle",
        "sortOrder": 1
      },
      {
        "id": "20000000-0000-0000-0000-000000000072",
        "machineId": "d0000008-0000-4000-8000-000000000001",
        "title": "Hỗ trợ chẩn đoán tình trạng van",
        "description": "Supports valve condition diagnostics",
        "icon": "check-circle",
        "sortOrder": 2
      },
      {
        "id": "20000000-0000-0000-0000-000000000073",
        "machineId": "d0000008-0000-4000-8000-000000000001",
        "title": "Tích hợp vào hệ thống điều khiển",
        "description": "Integrates with process control systems",
        "icon": "check-circle",
        "sortOrder": 3
      }
    ],
    "specs": [
      {
        "id": "30000000-0000-0000-0000-000000000071",
        "machineId": "d0000008-0000-4000-8000-000000000001",
        "groupName": "Thông số chung",
        "specName": "Thiết bị",
        "specValue": "Bộ định vị van kỹ thuật số",
        "unit": "",
        "sortOrder": 1
      },
      {
        "id": "30000000-0000-0000-0000-000000000072",
        "machineId": "d0000008-0000-4000-8000-000000000001",
        "groupName": "Thông số chung",
        "specName": "Giao tiếp",
        "specValue": "HART",
        "unit": "",
        "sortOrder": 2
      },
      {
        "id": "30000000-0000-0000-0000-000000000073",
        "machineId": "d0000008-0000-4000-8000-000000000001",
        "groupName": "Thông số chung",
        "specName": "Lắp đặt",
        "specValue": "Trên bộ truyền động van",
        "unit": "",
        "sortOrder": 3
      }
    ]
  },
  {
    "id": "d0000009-0000-4000-8000-000000000001",
    "name": "Bộ truyền động màng lò xo khí nén (Masoneilan 87/88 Series)",
    "slug": "actuator-87-88",
    "model": "87/88 Series",
    "shortDescription": "Bộ truyền động tuyến tính cho van điều khiển Masoneilan với cấu hình tác động thuận hoặc nghịch.",
    "description": "Bộ truyền động tuyến tính cho van điều khiển Masoneilan với cấu hình tác động thuận hoặc nghịch. A linear actuator for Masoneilan control valves, available in direct- or reverse-acting configurations.",
    "mainImageId": "a0000009-0000-4000-8000-000000000009",
    "status": "published",
    "sortOrder": 9,
    "publishedAt": "2026-01-01T00:00:00Z",
    "createdAt": "2026-01-01T00:00:00Z",
    "updatedAt": "2026-09-14T10:00:00Z",
    "applications": [
      {
        "id": "10000000-0000-0000-0000-000000000081",
        "machineId": "d0000009-0000-4000-8000-000000000001",
        "title": "Van điều khiển tuyến tính",
        "description": "Linear control valves",
        "sortOrder": 1
      },
      {
        "id": "10000000-0000-0000-0000-000000000082",
        "machineId": "d0000009-0000-4000-8000-000000000001",
        "title": "Hệ thống khí nén",
        "description": "Pneumatic systems",
        "sortOrder": 2
      }
    ],
    "highlights": [
      {
        "id": "20000000-0000-0000-0000-000000000081",
        "machineId": "d0000009-0000-4000-8000-000000000001",
        "title": "Cấu trúc màng lò xo",
        "description": "Spring-diaphragm construction",
        "icon": "check-circle",
        "sortOrder": 1
      },
      {
        "id": "20000000-0000-0000-0000-000000000082",
        "machineId": "d0000009-0000-4000-8000-000000000001",
        "title": "Dễ bảo trì và hiệu chỉnh",
        "description": "Easy to maintain and calibrate",
        "icon": "check-circle",
        "sortOrder": 2
      },
      {
        "id": "20000000-0000-0000-0000-000000000083",
        "machineId": "d0000009-0000-4000-8000-000000000001",
        "title": "Tương thích nhiều dòng van Masoneilan",
        "description": "Compatible with multiple Masoneilan valve series",
        "icon": "check-circle",
        "sortOrder": 3
      }
    ],
    "specs": [
      {
        "id": "30000000-0000-0000-0000-000000000081",
        "machineId": "d0000009-0000-4000-8000-000000000001",
        "groupName": "Thông số chung",
        "specName": "Kiểu",
        "specValue": "Bộ truyền động màng lò xo",
        "unit": "",
        "sortOrder": 1
      },
      {
        "id": "30000000-0000-0000-0000-000000000082",
        "machineId": "d0000009-0000-4000-8000-000000000001",
        "groupName": "Thông số chung",
        "specName": "Nguồn điều khiển",
        "specValue": "Khí nén",
        "unit": "",
        "sortOrder": 2
      },
      {
        "id": "30000000-0000-0000-0000-000000000083",
        "machineId": "d0000009-0000-4000-8000-000000000001",
        "groupName": "Thông số chung",
        "specName": "Chuyển động",
        "specValue": "Tuyến tính",
        "unit": "",
        "sortOrder": 3
      }
    ]
  },
  {
    "id": "d000000a-0000-4000-8000-000000000001",
    "name": "Van điều khiển cho ứng dụng hơi (Masoneilan 84000 Series)",
    "slug": "masoneilan-84000",
    "model": "84000 Series",
    "shortDescription": "Van điều khiển được thiết kế cho các điều kiện hơi và chênh áp cao trong nhà máy công nghiệp.",
    "description": "Van điều khiển được thiết kế cho các điều kiện hơi và chênh áp cao trong nhà máy công nghiệp. A control valve designed for steam service and high differential-pressure conditions in industrial plants.",
    "mainImageId": "a0000010-0000-4000-8000-000000000010",
    "status": "published",
    "sortOrder": 10,
    "publishedAt": "2026-01-01T00:00:00Z",
    "createdAt": "2026-01-01T00:00:00Z",
    "updatedAt": "2026-09-14T10:00:00Z",
    "applications": [
      {
        "id": "10000000-0000-0000-0000-000000000091",
        "machineId": "d000000a-0000-4000-8000-000000000001",
        "title": "Hơi",
        "description": "Steam",
        "sortOrder": 1
      },
      {
        "id": "10000000-0000-0000-0000-000000000092",
        "machineId": "d000000a-0000-4000-8000-000000000001",
        "title": "Năng lượng",
        "description": "Power generation",
        "sortOrder": 2
      },
      {
        "id": "10000000-0000-0000-0000-000000000093",
        "machineId": "d000000a-0000-4000-8000-000000000001",
        "title": "Quá trình công nghiệp",
        "description": "Industrial processes",
        "sortOrder": 3
      }
    ],
    "highlights": [
      {
        "id": "20000000-0000-0000-0000-000000000091",
        "machineId": "d000000a-0000-4000-8000-000000000001",
        "title": "Thiết kế cho điều kiện hơi",
        "description": "Designed for steam service",
        "icon": "check-circle",
        "sortOrder": 1
      },
      {
        "id": "20000000-0000-0000-0000-000000000092",
        "machineId": "d000000a-0000-4000-8000-000000000001",
        "title": "Kiểm soát dòng chảy ổn định",
        "description": "Stable flow control",
        "icon": "check-circle",
        "sortOrder": 2
      },
      {
        "id": "20000000-0000-0000-0000-000000000093",
        "machineId": "d000000a-0000-4000-8000-000000000001",
        "title": "Nhiều lựa chọn cấu hình",
        "description": "Multiple configuration options",
        "icon": "check-circle",
        "sortOrder": 3
      }
    ],
    "specs": [
      {
        "id": "30000000-0000-0000-0000-000000000091",
        "machineId": "d000000a-0000-4000-8000-000000000001",
        "groupName": "Thông số chung",
        "specName": "Kiểu van",
        "specValue": "Van điều khiển hơi",
        "unit": "",
        "sortOrder": 1
      },
      {
        "id": "30000000-0000-0000-0000-000000000092",
        "machineId": "d000000a-0000-4000-8000-000000000001",
        "groupName": "Thông số chung",
        "specName": "Thương hiệu",
        "specValue": "Masoneilan",
        "unit": "",
        "sortOrder": 2
      },
      {
        "id": "30000000-0000-0000-0000-000000000093",
        "machineId": "d000000a-0000-4000-8000-000000000001",
        "groupName": "Thông số chung",
        "specName": "Dịch vụ",
        "specValue": "Hơi và môi chất nhiệt độ cao",
        "unit": "",
        "sortOrder": 3
      }
    ]
  },
  {
    "id": "d000000b-0000-4000-8000-000000000001",
    "name": "Van an toàn cho hệ thống CCGT (Consolidated 2700 Series)",
    "slug": "consolidated-2700",
    "model": "2700 Series",
    "shortDescription": "Dòng van an toàn được thiết kế cho các hệ thống phát điện tuabin khí chu trình hỗn hợp và dịch vụ hơi.",
    "description": "Dòng van an toàn được thiết kế cho các hệ thống phát điện tuabin khí chu trình hỗn hợp và dịch vụ hơi. A safety valve series designed for combined-cycle gas turbine power systems and steam service.",
    "mainImageId": "a0000011-0000-4000-8000-000000000011",
    "status": "published",
    "sortOrder": 11,
    "publishedAt": "2026-01-01T00:00:00Z",
    "createdAt": "2026-01-01T00:00:00Z",
    "updatedAt": "2026-09-14T10:00:00Z",
    "applications": [
      {
        "id": "10000000-0000-0000-0000-000000000101",
        "machineId": "d000000b-0000-4000-8000-000000000001",
        "title": "Hơi",
        "description": "Steam",
        "sortOrder": 1
      },
      {
        "id": "10000000-0000-0000-0000-000000000102",
        "machineId": "d000000b-0000-4000-8000-000000000001",
        "title": "Phát điện",
        "description": "Power generation",
        "sortOrder": 2
      },
      {
        "id": "10000000-0000-0000-0000-000000000103",
        "machineId": "d000000b-0000-4000-8000-000000000001",
        "title": "Hệ thống CCGT",
        "description": "CCGT systems",
        "sortOrder": 3
      }
    ],
    "highlights": [
      {
        "id": "20000000-0000-0000-0000-000000000101",
        "machineId": "d000000b-0000-4000-8000-000000000001",
        "title": "Thiết kế bảo vệ quá áp",
        "description": "Designed for overpressure protection",
        "icon": "check-circle",
        "sortOrder": 1
      },
      {
        "id": "20000000-0000-0000-0000-000000000102",
        "machineId": "d000000b-0000-4000-8000-000000000001",
        "title": "Thiết kế hướng đến ứng dụng CCGT",
        "description": "Designed for CCGT applications",
        "icon": "check-circle",
        "sortOrder": 2
      },
      {
        "id": "20000000-0000-0000-0000-000000000103",
        "machineId": "d000000b-0000-4000-8000-000000000001",
        "title": "Cấu trúc lò xo cho dịch vụ hơi",
        "description": "Spring-loaded construction for steam service",
        "icon": "check-circle",
        "sortOrder": 3
      }
    ],
    "specs": [
      {
        "id": "30000000-0000-0000-0000-000000000101",
        "machineId": "d000000b-0000-4000-8000-000000000001",
        "groupName": "Thông số chung",
        "specName": "Kiểu van",
        "specValue": "Van an toàn lò xo",
        "unit": "",
        "sortOrder": 1
      },
      {
        "id": "30000000-0000-0000-0000-000000000102",
        "machineId": "d000000b-0000-4000-8000-000000000001",
        "groupName": "Thông số chung",
        "specName": "Thương hiệu",
        "specValue": "Consolidated",
        "unit": "",
        "sortOrder": 2
      },
      {
        "id": "30000000-0000-0000-0000-000000000103",
        "machineId": "d000000b-0000-4000-8000-000000000001",
        "groupName": "Thông số chung",
        "specName": "Ứng dụng chính",
        "specValue": "Phát điện tuabin khí chu trình hỗn hợp",
        "unit": "",
        "sortOrder": 3
      }
    ]
  },
  {
    "id": "d000000c-0000-4000-8000-000000000001",
    "name": "Van an toàn và xả áp (Consolidated 1900/P Series)",
    "slug": "consolidated-1900",
    "model": "1900/P Series",
    "shortDescription": "Dòng van an toàn và xả áp cho ứng dụng hơi, nước bốc hơi và hơi hữu cơ theo ASME Section I.",
    "description": "Dòng van an toàn và xả áp cho ứng dụng hơi, nước bốc hơi và hơi hữu cơ theo ASME Section I. A safety relief valve series for steam, flashing water and organic vapor service under ASME Section I.",
    "mainImageId": "a0000012-0000-4000-8000-000000000012",
    "status": "published",
    "sortOrder": 12,
    "publishedAt": "2026-01-01T00:00:00Z",
    "createdAt": "2026-01-01T00:00:00Z",
    "updatedAt": "2026-09-14T10:00:00Z",
    "applications": [
      {
        "id": "10000000-0000-0000-0000-000000000111",
        "machineId": "d000000c-0000-4000-8000-000000000001",
        "title": "Hơi",
        "description": "Steam",
        "sortOrder": 1
      },
      {
        "id": "10000000-0000-0000-0000-000000000112",
        "machineId": "d000000c-0000-4000-8000-000000000001",
        "title": "Nước bốc hơi",
        "description": "Flashing water",
        "sortOrder": 2
      },
      {
        "id": "10000000-0000-0000-0000-000000000113",
        "machineId": "d000000c-0000-4000-8000-000000000001",
        "title": "Hơi hữu cơ",
        "description": "Organic vapor service",
        "sortOrder": 3
      }
    ],
    "highlights": [
      {
        "id": "20000000-0000-0000-0000-000000000111",
        "machineId": "d000000c-0000-4000-8000-000000000001",
        "title": "Đế Thermodisc hỗ trợ độ kín trong dịch vụ hơi",
        "description": "Thermodisc seat supports tightness in steam service",
        "icon": "check-circle",
        "sortOrder": 1
      },
      {
        "id": "20000000-0000-0000-0000-000000000112",
        "machineId": "d000000c-0000-4000-8000-000000000001",
        "title": "Có cấu hình thông thường và balanced bellows",
        "description": "Available in conventional and balanced-bellows configurations",
        "icon": "check-circle",
        "sortOrder": 2
      },
      {
        "id": "20000000-0000-0000-0000-000000000113",
        "machineId": "d000000c-0000-4000-8000-000000000001",
        "title": "Có cấu hình lò xo lộ thiên để làm mát",
        "description": "Available with an exposed-spring configuration for cooling",
        "icon": "check-circle",
        "sortOrder": 3
      }
    ],
    "specs": [
      {
        "id": "30000000-0000-0000-0000-000000000111",
        "machineId": "d000000c-0000-4000-8000-000000000001",
        "groupName": "Thông số chung",
        "specName": "Kiểu van",
        "specValue": "Van an toàn và xả áp",
        "unit": "",
        "sortOrder": 1
      },
      {
        "id": "30000000-0000-0000-0000-000000000112",
        "machineId": "d000000c-0000-4000-8000-000000000001",
        "groupName": "Thông số chung",
        "specName": "Thương hiệu",
        "specValue": "Consolidated",
        "unit": "",
        "sortOrder": 2
      },
      {
        "id": "30000000-0000-0000-0000-000000000113",
        "machineId": "d000000c-0000-4000-8000-000000000001",
        "groupName": "Thông số chung",
        "specName": "Lưu chất",
        "specValue": "Hơi, nước bốc hơi và hơi hữu cơ",
        "unit": "",
        "sortOrder": 3
      }
    ]
  },
  {
    "id": "d000000d-0000-4000-8000-000000000001",
    "name": "Thiết bị kiểm tra van điện tử (Consolidated EVT-Pro)",
    "slug": "evt-pro",
    "model": "EVT-Pro",
    "shortDescription": "Thiết bị hỗ trợ kiểm tra áp suất cài đặt của van an toàn trong điều kiện lắp đặt thực tế.",
    "description": "Thiết bị hỗ trợ kiểm tra áp suất cài đặt của van an toàn trong điều kiện lắp đặt thực tế. A device for checking safety valve set pressure under actual installed conditions.",
    "mainImageId": "a0000013-0000-4000-8000-000000000013",
    "status": "published",
    "sortOrder": 13,
    "publishedAt": "2026-01-01T00:00:00Z",
    "createdAt": "2026-01-01T00:00:00Z",
    "updatedAt": "2026-09-14T10:00:00Z",
    "applications": [
      {
        "id": "10000000-0000-0000-0000-000000000121",
        "machineId": "d000000d-0000-4000-8000-000000000001",
        "title": "Kiểm định van",
        "description": "Valve testing",
        "sortOrder": 1
      },
      {
        "id": "10000000-0000-0000-0000-000000000122",
        "machineId": "d000000d-0000-4000-8000-000000000001",
        "title": "Bảo trì nhà máy",
        "description": "Plant maintenance",
        "sortOrder": 2
      },
      {
        "id": "10000000-0000-0000-0000-000000000123",
        "machineId": "d000000d-0000-4000-8000-000000000001",
        "title": "Van an toàn",
        "description": "Safety valves",
        "sortOrder": 3
      }
    ],
    "highlights": [
      {
        "id": "20000000-0000-0000-0000-000000000121",
        "machineId": "d000000d-0000-4000-8000-000000000001",
        "title": "Kiểm tra tại vị trí lắp đặt",
        "description": "Testing at the installed location",
        "icon": "check-circle",
        "sortOrder": 1
      },
      {
        "id": "20000000-0000-0000-0000-000000000122",
        "machineId": "d000000d-0000-4000-8000-000000000001",
        "title": "Giảm thời gian tháo lắp van",
        "description": "Reduces valve removal and reinstallation time",
        "icon": "check-circle",
        "sortOrder": 2
      },
      {
        "id": "20000000-0000-0000-0000-000000000123",
        "machineId": "d000000d-0000-4000-8000-000000000001",
        "title": "Hỗ trợ lưu và đánh giá kết quả",
        "description": "Supports result storage and evaluation",
        "icon": "check-circle",
        "sortOrder": 3
      }
    ],
    "specs": [
      {
        "id": "30000000-0000-0000-0000-000000000121",
        "machineId": "d000000d-0000-4000-8000-000000000001",
        "groupName": "Thông số chung",
        "specName": "Thiết bị",
        "specValue": "Thiết bị kiểm tra van điện tử",
        "unit": "",
        "sortOrder": 1
      },
      {
        "id": "30000000-0000-0000-0000-000000000122",
        "machineId": "d000000d-0000-4000-8000-000000000001",
        "groupName": "Thông số chung",
        "specName": "Ứng dụng",
        "specValue": "Kiểm tra van an toàn tại chỗ",
        "unit": "",
        "sortOrder": 2
      },
      {
        "id": "30000000-0000-0000-0000-000000000123",
        "machineId": "d000000d-0000-4000-8000-000000000001",
        "groupName": "Thông số chung",
        "specName": "Dữ liệu",
        "specValue": "Ghi nhận kết quả điện tử",
        "unit": "",
        "sortOrder": 3
      }
    ]
  }
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

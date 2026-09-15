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

// Initial Seed Data with valid UUID v4 compliant hex strings
const INITIAL_USERS: User[] = [
  {
    id: '11111111-1111-1111-1111-111111111111',
    email: 'admin@ltvietnam.com.vn',
    fullName: 'Quản Trị Viên Hệ Thống',
    role: 'admin',
    status: 'active',
    lastLoginAt: '2026-09-14T22:30:00Z',
    createdAt: '2026-01-10T08:00:00Z',
    updatedAt: '2026-09-14T22:30:00Z',
  },
  {
    id: '22222222-2222-2222-2222-222222222222',
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
    id: 'c1111111-1111-1111-1111-111111111111',
    fileName: 'ac-nga-gpa-2286.jpg',
    storageKey: 'machines/ac-nga-gpa-2286.jpg',
    publicUrl: 'https://images.unsplash.com/photo-1581092335397-9583fe92d232?w=800&auto=format&fit=crop&q=80',
    altText: 'PAC AC NGA GPA 2286 Extended Gas Chromatograph',
    mimeType: 'image/jpeg',
    sizeBytes: 142850,
    width: 1200,
    height: 800,
    createdAt: '2026-03-01T10:00:00Z',
  },
  {
    id: 'c2222222-2222-2222-2222-222222222222',
    fileName: 'sense-sulfur-analyzer.jpg',
    storageKey: 'machines/sense-sulfur-analyzer.jpg',
    publicUrl: 'https://images.unsplash.com/photo-1582719478250-c89cae4dc85b?w=800&auto=format&fit=crop&q=80',
    altText: 'PAC SeNSe Sulfur Chemiluminescence Detector',
    mimeType: 'image/jpeg',
    sizeBytes: 198420,
    width: 1200,
    height: 800,
    createdAt: '2026-03-05T11:20:00Z',
  },
  {
    id: 'c3333333-3333-3333-3333-333333333333',
    fileName: 'optidist-distillation.jpg',
    storageKey: 'machines/optidist-distillation.jpg',
    publicUrl: 'https://images.unsplash.com/photo-1579154204601-01588f351e67?w=800&auto=format&fit=crop&q=80',
    altText: 'OptiDist Automated Distillation Analyzer',
    mimeType: 'image/jpeg',
    sizeBytes: 256100,
    width: 1400,
    height: 900,
    createdAt: '2026-03-10T14:45:00Z',
  },
];

const INITIAL_STANDARDS: Standard[] = [
  {
    id: 'a1111111-1111-1111-1111-111111111111',
    code: 'ASTM D3588',
    organization: 'ASTM',
    year: 2020,
    title: 'Standard Practice for Calculating Heat Value, Compressibility Factor, and Relative Density of Gaseous Fuels',
    description: 'Phương pháp tính toán nhiệt trị, hệ số nén và tỷ trọng tương đối của nhiên liệu khí.',
    createdAt: '2026-01-01T00:00:00Z',
  },
  {
    id: 'a2222222-2222-2222-2222-222222222222',
    code: 'ISO 6976:2016',
    organization: 'ISO',
    year: 2016,
    title: 'Natural gas — Calculation of calorific values, density, relative density and Wobbe indices from composition',
    description: 'Tiêu chuẩn quốc tế tính toán nhiệt trị, tỷ trọng và chỉ số Wobbe từ thành phần khí thiên nhiên.',
    createdAt: '2026-01-01T00:00:00Z',
  },
  {
    id: 'a3333333-3333-3333-3333-333333333333',
    code: 'ASTM D5504-12',
    organization: 'ASTM',
    year: 2012,
    title: 'Standard Test Method for Determination of Sulfur Compounds in Natural Gas by Gas Chromatography and Chemiluminescence',
    description: 'Xác định các hợp chất lưu huỳnh trong khí thiên nhiên bằng sắc ký khí và phát quang hóa học.',
    createdAt: '2026-01-01T00:00:00Z',
  },
  {
    id: 'a4444444-4444-4444-4444-444444444444',
    code: 'GPA 2286',
    organization: 'GPA',
    year: 2014,
    title: 'Method for the Extended Analysis of Natural Gas and Similar Gaseous Mixtures by Temperature Program Gas Chromatography',
    description: 'Phương pháp phân tích mở rộng thành phần khí thiên nhiên đến C14+ bằng sắc ký khí chương trình nhiệt.',
    createdAt: '2026-01-01T00:00:00Z',
  },
];

const INITIAL_MACHINES: Machine[] = [
  {
    id: 'b1111111-1111-1111-1111-111111111111',
    name: 'AC NGA GPA 2286 Extended Gas Analyzer',
    slug: 'ac-nga-gpa-2286-extended',
    model: 'AC NGA Extended C14+',
    shortDescription: 'Giải pháp sắc ký khí chuyên sâu phân tích thành phần khí thiên nhiên, LNG, CNG và tính toán nhiệt trị chính xác.',
    description: 'Hệ thống sắc ký khí chuyên dụng của PAC AC Analytical Controls được thiết kế cấu hình tối ưu để phân tích khí thiên nhiên mở rộng đến hợp chất C14+. Phù hợp cho các nhà máy lọc dầu, trạm xử lý khí, và kho cảng LNG.',
    mainImageId: 'c1111111-1111-1111-1111-111111111111',
    status: 'published',
    sortOrder: 1,
    publishedAt: '2026-03-01T12:00:00Z',
    createdAt: '2026-03-01T10:00:00Z',
    updatedAt: '2026-09-14T10:00:00Z',
    applications: [
      { id: '10000000-0000-0000-0000-000000000001', machineId: 'b1111111-1111-1111-1111-111111111111', title: 'Natural Gas Analysis', description: 'Phân tích khí thiên nhiên thương mại', sortOrder: 1 },
      { id: '10000000-0000-0000-0000-000000000002', machineId: 'b1111111-1111-1111-1111-111111111111', title: 'LNG Analysis', description: 'Phân tích thành phần khí hóa lỏng LNG tại cảng nhập/xuất', sortOrder: 2 },
      { id: '10000000-0000-0000-0000-000000000003', machineId: 'b1111111-1111-1111-1111-111111111111', title: 'Heating Value Calculation', description: 'Tự động tính toán nhiệt trị và chỉ số Wobbe', sortOrder: 3 },
    ],
    highlights: [
      { id: '20000000-0000-0000-0000-000000000001', machineId: 'b1111111-1111-1111-1111-111111111111', title: 'Analysis up to C14+', description: 'Mở rộng dải đo lên đến hydrocarbon nặng C14+', icon: 'Zap', sortOrder: 1 },
      { id: '20000000-0000-0000-0000-000000000002', machineId: 'b1111111-1111-1111-1111-111111111111', title: 'Analysis time ≤30 min', description: 'Thời gian phân tích siêu tốc dưới 30 phút', icon: 'Clock', sortOrder: 2 },
      { id: '20000000-0000-0000-0000-000000000003', machineId: 'b1111111-1111-1111-1111-111111111111', title: 'High Repeatability', description: 'Độ lặp lại cao vượt tiêu chuẩn GPA và ASTM', icon: 'CheckCircle', sortOrder: 3 },
    ],
    specs: [
      { id: '30000000-0000-0000-0000-000000000001', machineId: 'b1111111-1111-1111-1111-111111111111', groupName: 'Performance', specName: 'Analysis time', specValue: '≤ 30 min', unit: '', sortOrder: 1 },
      { id: '30000000-0000-0000-0000-000000000002', machineId: 'b1111111-1111-1111-1111-111111111111', groupName: 'Performance', specName: 'Hydrocarbon Range', specValue: 'C1–C14+', unit: '', sortOrder: 2 },
      { id: '30000000-0000-0000-0000-000000000003', machineId: 'b1111111-1111-1111-1111-111111111111', groupName: 'Sample', specName: 'Sample type', specValue: 'Natural Gas, LNG, CNG', unit: '', sortOrder: 3 },
      { id: '30000000-0000-0000-0000-000000000004', machineId: 'b1111111-1111-1111-1111-111111111111', groupName: 'Sample', specName: 'Max sample pressure', specValue: '375 psi / 25.8 bar', unit: 'psi', sortOrder: 4 },
      { id: '30000000-0000-0000-0000-000000000005', machineId: 'b1111111-1111-1111-1111-111111111111', groupName: 'Environment', specName: 'Operating temperature', specValue: '15–35 °C', unit: '°C', sortOrder: 5 },
      { id: '30000000-0000-0000-0000-000000000006', machineId: 'b1111111-1111-1111-1111-111111111111', groupName: 'Electrical', specName: 'Power supply', specValue: '90–240 VAC ±10%', unit: 'VAC', sortOrder: 6 },
    ],
  },
  {
    id: 'b2222222-2222-2222-2222-222222222222',
    name: 'SeNSe² Sulfur Chemiluminescence Detector',
    slug: 'sense-sulfur-chemiluminescence',
    model: 'SeNSe II',
    shortDescription: 'Đầu dò lưu huỳnh phát quang hóa học độ nhạy cực cao cho các dòng mẫu hydrocarbon tinh khiết.',
    description: 'PAC SeNSe² đem lại khả năng phát hiện vết lưu huỳnh ở mức ppb với độ chọn lọc và ổn định cao nhất trên thị trường hiện nay.',
    mainImageId: 'c2222222-2222-2222-2222-222222222222',
    status: 'published',
    sortOrder: 2,
    publishedAt: '2026-03-05T14:00:00Z',
    createdAt: '2026-03-05T11:20:00Z',
    updatedAt: '2026-09-14T10:00:00Z',
    applications: [
      { id: '10000000-0000-0000-0000-000000000004', machineId: 'b2222222-2222-2222-2222-222222222222', title: 'Trace Sulfur in Fuel', description: 'Phát hiện vết lưu huỳnh trong nhiên liệu sạch', sortOrder: 1 },
      { id: '10000000-0000-0000-0000-000000000005', machineId: 'b2222222-2222-2222-2222-222222222222', title: 'Petrochemical Catalysts', description: 'Bảo vệ chất xúc tác hóa dầu khỏi ngộ độc lưu huỳnh', sortOrder: 2 },
    ],
    highlights: [
      { id: '20000000-0000-0000-0000-000000000004', machineId: 'b2222222-2222-2222-2222-222222222222', title: 'ppb Detection Limit', description: 'Độ nhạy tuyệt hảo ở mức parts-per-billion', icon: 'Shield', sortOrder: 1 },
      { id: '20000000-0000-0000-0000-000000000005', machineId: 'b2222222-2222-2222-2222-222222222222', title: 'Zero Quenching', description: 'Loại bỏ hoàn toàn hiệu ứng dập tắt tín hiệu', icon: 'Sparkles', sortOrder: 2 },
    ],
    specs: [
      { id: '30000000-0000-0000-0000-000000000007', machineId: 'b2222222-2222-2222-2222-222222222222', groupName: 'Performance', specName: 'Detection Limit', specValue: '< 0.5 ppb', unit: 'ppb', sortOrder: 1 },
      { id: '30000000-0000-0000-0000-000000000008', machineId: 'b2222222-2222-2222-2222-222222222222', groupName: 'Performance', specName: 'Linear Dynamic Range', specValue: '> 10^4', unit: '', sortOrder: 2 },
    ],
  },
  {
    id: 'b3333333-3333-3333-3333-333333333333',
    name: 'OptiDist Automated Distillation Analyzer',
    slug: 'optidist-automated-distillation',
    model: 'OptiDist v4',
    shortDescription: 'Máy chưng cất tự động hoàn toàn theo tiêu chuẩn ASTM D86 cho các sản phẩm xăng dầu.',
    description: 'OptiDist là chuẩn mực vàng trong ngành kiểm nghiệm chưng cất khí quyển, vận hành chỉ với 1 nút bấm (One-Button Operation).',
    mainImageId: 'c3333333-3333-3333-3333-333333333333',
    status: 'draft',
    sortOrder: 3,
    publishedAt: null,
    createdAt: '2026-03-10T14:45:00Z',
    updatedAt: '2026-09-14T10:00:00Z',
    applications: [
      { id: '10000000-0000-0000-0000-000000000006', machineId: 'b3333333-3333-3333-3333-333333333333', title: 'Atmospheric Distillation', description: 'Chưng cất khí quyển xăng dầu thương phẩm', sortOrder: 1 },
    ],
    highlights: [
      { id: '20000000-0000-0000-0000-000000000006', machineId: 'b3333333-3333-3333-3333-333333333333', title: 'One-Button Start', description: 'Khởi động quy trình chuẩn hóa chỉ bằng một chạm', icon: 'Play', sortOrder: 1 },
    ],
    specs: [
      { id: '30000000-0000-0000-0000-000000000009', machineId: 'b3333333-3333-3333-3333-333333333333', groupName: 'Performance', specName: 'Temperature range', specValue: '0 to 450 °C', unit: '°C', sortOrder: 1 },
    ],
  },
];

const INITIAL_CONTACTS: Contact[] = [
  {
    id: 'e1111111-1111-1111-1111-111111111111',
    fullName: 'Nguyễn Văn Hùng',
    companyName: 'Công ty Cổ phần Lọc Hóa Dầu Bình Sơn (BSR)',
    email: 'hung.nv@bsr.com.vn',
    phone: '0912 345 678',
    subject: 'Yêu cầu báo giá máy phân tích SeNSe II Sulfur',
    message: 'Chúng tôi đang chuẩn bị dự án nâng cấp phòng thí nghiệm kiểm tra chất lượng sản phẩm xăng nhiên liệu, cần xin catalog và báo giá chi tiết cho dòng SeNSe II.',
    status: 'new',
    assignedTo: '11111111-1111-1111-1111-111111111111',
    adminNote: 'Khách hàng trọng điểm, kỹ sư sales cần liên hệ trực tiếp trong ngày.',
    createdAt: '2026-09-14T09:15:00Z',
    updatedAt: '2026-09-14T09:15:00Z',
  },
  {
    id: 'e2222222-2222-2222-2222-222222222222',
    fullName: 'Trần Thị Mai Phương',
    companyName: 'PV GAS Vũng Tàu',
    email: 'phuong.ttm@pvgas.com.vn',
    phone: '0988 765 432',
    subject: 'Hỏi về tiêu chuẩn GPA 2286 trên hệ máy AC NGA',
    message: 'Bên mình muốn tham khảo quy trình phân tích khí tự nhiên mở rộng và phần mềm tự động tính toán nhiệt trị trên hệ AC NGA.',
    status: 'processing',
    assignedTo: '11111111-1111-1111-1111-111111111111',
    adminNote: 'Đã gửi brochure sơ bộ, đang xếp lịch demo online.',
    createdAt: '2026-09-13T14:30:00Z',
    updatedAt: '2026-09-14T08:00:00Z',
  },
  {
    id: 'e3333333-3333-3333-3333-333333333333',
    fullName: 'Lê Minh Tuấn',
    companyName: 'SGS Vietnam Ltd',
    email: 'tuan.le@sgs.com',
    phone: '0903 112 233',
    subject: 'Bảo trì định kỳ máy OptiDist',
    message: 'Yêu cầu kỹ sư LTVN qua hỗ trợ hiệu chuẩn và kiểm tra cảm biến nhiệt độ cho 02 máy OptiDist tại chi nhánh Hải Phòng.',
    status: 'resolved',
    assignedTo: '22222222-2222-2222-2222-222222222222',
    adminNote: 'Kỹ sư Tuấn Anh đã hoàn tất nghiệm thu ngày 12/09.',
    resolvedAt: '2026-09-12T16:00:00Z',
    createdAt: '2026-09-10T10:00:00Z',
    updatedAt: '2026-09-12T16:00:00Z',
  },
];

const INITIAL_NEWS: NewsEvent[] = [
  {
    id: 'd1111111-1111-1111-1111-111111111111',
    type: 'event',
    title: 'Hội Thảo Công Nghệ Phân Tích Khí Thiên Nhiên & LNG 2026',
    slug: 'hoi-thao-cong-nghe-phan-tich-khi-lng-2026',
    shortDescription: 'LTVN kết hợp cùng chuyên gia PAC toàn cầu tổ chức hội thảo chuyên đề giải pháp phân tích chất lượng khí thiên nhiên.',
    thumbnailImageId: 'c1111111-1111-1111-1111-111111111111',
    status: 'published',
    publishedAt: '2026-09-01T08:00:00Z',
    eventStartAt: '2026-10-15T09:00:00Z',
    eventEndAt: '2026-10-15T17:00:00Z',
    location: 'Trung tâm Hội nghị White Palace, TP. Hồ Chí Minh',
    authorId: '11111111-1111-1111-1111-111111111111',
    content: {
      version: 1,
      blocks: [
        {
          type: 'heading',
          data: { level: 2, text: 'Nội dung chương trình hội thảo' },
        },
        {
          type: 'paragraph',
          data: { text: 'Giới thiệu các cải tiến đo lường dòng khí công nghiệp đạt chuẩn ASTM D3588 và GPA 2286 mới nhất.' },
        },
      ],
    },
    createdAt: '2026-09-01T08:00:00Z',
    updatedAt: '2026-09-01T08:00:00Z',
  },
  {
    id: 'd2222222-2222-2222-2222-222222222222',
    type: 'news',
    title: 'PAC Ra Mắt Bản Cập Nhật Firmware Thông Minh Cho Đầu Dò SeNSe II',
    slug: 'pac-ra-mat-firmware-thong-minh-sense-ii',
    shortDescription: 'Tăng cường độ ổn định đường nền và giảm thiểu sai số đo lường vết lưu huỳnh trong nhiên liệu sạch.',
    thumbnailImageId: 'c2222222-2222-2222-2222-222222222222',
    status: 'published',
    publishedAt: '2026-09-10T09:00:00Z',
    authorId: '22222222-2222-2222-2222-222222222222',
    content: {
      version: 1,
      blocks: [
        {
          type: 'heading',
          data: { level: 2, text: 'Những điểm mới trên bản cập nhật' },
        },
        {
          type: 'paragraph',
          data: { text: 'Tính năng tự động chuẩn đoán cảm biến quang điện tử và giảm 40% chi phí bảo trì buồng đốt.' },
        },
      ],
    },
    createdAt: '2026-09-10T09:00:00Z',
    updatedAt: '2026-09-10T09:00:00Z',
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

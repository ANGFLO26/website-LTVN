import type {
  Machine,
  Standard,
  MediaAsset,
  NewsEvent,
  Contact,
  User,
} from '../types';

// Initial Seed Data
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
    id: 'm1111111-1111-1111-1111-111111111111',
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
    id: 'm2222222-2222-2222-2222-222222222222',
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
    id: 'm3333333-3333-3333-3333-333333333333',
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
    id: 's1111111-1111-1111-1111-111111111111',
    code: 'ASTM D3588',
    organization: 'ASTM',
    year: 2020,
    title: 'Standard Practice for Calculating Heat Value, Compressibility Factor, and Relative Density of Gaseous Fuels',
    description: 'Phương pháp tính toán nhiệt trị, hệ số nén và tỷ trọng tương đối của nhiên liệu khí.',
    createdAt: '2026-01-01T00:00:00Z',
  },
  {
    id: 's2222222-2222-2222-2222-222222222222',
    code: 'ISO 6976:2016',
    organization: 'ISO',
    year: 2016,
    title: 'Natural gas — Calculation of calorific values, density, relative density and Wobbe indices from composition',
    description: 'Tiêu chuẩn quốc tế tính toán nhiệt trị, tỷ trọng và chỉ số Wobbe từ thành phần khí thiên nhiên.',
    createdAt: '2026-01-01T00:00:00Z',
  },
  {
    id: 's3333333-3333-3333-3333-333333333333',
    code: 'ASTM D5504-12',
    organization: 'ASTM',
    year: 2012,
    title: 'Standard Test Method for Determination of Sulfur Compounds in Natural Gas by Gas Chromatography and Chemiluminescence',
    description: 'Xác định các hợp chất lưu huỳnh trong khí thiên nhiên bằng sắc ký khí và phát quang hóa học.',
    createdAt: '2026-01-01T00:00:00Z',
  },
  {
    id: 's4444444-4444-4444-4444-444444444444',
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
    id: 'mac11111-1111-1111-1111-111111111111',
    name: 'AC NGA GPA 2286 Extended Gas Analyzer',
    slug: 'ac-nga-gpa-2286-extended',
    model: 'AC NGA Extended C14+',
    shortDescription: 'Giải pháp sắc ký khí chuyên sâu phân tích thành phần khí thiên nhiên, LNG, CNG và tính toán nhiệt trị chính xác.',
    description: 'Hệ thống sắc ký khí chuyên dụng của PAC AC Analytical Controls được thiết kế cấu hình tối ưu để phân tích khí thiên nhiên mở rộng đến hợp chất C14+. Phù hợp cho các nhà máy lọc dầu, trạm xử lý khí, và kho cảng LNG.',
    mainImageId: 'm1111111-1111-1111-1111-111111111111',
    status: 'published',
    sortOrder: 1,
    publishedAt: '2026-03-01T12:00:00Z',
    createdAt: '2026-03-01T10:00:00Z',
    updatedAt: '2026-09-14T10:00:00Z',
    applications: [
      { id: 'app1', machineId: 'mac11111-1111-1111-1111-111111111111', title: 'Natural Gas Analysis', description: 'Phân tích khí thiên nhiên thương mại', sortOrder: 1 },
      { id: 'app2', machineId: 'mac11111-1111-1111-1111-111111111111', title: 'LNG Analysis', description: 'Phân tích thành phần khí hóa lỏng LNG tại cảng nhập/xuất', sortOrder: 2 },
      { id: 'app3', machineId: 'mac11111-1111-1111-1111-111111111111', title: 'Heating Value Calculation', description: 'Tự động tính toán nhiệt trị và chỉ số Wobbe', sortOrder: 3 },
    ],
    highlights: [
      { id: 'hl1', machineId: 'mac11111-1111-1111-1111-111111111111', title: 'Analysis up to C14+', description: 'Mở rộng dải đo lên đến hydrocarbon nặng C14+', icon: 'Zap', sortOrder: 1 },
      { id: 'hl2', machineId: 'mac11111-1111-1111-1111-111111111111', title: 'Analysis time ≤30 min', description: 'Thời gian phân tích siêu tốc dưới 30 phút', icon: 'Clock', sortOrder: 2 },
      { id: 'hl3', machineId: 'mac11111-1111-1111-1111-111111111111', title: 'High Repeatability', description: 'Độ lặp lại cao vượt tiêu chuẩn GPA và ASTM', icon: 'CheckCircle', sortOrder: 3 },
    ],
    specs: [
      { id: 'sp1', machineId: 'mac11111-1111-1111-1111-111111111111', groupName: 'Performance', specName: 'Analysis time', specValue: '≤ 30 min', unit: '', sortOrder: 1 },
      { id: 'sp2', machineId: 'mac11111-1111-1111-1111-111111111111', groupName: 'Performance', specName: 'Hydrocarbon Range', specValue: 'C1–C14+', unit: '', sortOrder: 2 },
      { id: 'sp3', machineId: 'mac11111-1111-1111-1111-111111111111', groupName: 'Sample', specName: 'Sample type', specValue: 'Natural Gas, LNG, CNG', unit: '', sortOrder: 3 },
      { id: 'sp4', machineId: 'mac11111-1111-1111-1111-111111111111', groupName: 'Sample', specName: 'Max sample pressure', specValue: '375 psi / 25.8 bar', unit: 'psi', sortOrder: 4 },
      { id: 'sp5', machineId: 'mac11111-1111-1111-1111-111111111111', groupName: 'Environment', specName: 'Operating temperature', specValue: '15–35 °C', unit: '°C', sortOrder: 5 },
      { id: 'sp6', machineId: 'mac11111-1111-1111-1111-111111111111', groupName: 'Electrical', specName: 'Power supply', specValue: '90–240 VAC ±10%', unit: 'VAC', sortOrder: 6 },
    ],
  },
  {
    id: 'mac22222-2222-2222-2222-222222222222',
    name: 'SeNSe² Sulfur Chemiluminescence Detector',
    slug: 'sense-sulfur-chemiluminescence',
    model: 'SeNSe II',
    shortDescription: 'Đầu dò lưu huỳnh phát quang hóa học độ nhạy cực cao cho các dòng mẫu hydrocarbon tinh khiết.',
    description: 'PAC SeNSe² đem lại khả năng phát hiện vết lưu huỳnh ở mức ppb với độ chọn lọc và ổn định cao nhất trên thị trường hiện nay.',
    mainImageId: 'm2222222-2222-2222-2222-222222222222',
    status: 'published',
    sortOrder: 2,
    publishedAt: '2026-03-05T14:00:00Z',
    createdAt: '2026-03-05T11:20:00Z',
    updatedAt: '2026-09-14T10:00:00Z',
    applications: [
      { id: 'app4', machineId: 'mac22222-2222-2222-2222-222222222222', title: 'Trace Sulfur in Fuel', description: 'Phát hiện vết lưu huỳnh trong nhiên liệu sạch', sortOrder: 1 },
      { id: 'app5', machineId: 'mac22222-2222-2222-2222-222222222222', title: 'Petrochemical Catalysts', description: 'Bảo vệ chất xúc tác hóa dầu khỏi ngộ độc lưu huỳnh', sortOrder: 2 },
    ],
    highlights: [
      { id: 'hl4', machineId: 'mac22222-2222-2222-2222-222222222222', title: 'ppb Detection Limit', description: 'Độ nhạy tuyệt hảo ở mức parts-per-billion', icon: 'Shield', sortOrder: 1 },
      { id: 'hl5', machineId: 'mac22222-2222-2222-2222-222222222222', title: 'Zero Quenching', description: 'Loại bỏ hoàn toàn hiệu ứng dập tắt tín hiệu', icon: 'Sparkles', sortOrder: 2 },
    ],
    specs: [
      { id: 'sp7', machineId: 'mac22222-2222-2222-2222-222222222222', groupName: 'Performance', specName: 'Detection Limit', specValue: '< 0.5 ppb', unit: 'ppb', sortOrder: 1 },
      { id: 'sp8', machineId: 'mac22222-2222-2222-2222-222222222222', groupName: 'Performance', specName: 'Linear Dynamic Range', specValue: '> 10^4', unit: '', sortOrder: 2 },
    ],
  },
  {
    id: 'mac33333-3333-3333-3333-333333333333',
    name: 'OptiDist Automated Distillation Analyzer',
    slug: 'optidist-automated-distillation',
    model: 'OptiDist v4',
    shortDescription: 'Máy chưng cất tự động hoàn toàn theo tiêu chuẩn ASTM D86 cho các sản phẩm xăng dầu.',
    description: 'OptiDist là chuẩn mực vàng trong ngành kiểm nghiệm chưng cất khí quyển, vận hành chỉ với 1 nút bấm (One-Button Operation).',
    mainImageId: 'm3333333-3333-3333-3333-333333333333',
    status: 'draft',
    sortOrder: 3,
    publishedAt: null,
    createdAt: '2026-03-10T14:45:00Z',
    updatedAt: '2026-09-14T10:00:00Z',
    applications: [
      { id: 'app6', machineId: 'mac33333-3333-3333-3333-333333333333', title: 'Atmospheric Distillation', description: 'Chưng cất khí quyển xăng dầu thương phẩm', sortOrder: 1 },
    ],
    highlights: [
      { id: 'hl6', machineId: 'mac33333-3333-3333-3333-333333333333', title: 'One-Button Start', description: 'Khởi động quy trình chuẩn hóa chỉ bằng một chạm', icon: 'Play', sortOrder: 1 },
    ],
    specs: [
      { id: 'sp9', machineId: 'mac33333-3333-3333-3333-333333333333', groupName: 'Performance', specName: 'Temperature range', specValue: '0 to 450 °C', unit: '°C', sortOrder: 1 },
    ],
  },
];

const INITIAL_CONTACTS: Contact[] = [
  {
    id: 'c1111111-1111-1111-1111-111111111111',
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
    id: 'c2222222-2222-2222-2222-222222222222',
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
    id: 'c3333333-3333-3333-3333-333333333333',
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
    id: 'n1111111-1111-1111-1111-111111111111',
    type: 'event',
    title: 'Hội Thảo Công Nghệ Phân Tích Khí Thiên Nhiên & LNG 2026',
    slug: 'hoi-thao-cong-nghe-phan-tich-khi-lng-2026',
    shortDescription: 'LTVN kết hợp cùng chuyên gia PAC toàn cầu tổ chức hội thảo chuyên đề giải pháp phân tích chất lượng khí thiên nhiên.',
    thumbnailImageId: 'm1111111-1111-1111-1111-111111111111',
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
    id: 'n2222222-2222-2222-2222-222222222222',
    type: 'news',
    title: 'PAC Ra Mắt Bản Cập Nhật Firmware Thông Minh Cho Đầu Dò SeNSe II',
    slug: 'pac-ra-mat-firmware-thong-minh-sense-ii',
    shortDescription: 'Tăng cường độ ổn định đường nền và giảm thiểu sai số đo lường vết lưu huỳnh trong nhiên liệu sạch.',
    thumbnailImageId: 'm2222222-2222-2222-2222-222222222222',
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

// Helper Storage Manager
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

// Data Store Service
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
  getMachines(): Machine[] {
    return getStored('machines', INITIAL_MACHINES);
  },
  saveMachine(machine: Machine): Machine {
    const list = this.getMachines();
    const index = list.findIndex((m) => m.id === machine.id);
    if (index >= 0) {
      list[index] = { ...machine, updatedAt: new Date().toISOString() };
    } else {
      list.unshift({ ...machine, id: crypto.randomUUID(), createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() });
    }
    setStored('machines', list);
    return machine;
  },
  deleteMachine(id: string): void {
    const list = this.getMachines().filter((m) => m.id !== id);
    setStored('machines', list);
  },

  // Standards
  getStandards(): Standard[] {
    return getStored('standards', INITIAL_STANDARDS);
  },
  saveStandard(standard: Standard): Standard {
    const list = this.getStandards();
    const index = list.findIndex((s) => s.id === standard.id);
    if (index >= 0) {
      list[index] = standard;
    } else {
      list.unshift({ ...standard, id: crypto.randomUUID(), createdAt: new Date().toISOString() });
    }
    setStored('standards', list);
    return standard;
  },
  deleteStandard(id: string): void {
    const list = this.getStandards().filter((s) => s.id !== id);
    setStored('standards', list);
  },

  // Media
  getMedia(): MediaAsset[] {
    return getStored('media', INITIAL_MEDIA);
  },
  saveMedia(asset: MediaAsset): MediaAsset {
    const list = this.getMedia();
    list.unshift(asset);
    setStored('media', list);
    return asset;
  },
  deleteMedia(id: string): void {
    const list = this.getMedia().filter((m) => m.id !== id);
    setStored('media', list);
  },

  // News Events
  getNewsEvents(): NewsEvent[] {
    return getStored('news_events', INITIAL_NEWS);
  },
  saveNewsEvent(item: NewsEvent): NewsEvent {
    const list = this.getNewsEvents();
    const index = list.findIndex((n) => n.id === item.id);
    if (index >= 0) {
      list[index] = { ...item, updatedAt: new Date().toISOString() };
    } else {
      list.unshift({ ...item, id: crypto.randomUUID(), createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() });
    }
    setStored('news_events', list);
    return item;
  },
  deleteNewsEvent(id: string): void {
    const list = this.getNewsEvents().filter((n) => n.id !== id);
    setStored('news_events', list);
  },

  // Contacts
  getContacts(): Contact[] {
    return getStored('contacts', INITIAL_CONTACTS);
  },
  updateContactStatus(id: string, status: Contact['status'], note?: string): void {
    const list = this.getContacts();
    const target = list.find((c) => c.id === id);
    if (target) {
      target.status = status;
      if (note !== undefined) target.adminNote = note;
      if (status === 'resolved') target.resolvedAt = new Date().toISOString();
      target.updatedAt = new Date().toISOString();
      setStored('contacts', list);
    }
  },
  deleteContact(id: string): void {
    const list = this.getContacts().filter((c) => c.id !== id);
    setStored('contacts', list);
  },

  // Users
  getUsers(): User[] {
    return getStored('users', INITIAL_USERS);
  },
  saveUser(user: User): User {
    const list = this.getUsers();
    const index = list.findIndex((u) => u.id === user.id);
    if (index >= 0) {
      list[index] = { ...user, updatedAt: new Date().toISOString() };
    } else {
      list.unshift({ ...user, id: crypto.randomUUID(), createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() });
    }
    setStored('users', list);
    return user;
  },
  deleteUser(id: string): void {
    const list = this.getUsers().filter((u) => u.id !== id);
    setStored('users', list);
  },
};

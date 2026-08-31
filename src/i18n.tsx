// oxlint-disable react/only-export-components -- Provider and its hook share one private context.
import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'

export type Language = 'vi' | 'en'

const uiCopy = {
  home: ['Trang chủ', 'Home'],
  about: ['Giới thiệu', 'About us'],
  news: ['Tin tức & sự kiện', 'News & events'],
  contact: ['Liên hệ', 'Contact'],
  viewProducts: ['Xem sản phẩm', 'View products'],
  contactAdvice: ['Liên hệ tư vấn', 'Request consultation'],
  viewAll: ['Xem tất cả', 'View all'],
  viewDetail: ['Xem chi tiết', 'View details'],
  featuredProducts: ['Sản phẩm nổi bật', 'Featured products'],
  latestUpdates: ['Cập nhật mới nhất', 'Latest updates'],
  searchPlaceholder: [
    'Tìm theo tên thiết bị, model hoặc tiêu chuẩn',
    'Search by product, model or standard',
  ],
  all: ['Tất cả', 'All'],
  noResults: ['Hãy thử tên model, tiêu chuẩn hoặc thương hiệu khác.', 'Try another model, standard or brand.'],
  applications: ['Ứng dụng', 'Applications'],
  standards: ['Tiêu chuẩn', 'Standards'],
  highlights: ['Điểm nổi bật', 'Highlights'],
  specifications: ['Thông tin kỹ thuật', 'Technical information'],
  relatedProducts: ['Sản phẩm liên quan', 'Related products'],
  brand: ['Thương hiệu', 'Brand'],
  category: ['Nhóm sản phẩm', 'Category'],
  requestProduct: ['Yêu cầu tư vấn sản phẩm', 'Request product consultation'],
  downloadBrochure: ['Tải brochure', 'Download brochure'],
  backToCatalog: ['Quay lại danh mục', 'Back to catalog'],
  updatesAll: ['Tất cả', 'All'],
  updatesNews: ['Tin tức', 'News'],
  updatesEvents: ['Sự kiện', 'Events'],
  updatesProjects: ['Dự án', 'Projects'],
  relatedEquipment: ['Thiết bị liên quan', 'Related equipment'],
  readArticle: ['Đọc bài viết', 'Read article'],
  offices: ['Hệ thống văn phòng', 'Our offices'],
  sendRequest: ['Gửi yêu cầu', 'Send request'],
  formReady: [
    'Yêu cầu chưa được gửi. Chức năng này sẽ hoạt động sau khi kết nối backend.',
    'The request has not been sent. Submission will work after the backend is connected.',
  ],
  fullName: ['Họ và tên', 'Full name'],
  company: ['Công ty', 'Company'],
  phone: ['Số điện thoại', 'Phone'],
  email: ['Email', 'Email'],
  interest: ['Sản phẩm quan tâm', 'Product of interest'],
  message: ['Nội dung cần hỗ trợ', 'How can we help?'],
  selectProduct: ['Chọn sản phẩm', 'Select a product'],
  navigation: ['Điều hướng', 'Navigation'],
  salesEmail: ['Email kinh doanh', 'Sales email'],
  mainOffice: ['Trụ sở chính', 'Head office'],
  copyright: ['Bản quyền thuộc LT Việt Nam.', 'Copyright LT Vietnam.'],
  menu: ['Mở menu', 'Open menu'],
  closeMenu: ['Đóng menu', 'Close menu'],

  // --- New Keys added during Refactor ---
  heroEyebrow: ['THIẾT BỊ PHÂN TÍCH · VAN CÔNG NGHIỆP', 'ANALYTICAL INSTRUMENTS · INDUSTRIAL VALVES'],
  heroTitle: ['Giải pháp thiết bị cho phòng thí nghiệm và nhà máy.', 'Equipment solutions for laboratories and plants.'],
  heroDesc: ['Thiết bị phân tích PAC, Herzog và van công nghiệp Baker Hughes, được tư vấn theo ứng dụng, lắp đặt và chuyển giao bởi đội ngũ kỹ thuật LT Việt Nam.', 'PAC and Herzog analytical instruments and Baker Hughes industrial valves, selected, installed and handed over by LT Vietnam\'s technical team.'],
  exploreSolutions: ['Khám phá giải pháp', 'Explore solutions'],
  talkToEngineer: ['Trao đổi với kỹ sư', 'Talk to an engineer'],
  serviceCommitments: ['Cam kết dịch vụ', 'Service commitments'],

  solutionGroups: ['NHÓM GIẢI PHÁP', 'SOLUTION GROUPS'],
  equipmentTwoNeeds: ['Thiết bị cho hai nhu cầu cốt lõi', 'Equipment for two core needs'],
  equipmentDesc: ['Đi thẳng đến nhóm thiết bị phù hợp với phòng thí nghiệm hoặc hệ thống công nghệ của nhà máy.', 'Go directly to equipment for your laboratory or plant process system.'],

  labAnalysis: ['Phân tích nhiên liệu và phòng thí nghiệm', 'Fuel and laboratory analysis'],
  labDesc: ['Thiết bị chưng cất, sắc ký khí, phân tích nguyên tố và kiểm tra tính chất nhiên liệu.', 'Distillation, gas chromatography, elemental analysis and fuel property testing.'],
  explorePac: ['Khám phá thiết bị PAC', 'Explore PAC equipment'],

  processControl: ['Điều khiển và bảo vệ áp suất', 'Process control and pressure protection'],
  processDesc: ['Van điều khiển Masoneilan, van an toàn Consolidated và thiết bị hỗ trợ vận hành.', 'Masoneilan control valves, Consolidated safety valves and supporting equipment.'],
  exploreBaker: ['Khám phá Baker Hughes', 'Explore Baker Hughes'],

  nextStep: ['BƯỚC TIẾP THEO', 'NEXT STEP'],
  nextStepTitle: ['Từ lựa chọn đến triển khai', 'From selection to implementation'],
  nextStepDesc: ['Sau khi xác định nhóm thiết bị, đội ngũ kỹ thuật tiếp tục làm rõ yêu cầu, cấu hình và kế hoạch chuyển giao.', 'After identifying the equipment group, the technical team defines requirements, configuration and handover plan.'],

  supportProcess: ['QUY TRÌNH HỖ TRỢ', 'SUPPORT PROCESS'],
  supportProcessTitle: ['Một quy trình, rõ trách nhiệm ở từng bước', 'One process, clear responsibilities'],
  supportProcessDesc: ['Từ khâu đầu tiên đến khi bảo dưỡng, chúng tôi định hình rõ công việc và cam kết đồng hành cùng nhà máy.', 'From initial inquiry to maintenance, we clearly define tasks and commit to partnering with your plant.'],

  techSupportSteps: ['Các bước hỗ trợ kỹ thuật', 'Technical support steps'],
  step: ['BƯỚC', 'STEP'],
  stepOutcomes: ['KẾT QUẢ CỦA BƯỚC', 'STEP OUTCOME'],
  howItWorks: ['Tìm hiểu cách LT Việt Nam làm việc', 'How LT Vietnam works'],

  projectsActivities: ['DỰ ÁN & HOẠT ĐỘNG KỸ THUẬT', 'PROJECTS & TECHNICAL ACTIVITIES'],
  capabilityTitle: ['Năng lực qua dự án và hoạt động kỹ thuật', 'Capability through projects and technical activities'],
  capabilityDesc: ['Theo dõi các dự án nâng cấp, bảo dưỡng và chuyển giao thiết bị gần nhất tại các nhà máy.', 'Track our latest upgrade, maintenance and equipment handover projects.'],

  startRequirement: ['BẮT ĐẦU TỪ YÊU CẦU CỦA BẠN', 'START WITH YOUR REQUIREMENT'],
  readyToSupport: ['Sẵn sàng hỗ trợ và đề xuất giải pháp kỹ thuật', 'Ready to support and propose technical solutions'],
  contactSalesDesc: ['Liên hệ với bộ phận kinh doanh và kỹ thuật để nhận thông tin sản phẩm và tư vấn lựa chọn.', 'Contact our sales and technical team for product information and selection advice.'],
  getAdvice: ['Nhận tư vấn kỹ thuật', 'Get technical advice'],

  talkToOurTeam: ['TRAO ĐỔI VỚI CHÚNG TÔI', 'TALK TO OUR TEAM'],
  contactLTV: ['Liên hệ LT Việt Nam', 'Contact LT Vietnam'],
  contactLTVDesc: ['Gửi nhu cầu thiết bị hoặc liên hệ trực tiếp với đội ngũ kinh doanh và kỹ thuật.', 'Send your equipment requirements or contact our sales and technical team directly.'],
  reachRightTeam: ['Kết nối đúng người phụ trách', 'Reach the right team'],
  reachRightTeamDesc: ['Thông tin sản phẩm, model và ứng dụng sẽ giúp chúng tôi định hướng yêu cầu nhanh hơn.', 'Product, model and application details help us route your request faster.'],
  contactNearestOffice: ['Liên hệ văn phòng gần nhất để được phối hợp nhanh hơn.', 'Contact the nearest office for a faster response.'],

  updatesEyebrow: ['CẬP NHẬT TỪ LT VIỆT NAM', 'UPDATES FROM LT VIETNAM'],
  newsEvents: ['Tin tức và Sự kiện', 'News and Events'],
  newsEventsDesc: ['Cập nhật thông tin về công nghệ, sản phẩm mới và các hoạt động triển khai dự án.', 'Updates on technology, new products and project implementation activities.'],
  filterPosts: ['Lọc bài viết', 'Filter posts'],
  noPosts: ['Chưa có bài viết trong nhóm này', 'No posts in this category'],
  chooseAnotherCategory: ['Chọn nhóm khác để xem các nội dung hiện có.', 'Choose another category to view available posts.'],

  pacDesc: ['Giải pháp phân tích toàn diện cho phòng thí nghiệm', 'Comprehensive analytical solutions for laboratories'],
  bakerDesc: ['Giải pháp điều khiển và bảo vệ áp suất công nghiệp', 'Industrial process control and pressure protection solutions'],
  browseByCategory: ['Duyệt theo nhóm sản phẩm', 'Browse by category'],
  allProducts: ['Tất cả sản phẩm', 'All products'],
  pacTitle: ['Thiết bị phân tích nhiên liệu và phòng thí nghiệm', 'Fuel and laboratory analysis instruments'],
  bakerTitle: ['Giải pháp van điều khiển và van an toàn', 'Control valve and safety valve solutions'],
  pacIntro: ['Tìm theo ứng dụng, nhóm thiết bị, phương pháp thử hoặc model.', 'Search by application, equipment group, test method or model.'],
  bakerIntro: ['Tìm theo loại van, ứng dụng, thương hiệu hoặc model.', 'Search by valve type, application, brand or model.'],
  productCategories: ['Nhóm sản phẩm', 'Product categories'],
  productsCount: ['sản phẩm', 'products'],
  noMatchingProducts: ['Chưa có sản phẩm phù hợp', 'No matching products'],
  clearFilters: ['Xóa bộ lọc', 'Clear filters'],
} as const

export type UiKey = keyof typeof uiCopy

const contentTranslations: Record<string, string> = {
  'Thiết bị chưng cất tự động tại áp suất khí quyển':
    'Automatic atmospheric distillation analyzer',
  'Thiết bị xác định trị số cetane dẫn xuất': 'Derived cetane number analyzer',
  'Thiết bị đo độ nhớt động học tự động': 'Automatic kinematic viscosity analyzer',
  'Thiết bị đo điểm chớp cháy cốc kín Pensky-Martens':
    'Pensky-Martens closed cup flash point analyzer',
  'Thiết bị chưng cất tự động ở áp suất chân không':
    'Automatic vacuum distillation analyzer',
  'Thiết bị đo áp suất hơi bão hòa tự động': 'Automatic vapor pressure analyzer',
  'Van điều khiển globe hiệu suất cao': 'High-performance globe control valve',
  'Bộ định vị van thông minh': 'Smart digital valve positioner',
  'Bộ truyền động màng lò xo khí nén': 'Pneumatic spring diaphragm actuator',
  'Van điều khiển cho ứng dụng hơi': 'Control valve for steam service',
  'Van an toàn cho ứng dụng công nghiệp': 'Industrial safety valve',
  'Van an toàn và xả áp': 'Safety relief valve',
  'Thiết bị kiểm tra van điện tử': 'Electronic valve tester',
  'Chưng cất': 'Distillation',
  'Chỉ số cetane': 'Cetane number',
  'Độ nhớt': 'Viscosity',
  'Điểm chớp cháy': 'Flash point',
  'Áp suất hơi': 'Vapor pressure',
  'Van điều khiển': 'Control valves',
  'Bộ định vị': 'Positioners',
  'Bộ truyền động': 'Actuators',
  'Van an toàn': 'Safety valves',
  'Thiết bị kiểm tra': 'Test equipment',
  'Tin tức': 'News',
  'Sự kiện': 'Events',
  'Dự án': 'Projects',
  'LT Việt Nam hoàn thành lắp đặt và bàn giao PAC OptiDist 2 tại Quatest 2':
    'LT Vietnam completes PAC OptiDist 2 installation and handover at Quatest 2',
  'Hội thảo bảo dưỡng và kiểm định van an toàn trong nhà máy công nghiệp':
    'Industrial safety valve maintenance and inspection seminar',
  'Chuyển giao thiết bị xác định điểm đông đặc Phase Technology DFA-70Xi':
    'Phase Technology DFA-70Xi analyzer handover',
}

type LanguageContextValue = {
  language: Language
  setLanguage: (language: Language) => void
  t: (key: UiKey) => string
  content: (text: string) => string
}

const LanguageContext = createContext<LanguageContextValue | null>(null)

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [language, setLanguage] = useState<Language>('vi')

  useEffect(() => {
    document.documentElement.lang = language
  }, [language])

  const value = useMemo<LanguageContextValue>(
    () => ({
      language,
      setLanguage,
      t: (key) => uiCopy[key][language === 'vi' ? 0 : 1],
      content: (text) =>
        language === 'vi' ? text : (contentTranslations[text] ?? text),
    }),
    [language],
  )

  return <LanguageContext.Provider value={value}>{children}</LanguageContext.Provider>
}

export function useLanguage() {
  const context = useContext(LanguageContext)
  if (!context) {
    throw new Error('useLanguage must be used within LanguageProvider')
  }
  return context
}

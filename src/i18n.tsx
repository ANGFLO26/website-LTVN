// oxlint-disable react/only-export-components -- Provider and its hook share one private context.
import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'
import type { LocalizedText } from './data'

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
  clearSearch: ['Xóa nội dung tìm kiếm', 'Clear search'],
  filterProducts: ['Bộ lọc sản phẩm', 'Product filters'],
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
  productAdviceHint: [
    'Chuẩn bị ứng dụng, tiêu chuẩn cần áp dụng và điều kiện vận hành để trao đổi đúng cấu hình.',
    'Prepare the application, required standards and operating conditions to discuss the right configuration.',
  ],
  callTechnicalTeam: ['Gọi đội ngũ kỹ thuật', 'Call the technical team'],
  productConsultEyebrow: ['TƯ VẤN THEO ỨNG DỤNG', 'APPLICATION-LED CONSULTATION'],
  productConsultTitle: [
    'Cần xác nhận sản phẩm này phù hợp với ứng dụng của bạn?',
    'Need to confirm whether this product fits your application?',
  ],
  productConsultDesc: [
    'Chia sẻ loại mẫu hoặc lưu chất, tiêu chuẩn áp dụng và điều kiện vận hành để cùng trao đổi model, cấu hình và phương án triển khai phù hợp.',
    'Share the sample or process medium, applicable standards and operating conditions to discuss a suitable model, configuration and implementation approach.',
  ],
  sendRequirement: ['Gửi yêu cầu tư vấn', 'Send consultation request'],
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
  heroDesc: ['Thiết bị phân tích và van công nghiệp, được tư vấn, triển khai và hỗ trợ bởi đội ngũ kỹ thuật LT Việt Nam.', 'Analytical instruments and industrial valves, configured, commissioned and supported by LT Vietnam\'s technical team.'],
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
  supportProcessDesc: ['Chọn từng bước để xem cách LT Việt Nam phối hợp từ yêu cầu ban đầu đến khi thiết bị được đưa vào vận hành.', 'Select each step to see how LT Vietnam works from the initial requirement through equipment operation.'],

  techSupportSteps: ['Các bước hỗ trợ kỹ thuật', 'Technical support steps'],
  step: ['BƯỚC', 'STEP'],
  stepOutcomes: ['KẾT QUẢ CỦA BƯỚC', 'STEP OUTCOME'],
  howItWorks: ['Tìm hiểu cách LT Việt Nam làm việc', 'How LT Vietnam works'],

  projectsActivities: ['DỰ ÁN & HOẠT ĐỘNG KỸ THUẬT', 'PROJECTS & TECHNICAL ACTIVITIES'],
  capabilityTitle: ['Năng lực qua dự án và hoạt động kỹ thuật', 'Capability through projects and technical activities'],
  capabilityDesc: ['Các hoạt động lắp đặt, chuyển giao và chia sẻ chuyên môn thể hiện cách đội ngũ LT Việt Nam đồng hành cùng khách hàng.', 'Installation, handover and knowledge-sharing activities show how LT Vietnam supports customers.'],

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
  productFallbackTitle: ['Sản phẩm', 'Product'],
  productNotFound: ['Không tìm thấy sản phẩm', 'Product not found'],
  articleNotFound: ['Không tìm thấy bài viết', 'Article not found'],
  pageNotFoundTitle: ['Không tìm thấy trang', 'Page not found'],
  pageNotFoundDescription: [
    'Đường dẫn bạn truy cập không tồn tại hoặc đã được thay đổi.',
    'The page you requested does not exist or has been moved.',
  ],
  backHome: ['Về trang chủ', 'Back to home'],
  skipNavigation: ['Bỏ qua điều hướng', 'Skip navigation'],
  brandHomeLabel: ['LT Việt Nam - Trang chủ', 'LT Vietnam - Home'],
  aboutSeminarAlt: ['Hội thảo kỹ thuật LT Việt Nam', 'LT Vietnam technical seminar'],
  languageLabel: ['Ngôn ngữ hiển thị', 'Display language'],
  siteMetaDescription: [
    'LT Việt Nam cung cấp thiết bị phân tích PAC, van điều khiển Masoneilan, van an toàn Consolidated và dịch vụ kỹ thuật.',
    'LT Vietnam supplies PAC analytical instruments, Masoneilan control valves, Consolidated safety valves and technical services.',
  ],
  customersEyebrow: ['DẤU ẤN HỢP TÁC', 'CUSTOMER REFERENCES'],
  customersTitle: ['Khách hàng tiêu biểu', 'Selected customers'],
  customersDescription: [
    'Một số doanh nghiệp và đơn vị công nghiệp đã tin tưởng lựa chọn thiết bị, dịch vụ và hỗ trợ kỹ thuật từ LT Việt Nam.',
    'Selected industrial organizations that have chosen equipment, services and technical support from LT Vietnam.',
  ],
  customersListLabel: [
    'Danh sách logo khách hàng tiêu biểu',
    'Selected customer logo list',
  ],
  aboutExploreCapabilities: ['Xem năng lực triển khai', 'Explore our capabilities'],
  discussRequirement: ['Trao đổi yêu cầu', 'Discuss a requirement'],
  supportScope: ['Phạm vi đồng hành', 'Support scope'],
  laboratoryEquipment: ['Thiết bị phòng thí nghiệm', 'Laboratory equipment'],
  plantEquipment: ['Thiết bị và van cho nhà máy', 'Plant equipment and valves'],
  lifecycleSupport: ['Hỗ trợ xuyên suốt vòng đời thiết bị', 'Equipment lifecycle support'],
  aboutOverviewEyebrow: ['VAI TRÒ CỦA LT VIỆT NAM', 'LT VIETNAM\'S ROLE'],
  aboutOverviewTitle: ['Kết nối thiết bị với yêu cầu vận hành thực tế', 'Connecting equipment with real operating requirements'],
  aboutOverviewDesc: [
    'LT Việt Nam cung cấp thiết bị, phụ tùng và vật tư cho phòng thí nghiệm và nhà máy công nghiệp. Trọng tâm của đội ngũ là làm rõ ứng dụng, lựa chọn cấu hình và phối hợp kỹ thuật trong quá trình triển khai.',
    'LT Vietnam supplies equipment, spare parts and consumables for laboratories and industrial plants. Our team focuses on clarifying applications, selecting configurations and coordinating technical implementation.',
  ],
  solutionPortfolio: ['Danh mục giải pháp', 'Solution portfolio'],
  servedEnvironments: ['Môi trường ứng dụng', 'Application environments'],
  servedEnvironmentsValue: ['Phòng thí nghiệm · Nhà máy công nghiệp', 'Laboratories · Industrial plants'],
  technicalScope: ['Phạm vi kỹ thuật', 'Technical scope'],
  technicalScopeValue: ['Tư vấn · Cung cấp · Chuyển giao · Hậu mãi', 'Consultation · Supply · Handover · After-sales'],
  lifecycleEyebrow: ['VÒNG ĐỜI THIẾT BỊ', 'EQUIPMENT LIFECYCLE'],
  lifecycleTitle: ['Một đầu mối, bốn giai đoạn phối hợp', 'One partner across four coordinated stages'],
  lifecycleDesc: [
    'Mỗi giai đoạn thể hiện rõ đầu việc và kết quả cần đạt, từ yêu cầu ban đầu đến hỗ trợ vận hành.',
    'Each stage clarifies the work and intended outcome, from the initial requirement through operating support.',
  ],
  realActivityPhoto: ['Ảnh hoạt động kỹ thuật thực tế của LT Việt Nam', 'Photo from an actual LT Vietnam technical activity'],
  realCaseStudy: ['CASE STUDY THỰC TẾ', 'REAL CASE STUDY'],
  caseContext: ['Bối cảnh', 'Context'],
  caseApproach: ['Cách triển khai', 'Approach'],
  caseValue: ['Trọng tâm giá trị', 'Value focus'],
  viewCaseStudy: ['Xem toàn bộ hoạt động', 'View the full story'],
  directionEyebrow: ['TẦM NHÌN & CAM KẾT', 'VISION & COMMITMENT'],
  directionTitle: ['Trở thành đối tác được ưu tiên lựa chọn', 'To be a preferred partner of choice'],
  directionDesc: [
    'Cung cấp sản phẩm và dịch vụ chất lượng, hướng đến sự hài lòng lâu dài của khách hàng và quan hệ hợp tác bền vững.',
    'Providing quality products and services with a focus on long-term customer satisfaction and lasting partnerships.',
  ],
  directionPrincipleOne: ['Liên tục đào tạo và phát triển năng lực đội ngũ.', 'Continuously train and empower our team.'],
  directionPrincipleTwo: ['Xây dựng quan hệ lâu dài với khách hàng và nhà cung cấp.', 'Build lasting relationships with customers and key suppliers.'],
  aboutOfficeSummary: [
    'Ba điểm liên hệ giúp khách hàng kết nối với khu vực phụ trách phù hợp.',
    'Three contact points help customers reach the appropriate regional office.',
  ],
  newsEventsPurposeDesc: [
    'Theo dõi các dự án chuyển giao, hoạt động kỹ thuật và cập nhật thiết bị từ LT Việt Nam.',
    'Follow LT Vietnam\'s handover projects, technical activities and equipment updates.',
  ],
  browseUpdates: ['Xem các cập nhật', 'Browse updates'],
  featuredFieldStory: ['HOẠT ĐỘNG NỔI BẬT', 'FEATURED FIELD STORY'],
  newsFeedEyebrow: ['HỒ SƠ HOẠT ĐỘNG', 'ACTIVITY JOURNAL'],
  newsFeedTitle: ['Dự án, sự kiện và cập nhật kỹ thuật', 'Projects, events and technical updates'],
  newsFeedDesc: [
    'Nội dung được phân nhóm để dễ tìm theo loại hoạt động.',
    'Content is grouped so you can quickly find the type of activity you need.',
  ],
  postsCount: ['bài viết', 'posts'],
  sendEmail: ['Gửi email', 'Send an email'],
  contactPurposeDesc: [
    'Chọn kênh liên hệ trực tiếp hoặc gửi mô tả ngắn về ứng dụng để đội ngũ phụ trách tiếp nhận.',
    'Choose a direct contact channel or send a short application brief for the appropriate team to review.',
  ],
  prepareBeforeContact: ['Thông tin nên chuẩn bị', 'Helpful information to prepare'],
  contactBriefApplication: ['Ứng dụng, loại mẫu hoặc lưu chất', 'Application, sample or process medium'],
  contactBriefStandard: ['Tiêu chuẩn hoặc yêu cầu kỹ thuật', 'Standard or technical requirement'],
  contactBriefCondition: ['Điều kiện vận hành và thời gian dự kiến', 'Operating conditions and expected timing'],
  directChannels: ['KÊNH LIÊN HỆ TRỰC TIẾP', 'DIRECT CONTACT CHANNELS'],
  contactFormEyebrow: ['MÔ TẢ YÊU CẦU', 'REQUIREMENT BRIEF'],
  contactFormTitle: ['Gửi thông tin trong một biểu mẫu ngắn', 'Send a short requirement brief'],
  contactFormDesc: [
    'Chỉ cần thông tin liên hệ, sản phẩm quan tâm và nội dung cần hỗ trợ.',
    'Only your contact details, product interest and support requirement are needed.',
  ],
  requiredFieldsNote: ['Các trường có dấu * là bắt buộc.', 'Fields marked * are required.'],
  contactMethod: ['Email hoặc số điện thoại', 'Email or phone number'],
  contactMethodHint: ['Dùng kênh thuận tiện nhất để chúng tôi phản hồi.', 'Use the most convenient channel for our response.'],
} as const

export type UiKey = keyof typeof uiCopy

type LanguageContextValue = {
  language: Language
  setLanguage: (language: Language) => void
  t: (key: UiKey) => string
  content: (text: LocalizedText) => string
}

const LanguageContext = createContext<LanguageContextValue | null>(null)

const LANGUAGE_STORAGE_KEY = 'ltv-language'

function getInitialLanguage(): Language {
  try {
    const savedLanguage = window.localStorage.getItem(LANGUAGE_STORAGE_KEY)
    if (savedLanguage === 'vi' || savedLanguage === 'en') return savedLanguage
  } catch {
    // Storage can be unavailable in privacy-restricted browser contexts.
  }

  return 'vi'
}

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [language, setLanguage] = useState<Language>(getInitialLanguage)

  useEffect(() => {
    document.documentElement.lang = language
    const copyIndex = language === 'vi' ? 0 : 1
    const description = uiCopy.siteMetaDescription[copyIndex]
    document.querySelector('meta[name="description"]')?.setAttribute('content', description)
    document.querySelector('meta[property="og:description"]')?.setAttribute('content', description)
    document.querySelector('meta[property="og:locale"]')?.setAttribute('content', language === 'vi' ? 'vi_VN' : 'en_US')

    try {
      window.localStorage.setItem(LANGUAGE_STORAGE_KEY, language)
    } catch {
      // The selected language still applies for the current session.
    }
  }, [language])

  const value = useMemo<LanguageContextValue>(
    () => ({
      language,
      setLanguage,
      t: (key) => uiCopy[key][language === 'vi' ? 0 : 1],
      content: (text) => text[language],
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

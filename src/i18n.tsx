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

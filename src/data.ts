export type ProductFamily = 'pac' | 'baker-hughes'

export type LocalizedText = {
  vi: string
  en: string
}

export const localized = (vi: string, en: string): LocalizedText => ({ vi, en })

export type Product = {
  slug: string
  family: ProductFamily
  brand: string
  model: string
  name: LocalizedText
  summary: LocalizedText
  category: LocalizedText
  image: string
  technicalBasis: {
    label: LocalizedText
    values: LocalizedText[]
  }
  applications: LocalizedText[]
  highlights: LocalizedText[]
  specifications: Array<{ label: LocalizedText; value: LocalizedText }>
}

export type Office = {
  city: LocalizedText
  label: LocalizedText
  address: LocalizedText
  phone?: string
  email: string
}

export type NewsType = 'news' | 'event' | 'project'

export type NewsItem = {
  slug: string
  type: NewsType
  year: string
  title: LocalizedText
  excerpt: LocalizedText
  image: string
  imageFit?: 'cover' | 'contain'
  relatedProduct?: string
  paragraphs: LocalizedText[]
}

export const newsTypeLabels: Record<NewsType, LocalizedText> = {
  news: localized('Tin tức', 'News'),
  event: localized('Sự kiện', 'Events'),
  project: localized('Dự án', 'Projects'),
}

export const products: Product[] = [
  {
    slug: 'optidist',
    family: 'pac',
    brand: 'PAC',
    model: 'OptiDist 2',
    name: localized('Thiết bị chưng cất khí quyển tự động', 'Automatic atmospheric distillation analyzer'),
    summary: localized(
      'Hệ thống chưng cất tự động cho xăng, diesel và nhiên liệu hàng không, hỗ trợ kiểm soát tốc độ chưng cất ổn định.',
      'An automated distillation system for gasoline, diesel and aviation fuel, with stable distillation rate control.',
    ),
    category: localized('Chưng cất', 'Distillation'),
    image: '/images/products/optidist-2-official.png',
    technicalBasis: {
      label: localized('Tiêu chuẩn', 'Standards'),
      values: [localized('ASTM D86', 'ASTM D86'), localized('ISO 3405', 'ISO 3405'), localized('IP 123', 'IP 123')],
    },
    applications: [
      localized('Xăng', 'Gasoline'),
      localized('Diesel', 'Diesel'),
      localized('Nhiên liệu hàng không', 'Aviation fuel'),
    ],
    highlights: [
      localized('Vận hành tự động với giao diện trực quan', 'Automated operation with an intuitive interface'),
      localized('Kiểm soát tốc độ chưng cất trong suốt phép thử', 'Controls the distillation rate throughout the test'),
      localized('Giảm thao tác cài đặt nhiệt thủ công', 'Reduces manual heating setup'),
    ],
    specifications: [
      { label: localized('Phương pháp', 'Method'), value: localized('Chưng cất khí quyển tự động', 'Automatic atmospheric distillation') },
      { label: localized('Mẫu thử', 'Test samples'), value: localized('Sản phẩm dầu mỏ và nhiên liệu', 'Petroleum products and fuels') },
      { label: localized('Điều khiển', 'Control'), value: localized('Màn hình cảm ứng tích hợp', 'Integrated touchscreen') },
    ],
  },
  {
    slug: 'cid-510',
    family: 'pac',
    brand: 'Herzog',
    model: 'CID 510',
    name: localized('Thiết bị xác định trị số cetane dẫn xuất', 'Derived cetane number analyzer'),
    summary: localized(
      'Phân tích chất lượng cháy của nhiên liệu diesel thông qua phép đo thời gian trễ đánh lửa.',
      'Evaluates diesel fuel ignition quality by measuring ignition delay.',
    ),
    category: localized('Chỉ số cetane', 'Cetane number'),
    image: '/images/products/cid-510-transparent.png',
    technicalBasis: {
      label: localized('Tiêu chuẩn', 'Standards'),
      values: [localized('ASTM D7668', 'ASTM D7668')],
    },
    applications: [localized('Diesel', 'Diesel'), localized('Nhiên liệu sinh học', 'Biofuels')],
    highlights: [
      localized('Thời gian phân tích ngắn', 'Short analysis time'),
      localized('Lượng mẫu nhỏ', 'Small sample volume'),
      localized('Phù hợp phòng thí nghiệm kiểm soát chất lượng', 'Suitable for quality control laboratories'),
    ],
    specifications: [
      { label: localized('Kết quả', 'Result'), value: localized('Trị số cetane dẫn xuất', 'Derived Cetane Number') },
      { label: localized('Phương pháp', 'Method'), value: localized('Buồng đốt thể tích không đổi', 'Constant-volume combustion chamber') },
      { label: localized('Ứng dụng', 'Application'), value: localized('Kiểm soát chất lượng nhiên liệu diesel', 'Diesel fuel quality control') },
    ],
  },
  {
    slug: 'hvm-472',
    family: 'pac',
    brand: 'Herzog',
    model: 'HVM 472',
    name: localized('Thiết bị đo độ nhớt động học tự động', 'Automatic kinematic viscosity analyzer'),
    summary: localized(
      'Hệ thống đo độ nhớt đa dải, hỗ trợ tự động hóa quy trình phân tích sản phẩm dầu mỏ.',
      'A multi-range viscosity measurement system that automates petroleum product analysis.',
    ),
    category: localized('Độ nhớt', 'Viscosity'),
    image: '/images/products/hvm-472.jpg',
    technicalBasis: {
      label: localized('Tiêu chuẩn', 'Standards'),
      values: [localized('ASTM D445', 'ASTM D445'), localized('ISO 3104', 'ISO 3104')],
    },
    applications: [
      localized('Dầu nhờn', 'Lubricating oils'),
      localized('Nhiên liệu', 'Fuels'),
      localized('Sản phẩm dầu mỏ', 'Petroleum products'),
    ],
    highlights: [
      localized('Đo tự động nhiều dải độ nhớt', 'Automatic measurement across multiple viscosity ranges'),
      localized('Giảm thời gian thao tác của kỹ thuật viên', 'Reduces operator handling time'),
      localized('Quản lý kết quả trên giao diện tích hợp', 'Manages results through the integrated interface'),
    ],
    specifications: [
      { label: localized('Đại lượng', 'Measured property'), value: localized('Độ nhớt động học', 'Kinematic viscosity') },
      { label: localized('Phương pháp', 'Method'), value: localized('Ống mao quản tự động', 'Automated capillary method') },
      { label: localized('Điều khiển nhiệt', 'Temperature control'), value: localized('Bể ổn nhiệt tích hợp', 'Integrated constant-temperature bath') },
    ],
  },
  {
    slug: 'optiflash-pensky-martens',
    family: 'pac',
    brand: 'Herzog',
    model: 'OptiFlash',
    name: localized('Thiết bị đo điểm chớp cháy cốc kín Pensky-Martens', 'Pensky-Martens closed-cup flash point analyzer'),
    summary: localized(
      'Thiết bị tự động xác định điểm chớp cháy cho nhiên liệu, dầu nhờn và các sản phẩm dầu mỏ.',
      'An automatic instrument for determining the flash point of fuels, lubricating oils and petroleum products.',
    ),
    category: localized('Điểm chớp cháy', 'Flash point'),
    image: '/images/products/optiflash.jpg',
    technicalBasis: {
      label: localized('Tiêu chuẩn', 'Standards'),
      values: [localized('ASTM D93', 'ASTM D93'), localized('ISO 2719', 'ISO 2719')],
    },
    applications: [
      localized('Dầu nhờn', 'Lubricating oils'),
      localized('Diesel', 'Diesel'),
      localized('Sản phẩm dầu mỏ', 'Petroleum products'),
    ],
    highlights: [
      localized('Nhận biết điểm chớp cháy tự động', 'Automatic flash point detection'),
      localized('Kiểm soát gia nhiệt chính xác', 'Precise heating control'),
      localized('Hỗ trợ quy trình an toàn trong phòng thí nghiệm', 'Supports safer laboratory workflows'),
    ],
    specifications: [
      { label: localized('Cốc thử', 'Test cup'), value: localized('Pensky-Martens cốc kín', 'Pensky-Martens closed cup') },
      { label: localized('Đánh lửa', 'Ignition'), value: localized('Tự động', 'Automatic') },
      { label: localized('Hiển thị', 'Display'), value: localized('Màn hình điều khiển tích hợp', 'Integrated control display') },
    ],
  },
  {
    slug: 'hdv-632',
    family: 'pac',
    brand: 'Herzog',
    model: 'HDV 632',
    name: localized('Thiết bị chưng cất tự động ở áp suất chân không', 'Automatic vacuum distillation analyzer'),
    summary: localized(
      'Giải pháp chưng cất chân không cho các sản phẩm dầu mỏ có nhiệt độ sôi cao.',
      'A vacuum distillation solution for high-boiling petroleum products.',
    ),
    category: localized('Chưng cất', 'Distillation'),
    image: '/images/products/hdv-632.jpg',
    technicalBasis: {
      label: localized('Tiêu chuẩn', 'Standards'),
      values: [localized('ASTM D1160', 'ASTM D1160'), localized('ISO 6616', 'ISO 6616')],
    },
    applications: [
      localized('Dầu nặng', 'Heavy oils'),
      localized('Dầu nhờn', 'Lubricating oils'),
      localized('Phân đoạn chân không', 'Vacuum fractions'),
    ],
    highlights: [
      localized('Kiểm soát áp suất chân không', 'Vacuum pressure control'),
      localized('Tự động ghi nhận nhiệt độ và thể tích', 'Automatically records temperature and volume'),
      localized('Thiết kế phù hợp phòng thí nghiệm công nghiệp', 'Designed for industrial laboratories'),
    ],
    specifications: [
      { label: localized('Phương pháp', 'Method'), value: localized('Chưng cất chân không', 'Vacuum distillation') },
      { label: localized('Điều khiển áp suất', 'Pressure control'), value: localized('Tự động', 'Automatic') },
      { label: localized('Dữ liệu', 'Data'), value: localized('Ghi nhận và xuất báo cáo', 'Recording and report export') },
    ],
  },
  {
    slug: 'hvp-972',
    family: 'pac',
    brand: 'Herzog',
    model: 'HVP 972',
    name: localized('Thiết bị đo áp suất hơi bão hòa tự động', 'Automatic vapor pressure analyzer'),
    summary: localized(
      'Phân tích áp suất hơi của xăng và sản phẩm dầu mỏ trong quy trình kiểm soát chất lượng.',
      'Measures the vapor pressure of gasoline and petroleum products for quality control.',
    ),
    category: localized('Áp suất hơi', 'Vapor pressure'),
    image: '/images/products/hvp-972.jpg',
    technicalBasis: {
      label: localized('Tiêu chuẩn', 'Standards'),
      values: [localized('ASTM D5191', 'ASTM D5191')],
    },
    applications: [
      localized('Xăng', 'Gasoline'),
      localized('Nhiên liệu', 'Fuels'),
      localized('Dung môi nhẹ', 'Light solvents'),
    ],
    highlights: [
      localized('Chuẩn bị mẫu đơn giản', 'Simple sample preparation'),
      localized('Điều khiển nhiệt độ tự động', 'Automatic temperature control'),
      localized('Kết quả nhanh và dễ theo dõi', 'Fast, easy-to-track results'),
    ],
    specifications: [
      { label: localized('Đại lượng', 'Measured property'), value: localized('Áp suất hơi', 'Vapor pressure') },
      { label: localized('Mẫu thử', 'Test samples'), value: localized('Xăng và sản phẩm nhẹ', 'Gasoline and light products') },
      { label: localized('Vận hành', 'Operation'), value: localized('Tự động', 'Automatic') },
    ],
  },
  {
    slug: 'masoneilan-21000',
    family: 'baker-hughes',
    brand: 'Masoneilan',
    model: '21000 Series',
    name: localized('Van điều khiển globe hiệu suất cao', 'High-performance globe control valve'),
    summary: localized(
      'Dòng van điều khiển đa dụng cho các ứng dụng chất lỏng, khí và hơi trong nhà máy công nghiệp.',
      'A general-purpose control valve series for liquid, gas and steam applications in industrial plants.',
    ),
    category: localized('Van điều khiển', 'Control valves'),
    image: '/images/products/valve-21000-transparent.png',
    technicalBasis: {
      label: localized('Tiêu chuẩn', 'Standards'),
      values: [localized('ASME B16.34', 'ASME B16.34')],
    },
    applications: [
      localized('Hơi', 'Steam'),
      localized('Khí', 'Gas'),
      localized('Chất lỏng công nghệ', 'Process liquids'),
    ],
    highlights: [
      localized('Cấu trúc thân van globe', 'Globe-style valve body'),
      localized('Nhiều lựa chọn trim và vật liệu', 'Multiple trim and material options'),
      localized('Phù hợp nhiều điều kiện công nghệ', 'Suitable for a wide range of process conditions'),
    ],
    specifications: [
      { label: localized('Kiểu van', 'Valve type'), value: localized('Van điều khiển globe', 'Globe control valve') },
      { label: localized('Thương hiệu', 'Brand'), value: localized('Masoneilan', 'Masoneilan') },
      { label: localized('Ứng dụng', 'Application'), value: localized('Điều khiển lưu lượng và áp suất', 'Flow and pressure control') },
    ],
  },
  {
    slug: 'svi-ii-ap',
    family: 'baker-hughes',
    brand: 'Masoneilan',
    model: 'SVI II AP',
    name: localized('Bộ định vị van thông minh', 'Smart digital valve positioner'),
    summary: localized(
      'Bộ định vị kỹ thuật số hỗ trợ điều khiển chính xác và chẩn đoán tình trạng van.',
      'A digital positioner that supports precise control and valve condition diagnostics.',
    ),
    category: localized('Bộ định vị', 'Positioners'),
    image: '/images/products/svi-ii-ap.png',
    technicalBasis: {
      label: localized('Giao thức', 'Protocol'),
      values: [localized('HART hai chiều', 'Bidirectional HART')],
    },
    applications: [
      localized('Van điều khiển', 'Control valves'),
      localized('Chẩn đoán van', 'Valve diagnostics'),
      localized('Điều khiển quá trình', 'Process control'),
    ],
    highlights: [
      localized('Hiệu chỉnh và cài đặt số', 'Digital calibration and configuration'),
      localized('Hỗ trợ chẩn đoán tình trạng van', 'Supports valve condition diagnostics'),
      localized('Tích hợp vào hệ thống điều khiển', 'Integrates with process control systems'),
    ],
    specifications: [
      { label: localized('Thiết bị', 'Device'), value: localized('Bộ định vị van kỹ thuật số', 'Digital valve positioner') },
      { label: localized('Giao tiếp', 'Communication'), value: localized('HART', 'HART') },
      { label: localized('Lắp đặt', 'Installation'), value: localized('Trên bộ truyền động van', 'Mounted on the valve actuator') },
    ],
  },
  {
    slug: 'actuator-87-88',
    family: 'baker-hughes',
    brand: 'Masoneilan',
    model: '87/88 Series',
    name: localized('Bộ truyền động màng lò xo khí nén', 'Pneumatic spring-diaphragm actuator'),
    summary: localized(
      'Bộ truyền động tuyến tính cho van điều khiển Masoneilan với cấu hình tác động thuận hoặc nghịch.',
      'A linear actuator for Masoneilan control valves, available in direct- or reverse-acting configurations.',
    ),
    category: localized('Bộ truyền động', 'Actuators'),
    image: '/images/products/actuator-87-88.png',
    technicalBasis: {
      label: localized('Cấu hình tác động', 'Actuation configuration'),
      values: [localized('87: khí đóng', '87: air to close'), localized('88: khí mở', '88: air to open')],
    },
    applications: [
      localized('Van điều khiển tuyến tính', 'Linear control valves'),
      localized('Hệ thống khí nén', 'Pneumatic systems'),
    ],
    highlights: [
      localized('Cấu trúc màng lò xo', 'Spring-diaphragm construction'),
      localized('Dễ bảo trì và hiệu chỉnh', 'Easy to maintain and calibrate'),
      localized('Tương thích nhiều dòng van Masoneilan', 'Compatible with multiple Masoneilan valve series'),
    ],
    specifications: [
      { label: localized('Kiểu', 'Type'), value: localized('Bộ truyền động màng lò xo', 'Spring-diaphragm actuator') },
      { label: localized('Nguồn điều khiển', 'Control supply'), value: localized('Khí nén', 'Pneumatic') },
      { label: localized('Chuyển động', 'Motion'), value: localized('Tuyến tính', 'Linear') },
    ],
  },
  {
    slug: 'masoneilan-84000',
    family: 'baker-hughes',
    brand: 'Masoneilan',
    model: '84000 Series',
    name: localized('Van điều khiển cho ứng dụng hơi', 'Control valve for steam service'),
    summary: localized(
      'Van điều khiển được thiết kế cho các điều kiện hơi và chênh áp cao trong nhà máy công nghiệp.',
      'A control valve designed for steam service and high differential-pressure conditions in industrial plants.',
    ),
    category: localized('Van điều khiển', 'Control valves'),
    image: '/images/products/valve-84000.png',
    technicalBasis: {
      label: localized('Tiêu chuẩn', 'Standards'),
      values: [localized('ASME B16.34', 'ASME B16.34')],
    },
    applications: [
      localized('Hơi', 'Steam'),
      localized('Năng lượng', 'Power generation'),
      localized('Quá trình công nghiệp', 'Industrial processes'),
    ],
    highlights: [
      localized('Thiết kế cho điều kiện hơi', 'Designed for steam service'),
      localized('Kiểm soát dòng chảy ổn định', 'Stable flow control'),
      localized('Nhiều lựa chọn cấu hình', 'Multiple configuration options'),
    ],
    specifications: [
      { label: localized('Kiểu van', 'Valve type'), value: localized('Van điều khiển hơi', 'Steam control valve') },
      { label: localized('Thương hiệu', 'Brand'), value: localized('Masoneilan', 'Masoneilan') },
      { label: localized('Dịch vụ', 'Service'), value: localized('Hơi và môi chất nhiệt độ cao', 'Steam and high-temperature media') },
    ],
  },
  {
    slug: 'consolidated-2700',
    family: 'baker-hughes',
    brand: 'Consolidated',
    model: '2700 Series',
    name: localized('Van an toàn cho hệ thống CCGT', 'Safety valve for CCGT applications'),
    summary: localized(
      'Dòng van an toàn được thiết kế cho các hệ thống phát điện tuabin khí chu trình hỗn hợp và dịch vụ hơi.',
      'A safety valve series designed for combined-cycle gas turbine power systems and steam service.',
    ),
    category: localized('Van an toàn', 'Safety valves'),
    image: '/images/products/consolidated-2700-transparent.png',
    technicalBasis: {
      label: localized('Tiêu chuẩn', 'Standards'),
      values: [localized('ASME Section I', 'ASME Section I'), localized('ASME Section VIII', 'ASME Section VIII')],
    },
    applications: [
      localized('Hơi', 'Steam'),
      localized('Phát điện', 'Power generation'),
      localized('Hệ thống CCGT', 'CCGT systems'),
    ],
    highlights: [
      localized('Thiết kế bảo vệ quá áp', 'Designed for overpressure protection'),
      localized('Thiết kế hướng đến ứng dụng CCGT', 'Designed for CCGT applications'),
      localized('Cấu trúc lò xo cho dịch vụ hơi', 'Spring-loaded construction for steam service'),
    ],
    specifications: [
      { label: localized('Kiểu van', 'Valve type'), value: localized('Van an toàn lò xo', 'Spring-loaded safety valve') },
      { label: localized('Thương hiệu', 'Brand'), value: localized('Consolidated', 'Consolidated') },
      { label: localized('Ứng dụng chính', 'Primary application'), value: localized('Phát điện tuabin khí chu trình hỗn hợp', 'Combined-cycle gas turbine power generation') },
    ],
  },
  {
    slug: 'consolidated-1900',
    family: 'baker-hughes',
    brand: 'Consolidated',
    model: '1900/P Series',
    name: localized('Van an toàn và xả áp', 'Safety relief valve'),
    summary: localized(
      'Dòng van an toàn và xả áp cho ứng dụng hơi, nước bốc hơi và hơi hữu cơ theo ASME Section I.',
      'A safety relief valve series for steam, flashing water and organic vapor service under ASME Section I.',
    ),
    category: localized('Van an toàn', 'Safety valves'),
    image: '/images/products/consolidated-1900.png',
    technicalBasis: {
      label: localized('Tiêu chuẩn', 'Standards'),
      values: [localized('ASME Section I', 'ASME Section I')],
    },
    applications: [
      localized('Hơi', 'Steam'),
      localized('Nước bốc hơi', 'Flashing water'),
      localized('Hơi hữu cơ', 'Organic vapor service'),
    ],
    highlights: [
      localized('Đế Thermodisc hỗ trợ độ kín trong dịch vụ hơi', 'Thermodisc seat supports tightness in steam service'),
      localized('Có cấu hình thông thường và balanced bellows', 'Available in conventional and balanced-bellows configurations'),
      localized('Có cấu hình lò xo lộ thiên để làm mát', 'Available with an exposed-spring configuration for cooling'),
    ],
    specifications: [
      { label: localized('Kiểu van', 'Valve type'), value: localized('Van an toàn và xả áp', 'Safety relief valve') },
      { label: localized('Thương hiệu', 'Brand'), value: localized('Consolidated', 'Consolidated') },
      { label: localized('Lưu chất', 'Process media'), value: localized('Hơi, nước bốc hơi và hơi hữu cơ', 'Steam, flashing water and organic vapor') },
    ],
  },
  {
    slug: 'evt-pro',
    family: 'baker-hughes',
    brand: 'Consolidated',
    model: 'EVT-Pro',
    name: localized('Thiết bị kiểm tra van điện tử', 'Electronic valve tester'),
    summary: localized(
      'Thiết bị hỗ trợ kiểm tra áp suất cài đặt của van an toàn trong điều kiện lắp đặt thực tế.',
      'A device for checking safety valve set pressure under actual installed conditions.',
    ),
    category: localized('Thiết bị kiểm tra', 'Test equipment'),
    image: '/images/products/evt-pro.png',
    technicalBasis: {
      label: localized('Phương pháp kiểm tra', 'Test method'),
      values: [localized('Kiểm tra tại vị trí lắp đặt', 'In-situ valve testing')],
    },
    applications: [
      localized('Kiểm định van', 'Valve testing'),
      localized('Bảo trì nhà máy', 'Plant maintenance'),
      localized('Van an toàn', 'Safety valves'),
    ],
    highlights: [
      localized('Kiểm tra tại vị trí lắp đặt', 'Testing at the installed location'),
      localized('Giảm thời gian tháo lắp van', 'Reduces valve removal and reinstallation time'),
      localized('Hỗ trợ lưu và đánh giá kết quả', 'Supports result storage and evaluation'),
    ],
    specifications: [
      { label: localized('Thiết bị', 'Device'), value: localized('Thiết bị kiểm tra van điện tử', 'Electronic valve tester') },
      { label: localized('Ứng dụng', 'Application'), value: localized('Kiểm tra van an toàn tại chỗ', 'On-site safety valve testing') },
      { label: localized('Dữ liệu', 'Data'), value: localized('Ghi nhận kết quả điện tử', 'Electronic result recording') },
    ],
  },
]

export const newsItems: NewsItem[] = [
  {
    slug: 'ban-giao-pac-optidist-2',
    type: 'project',
    year: '2026',
    title: localized(
      'LT Việt Nam hoàn thành lắp đặt và bàn giao PAC OptiDist 2 tại Quatest 2',
      'LT Vietnam completes the installation and handover of PAC OptiDist 2 at Quatest 2',
    ),
    excerpt: localized(
      'Đội ngũ kỹ thuật hoàn thành lắp đặt, hướng dẫn vận hành và chuyển giao thiết bị chưng cất tự động.',
      'The technical team completed the installation, operating guidance and handover of the automatic distillation analyzer.',
    ),
    image: '/images/products/optidist-2-angle-official.png',
    imageFit: 'contain',
    relatedProduct: 'optidist',
    paragraphs: [
      localized(
        'Dự án tập trung vào việc đưa hệ thống chưng cất tự động vào vận hành ổn định tại phòng thí nghiệm của khách hàng.',
        'The project focused on bringing the automatic distillation system into stable operation in the customer\'s laboratory.',
      ),
      localized(
        'Phạm vi thực hiện gồm lắp đặt thiết bị, kiểm tra điều kiện vận hành, chạy thử và hướng dẫn người sử dụng.',
        'The scope included equipment installation, operating-condition checks, trial runs and user guidance.',
      ),
      localized(
        'Hồ sơ kỹ thuật và hướng dẫn vận hành được tập hợp để người sử dụng thuận tiện tra cứu sau bàn giao.',
        'Technical records and operating instructions were compiled for convenient reference after handover.',
      ),
    ],
  },
  {
    slug: 'hoi-thao-van-an-toan',
    type: 'event',
    year: '2019',
    title: localized(
      'LT Việt Nam phối hợp tổ chức hội thảo bảo dưỡng và kiểm định van an toàn',
      'LT Vietnam co-organizes a seminar on safety valve maintenance and inspection',
    ),
    excerpt: localized(
      'Hội thảo được tổ chức tại Hà Nội cùng Bộ Công Thương và Baker Hughes GE, với đại biểu từ hơn 20 nhà máy công nghiệp.',
      'The Hanoi seminar was organized with the Ministry of Industry and Trade and Baker Hughes GE, with delegates from more than 20 industrial plants.',
    ),
    image: '/images/news/safety-valve-seminar.jpg',
    paragraphs: [
      localized(
        'Cuối năm 2019 tại Hà Nội, Bộ Công Thương, LT Việt Nam và Baker Hughes GE phối hợp tổ chức hội thảo về bảo dưỡng và kiểm định van an toàn trong nhà máy công nghiệp.',
        'At the end of 2019 in Hanoi, the Ministry of Industry and Trade, LT Vietnam and Baker Hughes GE jointly organized a seminar on industrial safety valve maintenance and inspection.',
      ),
      localized(
        'Hội thảo do lãnh đạo Cục An toàn và Môi trường Công nghiệp chủ trì, với đại biểu đến từ hơn 20 nhà máy lọc dầu, nhiệt điện, phân bón và công nghiệp lớn.',
        'The seminar was chaired by the Industrial Safety and Environment Agency and attended by delegates from more than 20 major refining, power, fertilizer and industrial plants.',
      ),
      localized(
        'Các chuyên gia trình bày quy trình bảo dưỡng, sửa chữa và kiểm định van an toàn, đồng thời trao đổi kinh nghiệm vận hành trong những điều kiện làm việc khắc nghiệt.',
        'Experts presented safety valve maintenance, repair and inspection practices and exchanged operating experience for severe-service conditions.',
      ),
    ],
  },
  {
    slug: 'chuyen-giao-dfa-70xi',
    type: 'project',
    year: '2025',
    title: localized(
      'Chuyển giao thiết bị xác định điểm đông đặc Phase Technology 70Xi tại Skypec',
      'Handover of a Phase Technology 70Xi freezing point analyzer at Skypec',
    ),
    excerpt: localized(
      'LT Việt Nam hoàn thành giao hàng, lắp đặt, chạy thử và đào tạo chuyển giao công nghệ tại chi nhánh Skypec Hà Nội.',
      'LT Vietnam completed delivery, installation, commissioning and technology-transfer training at Skypec\'s Hanoi branch.',
    ),
    image: '/images/news/phase-dfa-70xi-transparent.png',
    imageFit: 'contain',
    paragraphs: [
      localized(
        'Trong hai ngày 7 và 8 tháng 7 năm 2025, đội ngũ LT Việt Nam triển khai thiết bị phân tích điểm đông đặc Phase Technology tại chi nhánh Hà Nội của Công ty Cổ phần Nhiên liệu bay Petrolimex (Skypec).',
        'On July 7 and 8, 2025, LT Vietnam deployed the Phase Technology freezing point analyzer at the Hanoi branch of Petrolimex Aviation Fuel Joint Stock Company (Skypec).',
      ),
      localized(
        'Phạm vi công việc gồm lắp đặt tại hiện trường, tích hợp, hiệu chuẩn, chạy thử và xác nhận khả năng hoạt động của thiết bị.',
        'The scope included on-site installation, integration, calibration, trial operation and performance verification.',
      ),
      localized(
        'Chương trình chuyển giao bao gồm đào tạo lý thuyết và thực hành, hướng dẫn bảo trì, xử lý sự cố và bàn giao tài liệu kỹ thuật cùng hướng dẫn sử dụng.',
        'The handover included theory and hands-on training, maintenance and troubleshooting guidance, plus technical documentation and operating manuals.',
      ),
    ],
  },
]

export const offices: Office[] = [
  {
    city: localized('Hà Nội', 'Hanoi'),
    label: localized('Trụ sở chính', 'Head office'),
    address: localized(
      'Tầng 7, Tòa nhà A-B, số 203 Nguyễn Huy Tưởng, phường Thanh Xuân, Hà Nội',
      '7th Floor, A-B Office Building, No. 203 Nguyen Huy Tuong, Thanh Xuan Ward, Hanoi, Vietnam',
    ),
    phone: '(84-24) 6650 6373',
    email: 'Sales@ltvietnam.com.vn',
  },
  {
    city: localized('TP. Hồ Chí Minh', 'Ho Chi Minh City'),
    label: localized('Văn phòng phía Nam', 'Southern office'),
    address: localized(
      'Tầng 2, Tòa nhà C.T, 56 Yên Thế, Quận Tân Bình, TP. Hồ Chí Minh',
      '2nd Floor, C.T Building, 56 Yen The Street, Tan Binh District, Ho Chi Minh City',
    ),
    phone: '(84-28) 983 870 357',
    email: 'Sales@ltvietnam.com.vn',
  },
  {
    city: localized('Quảng Ngãi', 'Quang Ngai'),
    label: localized('Văn phòng miền Trung', 'Central Vietnam office'),
    address: localized(
      'Không gian văn phòng - Khách sạn Hoàng Mai, đường Võ Văn Kiệt, thôn Đông Lỗ, xã Vạn Tường, tỉnh Quảng Ngãi',
      'Office Space - Hoang Mai Hotel, Vo Van Kiet Street, Dong Lo Village, Van Tuong Commune, Quang Ngai Province, Vietnam',
    ),
    email: 'Sales@ltvietnam.com.vn',
  },
]

export const getProductBySlug = (slug?: string) =>
  products.find((product) => product.slug === slug)

export const getNewsBySlug = (slug?: string) =>
  newsItems.find((item) => item.slug === slug)

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
  standards: string[]
  applications: LocalizedText[]
  highlights: LocalizedText[]
  specifications: Array<{ label: LocalizedText; value: LocalizedText }>
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
    standards: ['ASTM D86', 'ISO 3405', 'IP 123'],
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
    image: '/images/products/cid-510.png',
    standards: ['ASTM D7668'],
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
    standards: ['ASTM D445', 'ISO 3104'],
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
    standards: ['ASTM D93', 'ISO 2719'],
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
    standards: ['ASTM D1160'],
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
    standards: ['ASTM D5191'],
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
    image: '/images/products/valve-21000.jpg',
    standards: ['ASME B16.34'],
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
    standards: ['HART communication'],
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
    standards: ['Pneumatic actuation'],
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
    standards: ['ASME B16.34'],
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
    name: localized('Van an toàn cho ứng dụng công nghiệp', 'Industrial safety valve'),
    summary: localized(
      'Dòng van an toàn lò xo cho bảo vệ thiết bị và đường ống trong các hệ thống áp suất.',
      'A spring-loaded safety valve series for protecting equipment and piping in pressurized systems.',
    ),
    category: localized('Van an toàn', 'Safety valves'),
    image: '/images/products/consolidated-2700.png',
    standards: ['ASME Section VIII'],
    applications: [
      localized('Hơi', 'Steam'),
      localized('Khí', 'Gas'),
      localized('Thiết bị áp lực', 'Pressure equipment'),
    ],
    highlights: [
      localized('Thiết kế bảo vệ quá áp', 'Designed for overpressure protection'),
      localized('Nhiều lựa chọn vật liệu', 'Multiple material options'),
      localized('Phù hợp dịch vụ công nghiệp nặng', 'Suitable for heavy industrial service'),
    ],
    specifications: [
      { label: localized('Kiểu van', 'Valve type'), value: localized('Van an toàn lò xo', 'Spring-loaded safety valve') },
      { label: localized('Thương hiệu', 'Brand'), value: localized('Consolidated', 'Consolidated') },
      { label: localized('Chức năng', 'Function'), value: localized('Bảo vệ quá áp', 'Overpressure protection') },
    ],
  },
  {
    slug: 'consolidated-1900',
    family: 'baker-hughes',
    brand: 'Consolidated',
    model: '1900/P Series',
    name: localized('Van an toàn và xả áp', 'Safety relief valve'),
    summary: localized(
      'Van xả áp cho các ứng dụng khí, hơi và chất lỏng trong nhà máy lọc hóa dầu và hóa chất.',
      'A pressure relief valve for gas, steam and liquid applications in refining and chemical plants.',
    ),
    category: localized('Van an toàn', 'Safety valves'),
    image: '/images/products/consolidated-1900.png',
    standards: ['ASME Section VIII'],
    applications: [
      localized('Lọc hóa dầu', 'Refining and petrochemicals'),
      localized('Hóa chất', 'Chemical processing'),
      localized('Khí công nghệ', 'Process gas'),
    ],
    highlights: [
      localized('Dải ứng dụng rộng', 'Wide application range'),
      localized('Hỗ trợ nhiều loại lưu chất', 'Supports multiple process media'),
      localized('Thiết kế cho môi trường công nghiệp', 'Designed for industrial environments'),
    ],
    specifications: [
      { label: localized('Kiểu van', 'Valve type'), value: localized('Van an toàn và xả áp', 'Safety relief valve') },
      { label: localized('Thương hiệu', 'Brand'), value: localized('Consolidated', 'Consolidated') },
      { label: localized('Lưu chất', 'Process media'), value: localized('Khí, hơi và chất lỏng', 'Gas, steam and liquids') },
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
    standards: ['In-situ valve testing'],
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
    year: '2026',
    title: localized(
      'Hội thảo bảo dưỡng và kiểm định van an toàn trong nhà máy công nghiệp',
      'Seminar on industrial safety valve maintenance and inspection',
    ),
    excerpt: localized(
      'Chương trình trao đổi chuyên môn về vận hành, bảo dưỡng và đánh giá tình trạng van an toàn.',
      'A technical seminar on safety valve operation, maintenance and condition assessment.',
    ),
    image: '/images/news/safety-valve-seminar.jpg',
    relatedProduct: 'consolidated-2700',
    paragraphs: [
      localized(
        'Hội thảo cung cấp góc nhìn thực tế về yêu cầu kiểm tra và bảo dưỡng van an toàn trong các nhà máy công nghiệp.',
        'The seminar provided practical insight into safety valve inspection and maintenance requirements in industrial plants.',
      ),
      localized(
        'Các nội dung chính gồm nhận diện rủi ro, lập kế hoạch bảo trì và lựa chọn phương pháp kiểm tra phù hợp.',
        'Key topics included risk identification, maintenance planning and selection of suitable inspection methods.',
      ),
      localized(
        'Nội dung trao đổi được tổ chức theo nhu cầu vận hành, kiểm định và bảo trì thực tế tại nhà máy.',
        'The discussion was structured around actual plant operation, inspection and maintenance needs.',
      ),
    ],
  },
  {
    slug: 'chuyen-giao-dfa-70xi',
    type: 'project',
    year: '2026',
    title: localized(
      'Chuyển giao thiết bị xác định điểm đông đặc Phase Technology DFA-70Xi',
      'Handover of the Phase Technology DFA-70Xi freezing point analyzer',
    ),
    excerpt: localized(
      'Hoàn thành cung cấp và hướng dẫn sử dụng hệ thống phân tích tính chất lạnh của nhiên liệu.',
      'Completed the supply and user training for a fuel cold-flow property analysis system.',
    ),
    image: '/images/news/phase-dfa-70xi.jpg',
    imageFit: 'contain',
    paragraphs: [
      localized(
        'Đội ngũ kỹ thuật phối hợp cùng khách hàng kiểm tra cấu hình, điều kiện lắp đặt và chức năng của thiết bị.',
        'The technical team worked with the customer to verify the configuration, installation conditions and instrument functions.',
      ),
      localized(
        'Quá trình chuyển giao tập trung vào thao tác vận hành, chăm sóc thiết bị và xử lý các tình huống cơ bản.',
        'The handover focused on operation, instrument care and handling basic operating situations.',
      ),
      localized(
        'Sau phần hướng dẫn, người sử dụng có thể theo dõi quy trình đo và các bước kiểm tra thiết bị trước khi vận hành.',
        'After the training, users could follow the measurement procedure and pre-operation inspection steps.',
      ),
    ],
  },
]

export const offices = [
  {
    city: localized('Hà Nội', 'Hanoi'),
    label: localized('Trụ sở chính', 'Head office'),
    address: localized(
      'Tầng 7, Tòa nhà A-B, 203 Nguyễn Huy Tưởng, Thanh Xuân, Hà Nội',
      '7th Floor, A-B Building, 203 Nguyen Huy Tuong Street, Thanh Xuan District, Hanoi',
    ),
    phone: '(84-24) 6650 6373',
  },
  {
    city: localized('TP. Hồ Chí Minh', 'Ho Chi Minh City'),
    label: localized('Văn phòng phía Nam', 'Southern office'),
    address: localized(
      'Tầng 2, Tòa nhà C.T, 56 Yên Thế, Quận Tân Bình, TP. Hồ Chí Minh',
      '2nd Floor, C.T Building, 56 Yen The Street, Tan Binh District, Ho Chi Minh City',
    ),
    phone: '(84-28) 983 870 357',
  },
  {
    city: localized('Quảng Ngãi', 'Quang Ngai'),
    label: localized('Văn phòng miền Trung', 'Central Vietnam office'),
    address: localized(
      'Đường Võ Văn Kiệt, xã Vạn Tường, tỉnh Quảng Ngãi',
      'Vo Van Kiet Street, Van Tuong Commune, Quang Ngai Province',
    ),
    phone: '(84-24) 6650 6373',
  },
]

export const getProductBySlug = (slug?: string) =>
  products.find((product) => product.slug === slug)

export const getNewsBySlug = (slug?: string) =>
  newsItems.find((item) => item.slug === slug)

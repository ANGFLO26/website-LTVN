export type ProductFamily = 'pac' | 'baker-hughes'

export type Product = {
  slug: string
  family: ProductFamily
  brand: string
  model: string
  name: string
  summary: string
  category: string
  image: string
  standards: string[]
  applications: string[]
  highlights: string[]
  specifications: Array<{ label: string; value: string }>
}

export type NewsItem = {
  slug: string
  type: 'Tin tức' | 'Sự kiện' | 'Dự án'
  year: string
  title: string
  excerpt: string
  image: string
  imageFit?: 'cover' | 'contain'
  relatedProduct?: string
  paragraphs: string[]
}

export const products: Product[] = [
  {
    slug: 'optidist',
    family: 'pac',
    brand: 'PAC',
    model: 'OptiDist 2',
    name: 'Thiết bị chưng cất khí quyển tự động',
    summary:
      'Hệ thống chưng cất tự động cho xăng, diesel và nhiên liệu hàng không, hỗ trợ kiểm soát tốc độ chưng cất ổn định.',
    category: 'Chưng cất',
    image: '/images/products/optidist-2-official.png',
    standards: ['ASTM D86', 'ISO 3405', 'IP 123'],
    applications: ['Xăng', 'Diesel', 'Nhiên liệu hàng không'],
    highlights: [
      'Vận hành tự động với giao diện trực quan',
      'Kiểm soát tốc độ chưng cất trong suốt phép thử',
      'Giảm thao tác cài đặt nhiệt thủ công',
    ],
    specifications: [
      { label: 'Phương pháp', value: 'Chưng cất khí quyển tự động' },
      { label: 'Mẫu thử', value: 'Sản phẩm dầu mỏ và nhiên liệu' },
      { label: 'Điều khiển', value: 'Màn hình cảm ứng tích hợp' },
    ],
  },
  {
    slug: 'cid-510',
    family: 'pac',
    brand: 'Herzog',
    model: 'CID 510',
    name: 'Thiết bị xác định trị số cetane dẫn xuất',
    summary:
      'Phân tích chất lượng cháy của nhiên liệu diesel thông qua phép đo thời gian trễ đánh lửa.',
    category: 'Chỉ số cetane',
    image: '/images/products/cid-510.png',
    standards: ['ASTM D7668'],
    applications: ['Diesel', 'Nhiên liệu sinh học'],
    highlights: [
      'Thời gian phân tích ngắn',
      'Lượng mẫu nhỏ',
      'Phù hợp phòng thí nghiệm kiểm soát chất lượng',
    ],
    specifications: [
      { label: 'Kết quả', value: 'Derived Cetane Number' },
      { label: 'Phương pháp', value: 'Constant volume combustion chamber' },
      { label: 'Ứng dụng', value: 'Kiểm soát chất lượng nhiên liệu diesel' },
    ],
  },
  {
    slug: 'hvm-472',
    family: 'pac',
    brand: 'Herzog',
    model: 'HVM 472',
    name: 'Thiết bị đo độ nhớt động học tự động',
    summary:
      'Hệ thống đo độ nhớt đa dải, hỗ trợ tự động hóa quy trình phân tích sản phẩm dầu mỏ.',
    category: 'Độ nhớt',
    image: '/images/products/hvm-472.jpg',
    standards: ['ASTM D445', 'ISO 3104'],
    applications: ['Dầu nhờn', 'Nhiên liệu', 'Sản phẩm dầu mỏ'],
    highlights: [
      'Đo tự động nhiều dải độ nhớt',
      'Giảm thời gian thao tác của kỹ thuật viên',
      'Quản lý kết quả trên giao diện tích hợp',
    ],
    specifications: [
      { label: 'Đại lượng', value: 'Độ nhớt động học' },
      { label: 'Phương pháp', value: 'Ống mao quản tự động' },
      { label: 'Điều khiển nhiệt', value: 'Bể ổn nhiệt tích hợp' },
    ],
  },
  {
    slug: 'optiflash-pensky-martens',
    family: 'pac',
    brand: 'Herzog',
    model: 'OptiFlash',
    name: 'Thiết bị đo điểm chớp cháy cốc kín Pensky-Martens',
    summary:
      'Thiết bị tự động xác định điểm chớp cháy cho nhiên liệu, dầu nhờn và các sản phẩm dầu mỏ.',
    category: 'Điểm chớp cháy',
    image: '/images/products/optiflash.jpg',
    standards: ['ASTM D93', 'ISO 2719'],
    applications: ['Dầu nhờn', 'Diesel', 'Sản phẩm dầu mỏ'],
    highlights: [
      'Nhận biết điểm chớp cháy tự động',
      'Kiểm soát gia nhiệt chính xác',
      'Hỗ trợ quy trình an toàn trong phòng thí nghiệm',
    ],
    specifications: [
      { label: 'Cốc thử', value: 'Pensky-Martens cốc kín' },
      { label: 'Đánh lửa', value: 'Tự động' },
      { label: 'Hiển thị', value: 'Màn hình điều khiển tích hợp' },
    ],
  },
  {
    slug: 'hdv-632',
    family: 'pac',
    brand: 'Herzog',
    model: 'HDV 632',
    name: 'Thiết bị chưng cất tự động ở áp suất chân không',
    summary:
      'Giải pháp chưng cất chân không cho các sản phẩm dầu mỏ có nhiệt độ sôi cao.',
    category: 'Chưng cất',
    image: '/images/products/hdv-632.jpg',
    standards: ['ASTM D1160'],
    applications: ['Dầu nặng', 'Dầu nhờn', 'Phân đoạn chân không'],
    highlights: [
      'Kiểm soát áp suất chân không',
      'Tự động ghi nhận nhiệt độ và thể tích',
      'Thiết kế phù hợp phòng thí nghiệm công nghiệp',
    ],
    specifications: [
      { label: 'Phương pháp', value: 'Chưng cất chân không' },
      { label: 'Điều khiển áp suất', value: 'Tự động' },
      { label: 'Dữ liệu', value: 'Ghi nhận và xuất báo cáo' },
    ],
  },
  {
    slug: 'hvp-972',
    family: 'pac',
    brand: 'Herzog',
    model: 'HVP 972',
    name: 'Thiết bị đo áp suất hơi bão hòa tự động',
    summary:
      'Phân tích áp suất hơi của xăng và sản phẩm dầu mỏ trong quy trình kiểm soát chất lượng.',
    category: 'Áp suất hơi',
    image: '/images/products/hvp-972.jpg',
    standards: ['ASTM D5191'],
    applications: ['Xăng', 'Nhiên liệu', 'Dung môi nhẹ'],
    highlights: [
      'Chuẩn bị mẫu đơn giản',
      'Điều khiển nhiệt độ tự động',
      'Kết quả nhanh và dễ theo dõi',
    ],
    specifications: [
      { label: 'Đại lượng', value: 'Áp suất hơi' },
      { label: 'Mẫu thử', value: 'Xăng và sản phẩm nhẹ' },
      { label: 'Vận hành', value: 'Tự động' },
    ],
  },
  {
    slug: 'masoneilan-21000',
    family: 'baker-hughes',
    brand: 'Masoneilan',
    model: '21000 Series',
    name: 'Van điều khiển globe hiệu suất cao',
    summary:
      'Dòng van điều khiển đa dụng cho các ứng dụng chất lỏng, khí và hơi trong nhà máy công nghiệp.',
    category: 'Van điều khiển',
    image: '/images/products/valve-21000.jpg',
    standards: ['ASME B16.34'],
    applications: ['Hơi', 'Khí', 'Chất lỏng công nghệ'],
    highlights: [
      'Cấu trúc thân van globe',
      'Nhiều lựa chọn trim và vật liệu',
      'Phù hợp nhiều điều kiện công nghệ',
    ],
    specifications: [
      { label: 'Kiểu van', value: 'Globe control valve' },
      { label: 'Thương hiệu', value: 'Masoneilan' },
      { label: 'Ứng dụng', value: 'Điều khiển lưu lượng và áp suất' },
    ],
  },
  {
    slug: 'svi-ii-ap',
    family: 'baker-hughes',
    brand: 'Masoneilan',
    model: 'SVI II AP',
    name: 'Bộ định vị van thông minh',
    summary:
      'Bộ định vị kỹ thuật số hỗ trợ điều khiển chính xác và chẩn đoán tình trạng van.',
    category: 'Bộ định vị',
    image: '/images/products/svi-ii-ap.png',
    standards: ['HART communication'],
    applications: ['Van điều khiển', 'Chẩn đoán van', 'Điều khiển quá trình'],
    highlights: [
      'Hiệu chỉnh và cài đặt số',
      'Hỗ trợ chẩn đoán tình trạng van',
      'Tích hợp vào hệ thống điều khiển',
    ],
    specifications: [
      { label: 'Thiết bị', value: 'Digital valve positioner' },
      { label: 'Giao tiếp', value: 'HART' },
      { label: 'Lắp đặt', value: 'Trên bộ truyền động van' },
    ],
  },
  {
    slug: 'actuator-87-88',
    family: 'baker-hughes',
    brand: 'Masoneilan',
    model: '87/88 Series',
    name: 'Bộ truyền động màng lò xo khí nén',
    summary:
      'Bộ truyền động tuyến tính cho van điều khiển Masoneilan với cấu hình tác động thuận hoặc nghịch.',
    category: 'Bộ truyền động',
    image: '/images/products/actuator-87-88.png',
    standards: ['Pneumatic actuation'],
    applications: ['Van điều khiển tuyến tính', 'Hệ thống khí nén'],
    highlights: [
      'Cấu trúc màng lò xo',
      'Dễ bảo trì và hiệu chỉnh',
      'Tương thích nhiều dòng van Masoneilan',
    ],
    specifications: [
      { label: 'Kiểu', value: 'Spring diaphragm actuator' },
      { label: 'Nguồn điều khiển', value: 'Khí nén' },
      { label: 'Chuyển động', value: 'Tuyến tính' },
    ],
  },
  {
    slug: 'masoneilan-84000',
    family: 'baker-hughes',
    brand: 'Masoneilan',
    model: '84000 Series',
    name: 'Van điều khiển cho ứng dụng hơi',
    summary:
      'Van điều khiển được thiết kế cho các điều kiện hơi và chênh áp cao trong nhà máy công nghiệp.',
    category: 'Van điều khiển',
    image: '/images/products/valve-84000.png',
    standards: ['ASME B16.34'],
    applications: ['Hơi', 'Năng lượng', 'Quá trình công nghiệp'],
    highlights: [
      'Thiết kế cho điều kiện hơi',
      'Kiểm soát dòng chảy ổn định',
      'Nhiều lựa chọn cấu hình',
    ],
    specifications: [
      { label: 'Kiểu van', value: 'Steam control valve' },
      { label: 'Thương hiệu', value: 'Masoneilan' },
      { label: 'Dịch vụ', value: 'Hơi và môi chất nhiệt độ cao' },
    ],
  },
  {
    slug: 'consolidated-2700',
    family: 'baker-hughes',
    brand: 'Consolidated',
    model: '2700 Series',
    name: 'Van an toàn cho ứng dụng công nghiệp',
    summary:
      'Dòng van an toàn lò xo cho bảo vệ thiết bị và đường ống trong các hệ thống áp suất.',
    category: 'Van an toàn',
    image: '/images/products/consolidated-2700.png',
    standards: ['ASME Section VIII'],
    applications: ['Hơi', 'Khí', 'Thiết bị áp lực'],
    highlights: [
      'Thiết kế bảo vệ quá áp',
      'Nhiều lựa chọn vật liệu',
      'Phù hợp dịch vụ công nghiệp nặng',
    ],
    specifications: [
      { label: 'Kiểu van', value: 'Spring-loaded safety valve' },
      { label: 'Thương hiệu', value: 'Consolidated' },
      { label: 'Chức năng', value: 'Bảo vệ quá áp' },
    ],
  },
  {
    slug: 'consolidated-1900',
    family: 'baker-hughes',
    brand: 'Consolidated',
    model: '1900/P Series',
    name: 'Van an toàn và xả áp',
    summary:
      'Van xả áp cho các ứng dụng khí, hơi và chất lỏng trong nhà máy lọc hóa dầu và hóa chất.',
    category: 'Van an toàn',
    image: '/images/products/consolidated-1900.png',
    standards: ['ASME Section VIII'],
    applications: ['Lọc hóa dầu', 'Hóa chất', 'Khí công nghệ'],
    highlights: [
      'Dải ứng dụng rộng',
      'Hỗ trợ nhiều loại lưu chất',
      'Thiết kế cho môi trường công nghiệp',
    ],
    specifications: [
      { label: 'Kiểu van', value: 'Safety relief valve' },
      { label: 'Thương hiệu', value: 'Consolidated' },
      { label: 'Lưu chất', value: 'Khí, hơi và chất lỏng' },
    ],
  },
  {
    slug: 'evt-pro',
    family: 'baker-hughes',
    brand: 'Consolidated',
    model: 'EVT-Pro',
    name: 'Thiết bị kiểm tra van điện tử',
    summary:
      'Thiết bị hỗ trợ kiểm tra áp suất cài đặt của van an toàn trong điều kiện lắp đặt thực tế.',
    category: 'Thiết bị kiểm tra',
    image: '/images/products/evt-pro.png',
    standards: ['In-situ valve testing'],
    applications: ['Kiểm định van', 'Bảo trì nhà máy', 'Van an toàn'],
    highlights: [
      'Kiểm tra tại vị trí lắp đặt',
      'Giảm thời gian tháo lắp van',
      'Hỗ trợ lưu và đánh giá kết quả',
    ],
    specifications: [
      { label: 'Thiết bị', value: 'Electronic valve tester' },
      { label: 'Ứng dụng', value: 'Kiểm tra van an toàn tại chỗ' },
      { label: 'Dữ liệu', value: 'Ghi nhận kết quả điện tử' },
    ],
  },
]

export const newsItems: NewsItem[] = [
  {
    slug: 'ban-giao-pac-optidist-2',
    type: 'Dự án',
    year: '2026',
    title: 'LT Việt Nam hoàn thành lắp đặt và bàn giao PAC OptiDist 2 tại Quatest 2',
    excerpt:
      'Đội ngũ kỹ thuật hoàn thành lắp đặt, hướng dẫn vận hành và chuyển giao thiết bị chưng cất tự động.',
    image: '/images/products/optidist-2-angle-official.png',
    imageFit: 'contain',
    relatedProduct: 'optidist',
    paragraphs: [
      'Dự án tập trung vào việc đưa hệ thống chưng cất tự động vào vận hành ổn định tại phòng thí nghiệm của khách hàng.',
      'Phạm vi thực hiện gồm lắp đặt thiết bị, kiểm tra điều kiện vận hành, chạy thử và hướng dẫn người sử dụng.',
      'Hồ sơ kỹ thuật và hướng dẫn vận hành được tập hợp để người sử dụng thuận tiện tra cứu sau bàn giao.',
    ],
  },
  {
    slug: 'hoi-thao-van-an-toan',
    type: 'Sự kiện',
    year: '2026',
    title: 'Hội thảo bảo dưỡng và kiểm định van an toàn trong nhà máy công nghiệp',
    excerpt:
      'Chương trình trao đổi chuyên môn về vận hành, bảo dưỡng và đánh giá tình trạng van an toàn.',
    image: '/images/news/safety-valve-seminar.jpg',
    relatedProduct: 'consolidated-2700',
    paragraphs: [
      'Hội thảo cung cấp góc nhìn thực tế về yêu cầu kiểm tra và bảo dưỡng van an toàn trong các nhà máy công nghiệp.',
      'Các nội dung chính gồm nhận diện rủi ro, lập kế hoạch bảo trì và lựa chọn phương pháp kiểm tra phù hợp.',
      'Nội dung trao đổi được tổ chức theo nhu cầu vận hành, kiểm định và bảo trì thực tế tại nhà máy.',
    ],
  },
  {
    slug: 'chuyen-giao-dfa-70xi',
    type: 'Dự án',
    year: '2026',
    title: 'Chuyển giao thiết bị xác định điểm đông đặc Phase Technology DFA-70Xi',
    excerpt:
      'Hoàn thành cung cấp và hướng dẫn sử dụng hệ thống phân tích tính chất lạnh của nhiên liệu.',
    image: '/images/news/phase-dfa-70xi.jpg',
    imageFit: 'contain',
    paragraphs: [
      'Đội ngũ kỹ thuật phối hợp cùng khách hàng kiểm tra cấu hình, điều kiện lắp đặt và chức năng của thiết bị.',
      'Quá trình chuyển giao tập trung vào thao tác vận hành, chăm sóc thiết bị và xử lý các tình huống cơ bản.',
      'Sau phần hướng dẫn, người sử dụng có thể theo dõi quy trình đo và các bước kiểm tra thiết bị trước khi vận hành.',
    ],
  },
]

export const offices = [
  {
    city: 'Hà Nội',
    label: 'Trụ sở chính',
    address: 'Tầng 7, Tòa nhà A-B, 203 Nguyễn Huy Tưởng, Thanh Xuân, Hà Nội',
    phone: '(84-24) 6650 6373',
  },
  {
    city: 'TP. Hồ Chí Minh',
    label: 'Văn phòng phía Nam',
    address: 'Tầng 2, Tòa nhà C.T, 56 Yên Thế, Quận Tân Bình, TP. Hồ Chí Minh',
    phone: '(84-28) 983 870 357',
  },
  {
    city: 'Quảng Ngãi',
    label: 'Văn phòng miền Trung',
    address: 'Đường Võ Văn Kiệt, xã Vạn Tường, tỉnh Quảng Ngãi',
    phone: '(84-24) 6650 6373',
  },
]

export const getProductBySlug = (slug?: string) =>
  products.find((product) => product.slug === slug)

export const getNewsBySlug = (slug?: string) =>
  newsItems.find((item) => item.slug === slug)

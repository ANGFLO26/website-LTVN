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
  nextAction?: {
    eyebrow: LocalizedText
    title: LocalizedText
    description: LocalizedText
    label: LocalizedText
    to: string
  }
  paragraphs: LocalizedText[]
}

export const newsTypeLabels: Record<NewsType, LocalizedText> = {
  news: localized('Tin tức', 'News'),
  event: localized('Sự kiện', 'Events'),
  project: localized('Dự án', 'Projects'),
}

// Cleaned up: Machines and News items are dynamically served from PostgreSQL Database
export const products: Product[] = []
export const newsItems: NewsItem[] = []

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

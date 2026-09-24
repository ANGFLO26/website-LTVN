// oxlint-disable react/only-export-components, react/set-state-in-effect -- Provider and its hook share private context; async data hydration
import { createContext, useContext, useEffect, useState, useCallback, useMemo, type ReactNode } from 'react'
import {
  products as defaultProducts,
  newsItems as defaultNewsItems,
  getProductBySlug as getStaticProductBySlug,
  getNewsBySlug as getStaticNewsBySlug,
  type Product,
  type NewsItem,
  type LocalizedText,
  type ProductFamily,
  type NewsType,
} from '../data'
import { autoLocalized } from '../services/translator'

// API response types matching NestJS Drizzle endpoints
export interface ApiMachine {
  id: string
  name: string
  slug: string
  model?: string | null
  shortDescription?: string | null
  description?: string | null
  mainImageId?: string | null
  status: 'draft' | 'published' | 'archived'
  sortOrder: number
  publishedAt?: string | null
  mainImage?: {
    publicUrl: string
    altText?: string | null
  } | null
  specs?: Array<{
    groupName: string
    specName: string
    specValue: string
    unit?: string | null
    sortOrder: number
  }>
  applications?: Array<{
    title: string
    description?: string | null
    sortOrder: number
  }>
  highlights?: Array<{
    title: string
    description?: string | null
    icon?: string | null
    sortOrder: number
  }>
  standards?: Array<{
    note?: string | null
    standard?: {
      code: string
      title?: string | null
    } | null
  }>
}

export interface ApiNewsEvent {
  id: string
  type: string
  title: string
  slug: string
  shortDescription?: string | null
  thumbnailImageId?: string | null
  status: 'draft' | 'published' | 'archived'
  publishedAt?: string | null
  createdAt: string
  thumbnailImage?: {
    publicUrl: string
    altText?: string | null
  } | null
  content?: {
    version: number
    blocks: Array<{
      type: string
      data: Record<string, unknown>
    }>
  } | null
}

interface DataContextType {
  products: Product[]
  newsItems: NewsItem[]
  loading: boolean
  isLive: boolean
  getProductBySlug: (slug?: string) => Product | undefined
  getNewsBySlug: (slug?: string) => NewsItem | undefined
  refreshData: () => Promise<void>
}

export const DataContext = createContext<DataContextType>({
  products: defaultProducts,
  newsItems: defaultNewsItems,
  loading: false,
  isLive: false,
  getProductBySlug: getStaticProductBySlug,
  getNewsBySlug: getStaticNewsBySlug,
  refreshData: async () => {},
})

function adaptMachineToProduct(m: ApiMachine): Product {
  const isBaker =
    m.slug.startsWith('masoneilan') ||
    m.slug.startsWith('consolidated') ||
    m.slug === 'svi-ii-ap' ||
    m.slug === 'actuator-87-88' ||
    m.slug === 'evt-pro'

  const family: ProductFamily = isBaker ? 'baker-hughes' : 'pac'

  let brand = ''
  if (m.model?.includes('Consolidated')) brand = 'Consolidated'
  else if (m.model?.includes('Masoneilan')) brand = 'Masoneilan'
  else if (m.model?.includes('Herzog') || m.name?.includes('Herzog')) brand = 'Herzog'
  else if (m.model?.includes('ISL') || m.name?.includes('ISL')) brand = 'ISL'
  else brand = 'PAC'

  let categoryName = 'Thiết bị chuyên dụng'
  if (m.name.includes('Chưng cất') || m.slug.includes('dist') || m.slug.includes('hdv')) categoryName = 'Chưng cất'
  else if (m.name.includes('chớp cháy') || m.slug.includes('flash')) categoryName = 'Điểm chớp cháy'
  else if (m.name.includes('độ nhớt') || m.slug.includes('hvm')) categoryName = 'Độ nhớt'
  else if (m.name.includes('áp suất hơi') || m.slug.includes('hvp')) categoryName = 'Áp suất hơi'
  else if (m.name.includes('cetane') || m.slug.includes('cid')) categoryName = 'Số Cetane'
  else if (m.name.includes('Van điều khiển') || m.slug.includes('valve-21000') || m.slug.includes('valve-84000') || m.slug.includes('valve-41005')) categoryName = 'Van điều khiển'
  else if (m.name.includes('định vị') || m.slug.includes('svi')) categoryName = 'Bộ định vị'
  else if (m.name.includes('chấp hành') || m.slug.includes('actuator')) categoryName = 'Cơ cấu chấp hành'
  else if (m.name.includes('Van an toàn') || m.slug.includes('consolidated')) categoryName = 'Van an toàn'
  else if (m.name.includes('kiểm tra van') || m.slug.includes('evt')) categoryName = 'Thiết bị kiểm tra van'

  const category = autoLocalized(categoryName)
  const image = m.mainImage?.publicUrl || `/images/products/${m.slug}.png`

  // Applications
  const applications: LocalizedText[] =
    m.applications && m.applications.length > 0
      ? m.applications.map((app) => autoLocalized(app.title))
      : []

  // Highlights
  const highlights: LocalizedText[] =
    m.highlights && m.highlights.length > 0
      ? m.highlights.map((hl) => autoLocalized(hl.title))
      : []

  // Specs
  const specifications =
    m.specs && m.specs.length > 0
      ? m.specs.map((s) => {
          const valText = s.specValue + (s.unit ? ' ' + s.unit : '')
          return {
            label: autoLocalized(s.specName),
            value: autoLocalized(valText),
          }
        })
      : []

  // Technical Basis / Standards
  const technicalBasis =
    m.standards && m.standards.length > 0
      ? {
          label: autoLocalized('Tiêu chuẩn'),
          values: m.standards.map((st) => {
            const code = st.standard?.code || st.note || ''
            return autoLocalized(code)
          }),
        }
      : { label: autoLocalized('Tiêu chuẩn'), values: [] }

  return {
    slug: m.slug,
    family,
    brand,
    model: m.model || m.slug,
    name: autoLocalized(m.name),
    summary: autoLocalized(m.shortDescription || m.description || ''),
    category,
    image,
    technicalBasis,
    applications,
    highlights,
    specifications,
  }
}

function adaptNewsToItem(n: ApiNewsEvent): NewsItem {
  const image = n.thumbnailImage?.publicUrl || (
    n.slug === 'chuyen-giao-dfa-70xi'
      ? '/images/news/phase-dfa-70xi-transparent.png'
      : '/images/hero/portfolio-hero-v5.png'
  )
  const year = n.publishedAt
    ? new Date(n.publishedAt).getFullYear().toString()
    : new Date(n.createdAt).getFullYear().toString()

  let paragraphs: LocalizedText[] = []
  if (n.content && n.content.blocks && Array.isArray(n.content.blocks)) {
    const pBlocks = n.content.blocks.filter((b) => b.type === 'paragraph' && b.data?.text)
    if (pBlocks.length > 0) {
      paragraphs = pBlocks.map((b) => autoLocalized(String(b.data.text)))
    }
  }

  let nextAction: NewsItem['nextAction'] = undefined
  let relatedProduct: string | undefined = undefined

  if (n.slug === 'ban-giao-pac-optidist-2') {
    relatedProduct = 'optidist'
  } else if (n.slug === 'hoi-thao-van-an-toan') {
    nextAction = {
      eyebrow: autoLocalized('GIẢI PHÁP LIÊN QUAN'),
      title: autoLocalized('Tìm hiểu giải pháp van an toàn cho nhà máy'),
      description: autoLocalized(
        'Xem danh mục van an toàn Consolidated và các thiết bị hỗ trợ vận hành hiện có trên website.',
      ),
      label: autoLocalized('Xem giải pháp van Baker Hughes'),
      to: '/baker-hughes',
    }
  } else if (n.slug === 'chuyen-giao-dfa-70xi') {
    nextAction = {
      eyebrow: autoLocalized('TRAO ĐỔI THEO ỨNG DỤNG'),
      title: autoLocalized('Bạn đang cần thiết bị xác định điểm đông đặc?'),
      description: autoLocalized(
        'Chia sẻ loại mẫu, phương pháp hoặc tiêu chuẩn áp dụng để đội ngũ kỹ thuật tiếp nhận đúng nhu cầu.',
      ),
      label: autoLocalized('Trao đổi về ứng dụng này'),
      to: '/lien-he?chu-de=phase-70xi',
    }
  }

  const type: NewsType =
    n.slug === 'ban-giao-pac-optidist-2' || n.slug === 'chuyen-giao-dfa-70xi'
      ? 'project'
      : (n.type as NewsType) || 'news'

  return {
    slug: n.slug,
    type,
    year,
    title: autoLocalized(n.title),
    excerpt: autoLocalized(n.shortDescription || ''),
    image,
    imageFit: n.slug === 'chuyen-giao-dfa-70xi' ? 'contain' : 'cover',
    relatedProduct,
    nextAction,
    paragraphs,
  }
}

export function DataProvider({ children }: { children: ReactNode }) {
  const [products, setProducts] = useState<Product[]>(defaultProducts)
  const [newsItems, setNewsItems] = useState<NewsItem[]>(defaultNewsItems)
  const [loading, setLoading] = useState(true)
  const [isLive, setIsLive] = useState(false)

  const fetchData = useCallback(async () => {
    try {
      const [machinesRes, newsRes] = await Promise.all([
        fetch('/api/machines', { signal: AbortSignal.timeout(4000) }).catch(() => null),
        fetch('/api/news-events', { signal: AbortSignal.timeout(4000) }).catch(() => null),
      ])

      let hasLiveData = false

      if (machinesRes && machinesRes.ok) {
        const machinesData = (await machinesRes.json()) as ApiMachine[]
        if (Array.isArray(machinesData) && machinesData.length > 0) {
          const published = machinesData.filter((m) => m.status === 'published')
          const adaptedProducts = published.map(adaptMachineToProduct)
          setProducts(adaptedProducts)
          hasLiveData = true
        }
      }

      if (newsRes && newsRes.ok) {
        const newsData = (await newsRes.json()) as ApiNewsEvent[]
        if (Array.isArray(newsData) && newsData.length > 0) {
          const published = newsData.filter((n) => n.status === 'published')
          const adaptedNews = published.map(adaptNewsToItem)
          setNewsItems(adaptedNews)
          hasLiveData = true
        }
      }

      setIsLive(hasLiveData)
    } catch (err) {
      console.warn('[SiteData] Backend offline or slow:', err)
      setIsLive(false)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchData()

    // Real-time auto-revalidation when user switches tabs (e.g. from Admin tab back to Website)
    const handleFocus = () => {
      fetchData()
    }
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        fetchData()
      }
    }

    window.addEventListener('focus', handleFocus)
    document.addEventListener('visibilitychange', handleVisibilityChange)

    return () => {
      window.removeEventListener('focus', handleFocus)
      document.removeEventListener('visibilitychange', handleVisibilityChange)
    }
  }, [fetchData])

  const getProductBySlug = useCallback(
    (slug?: string) => {
      if (!slug) return undefined
      return products.find((p) => p.slug === slug) || getStaticProductBySlug(slug)
    },
    [products],
  )

  const getNewsBySlug = useCallback(
    (slug?: string) => {
      if (!slug) return undefined
      return newsItems.find((n) => n.slug === slug) || getStaticNewsBySlug(slug)
    },
    [newsItems],
  )

  const contextValue = useMemo(
    () => ({
      products,
      newsItems,
      loading,
      isLive,
      getProductBySlug,
      getNewsBySlug,
      refreshData: fetchData,
    }),
    [products, newsItems, loading, isLive, getProductBySlug, getNewsBySlug, fetchData],
  )

  return <DataContext.Provider value={contextValue}>{children}</DataContext.Provider>
}

export function useSiteData() {
  return useContext(DataContext)
}

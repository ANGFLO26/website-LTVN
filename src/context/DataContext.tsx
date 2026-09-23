// oxlint-disable react/only-export-components, react/set-state-in-effect -- Provider and its hook share private context; async data hydration
import { createContext, useContext, useEffect, useState, useCallback, useMemo, type ReactNode } from 'react'
import {
  products as defaultProducts,
  newsItems as defaultNewsItems,
  getProductBySlug as getStaticProductBySlug,
  getNewsBySlug as getStaticNewsBySlug,
  localized,
  type Product,
  type NewsItem,
  type LocalizedText,
  type ProductFamily,
  type NewsType,
} from '../data'

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

function adaptMachineToProduct(m: ApiMachine, staticMap: Map<string, Product>): Product {
  const staticProduct = staticMap.get(m.slug)
  const isBaker =
    m.slug.startsWith('masoneilan') ||
    m.slug.startsWith('consolidated') ||
    m.slug === 'svi-ii-ap' ||
    m.slug === 'actuator-87-88' ||
    m.slug === 'evt-pro'

  const family: ProductFamily = staticProduct?.family || (isBaker ? 'baker-hughes' : 'pac')

  let brand = staticProduct?.brand || ''
  if (!brand) {
    if (m.model?.includes('Consolidated')) brand = 'Consolidated'
    else if (m.model?.includes('Masoneilan')) brand = 'Masoneilan'
    else if (m.model?.includes('Herzog') || m.name?.includes('Herzog')) brand = 'Herzog'
    else brand = 'PAC'
  }

  const category = staticProduct?.category || localized('Thiết bị chuyên dụng', 'Specialized Equipment')
  const image = m.mainImage?.publicUrl || staticProduct?.image || '/images/products/optidist-2-official.png'

  // Applications
  const applications: LocalizedText[] =
    m.applications && m.applications.length > 0
      ? m.applications.map((app) => {
          const staticApp = staticProduct?.applications.find((a) => a.vi === app.title)
          return staticApp || localized(app.title, app.description || app.title)
        })
      : staticProduct?.applications || []

  // Highlights
  const highlights: LocalizedText[] =
    m.highlights && m.highlights.length > 0
      ? m.highlights.map((hl) => {
          const staticHl = staticProduct?.highlights.find((h) => h.vi === hl.title)
          return staticHl || localized(hl.title, hl.description || hl.title)
        })
      : staticProduct?.highlights || []

  // Specs
  const specifications =
    m.specs && m.specs.length > 0
      ? m.specs.map((s) => {
          const staticSpec = staticProduct?.specifications.find((sp) => sp.label.vi === s.specName)
          const valText = s.specValue + (s.unit ? ' ' + s.unit : '')
          return {
            label: staticSpec?.label || localized(s.specName, s.specName),
            value: staticSpec?.value || localized(valText, valText),
          }
        })
      : staticProduct?.specifications || []

  // Technical Basis / Standards
  const technicalBasis =
    m.standards && m.standards.length > 0
      ? {
          label: staticProduct?.technicalBasis?.label || localized('Tiêu chuẩn', 'Standards'),
          values: m.standards.map((st) => {
            const code = st.standard?.code || st.note || ''
            const staticVal = staticProduct?.technicalBasis?.values.find((v) => v.vi === code)
            return staticVal || localized(code, code)
          }),
        }
      : staticProduct?.technicalBasis || { label: localized('Tiêu chuẩn', 'Standards'), values: [] }

  return {
    slug: m.slug,
    family,
    brand,
    model: m.model || staticProduct?.model || m.slug,
    name: staticProduct?.name ? { vi: m.name, en: staticProduct.name.en } : localized(m.name, m.name),
    summary:
      staticProduct?.summary && !m.shortDescription
        ? staticProduct.summary
        : localized(
            m.shortDescription || m.description || '',
            staticProduct?.summary?.en || m.shortDescription || m.description || '',
          ),
    category,
    image,
    technicalBasis,
    applications,
    highlights,
    specifications,
  }
}

function adaptNewsToItem(n: ApiNewsEvent, staticMap: Map<string, NewsItem>): NewsItem {
  const staticItem = staticMap.get(n.slug)
  const image = n.thumbnailImage?.publicUrl || staticItem?.image || '/images/hero/portfolio-hero-v5.png'
  const year = n.publishedAt
    ? new Date(n.publishedAt).getFullYear().toString()
    : staticItem?.year || new Date(n.createdAt).getFullYear().toString()

  let paragraphs: LocalizedText[] = []
  if (n.content && n.content.blocks && Array.isArray(n.content.blocks)) {
    const pBlocks = n.content.blocks.filter((b) => b.type === 'paragraph' && b.data?.text)
    if (pBlocks.length > 0) {
      paragraphs = pBlocks.map((b) => {
        const text = String(b.data.text)
        const staticP = staticItem?.paragraphs.find((p) => p.vi === text)
        return staticP || localized(text, text)
      })
    }
  }
  if (paragraphs.length === 0 && staticItem?.paragraphs) {
    paragraphs = staticItem.paragraphs
  }

  return {
    slug: n.slug,
    type: (n.type as NewsType) || staticItem?.type || 'news',
    year,
    title: staticItem?.title ? { vi: n.title, en: staticItem.title.en } : localized(n.title, n.title),
    excerpt: localized(n.shortDescription || '', staticItem?.excerpt?.en || n.shortDescription || ''),
    image,
    imageFit: staticItem?.imageFit || 'cover',
    relatedProduct: staticItem?.relatedProduct,
    nextAction: staticItem?.nextAction,
    paragraphs,
  }
}

export function DataProvider({ children }: { children: ReactNode }) {
  const [products, setProducts] = useState<Product[]>(defaultProducts)
  const [newsItems, setNewsItems] = useState<NewsItem[]>(defaultNewsItems)
  const [loading, setLoading] = useState(false)
  const [isLive, setIsLive] = useState(false)

  const staticProductMap = useMemo(() => new Map(defaultProducts.map((p) => [p.slug, p])), [])
  const staticNewsMap = useMemo(() => new Map(defaultNewsItems.map((n) => [n.slug, n])), [])

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
          // Only show published machines
          const published = machinesData.filter((m) => m.status === 'published')
          const adaptedProducts = published.map((m) => adaptMachineToProduct(m, staticProductMap))
          setProducts(adaptedProducts)
          hasLiveData = true
        }
      }

      if (newsRes && newsRes.ok) {
        const newsData = (await newsRes.json()) as ApiNewsEvent[]
        if (Array.isArray(newsData) && newsData.length > 0) {
          const published = newsData.filter((n) => n.status === 'published')
          const adaptedNews = published.map((n) => adaptNewsToItem(n, staticNewsMap))
          setNewsItems(adaptedNews)
          hasLiveData = true
        }
      }

      setIsLive(hasLiveData)
    } catch (err) {
      console.warn('[SiteData] Backend offline or slow, using resilient fallback data:', err)
      setIsLive(false)
    } finally {
      setLoading(false)
    }
  }, [staticProductMap, staticNewsMap])

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

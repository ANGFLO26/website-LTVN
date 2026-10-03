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
  type NewsBlock,
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

interface ApiNewsTranslation {
  title: string
  slug: string
  shortDescription?: string | null
  content?: {
    version: number
    blocks: Array<{
      type: string
      data: Record<string, unknown>
    }>
  } | null
  location?: string | null
  seoTitle?: string | null
  seoDescription?: string | null
}

export interface ApiNewsEvent {
  id: string
  type: string
  title: string
  slug: string
  shortDescription?: string | null
  location?: string | null
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
  translations?: {
    vi: ApiNewsTranslation | null
    en: ApiNewsTranslation | null
  }
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




/**
 * Parse a content JSONB tree into an array of NewsBlocks for a specific locale.
 * Operates purely on the single locale's content tree without cross-referencing or parallel index-zipping.
 */
function parseBlocksForLocale(
  content: ApiNewsTranslation['content'] | undefined | null,
  locale: 'vi' | 'en',
): NewsBlock[] {
  if (!content || !content.blocks || !Array.isArray(content.blocks)) return []

  const validBlocks = content.blocks.filter(
    (b): b is { type: string; data: Record<string, unknown> } =>
      b != null && typeof b === 'object' && typeof b.type === 'string',
  )

  const result: NewsBlock[] = []

  for (const b of validBlocks) {
    const data = (b.data && typeof b.data === 'object' ? b.data : {}) as Record<string, unknown>

    const extractText = (val: unknown): string => {
      if (typeof val === 'string') return val
      if (typeof val === 'object' && val !== null && !Array.isArray(val)) {
        const obj = val as Record<string, unknown>
        if (typeof obj[locale] === 'string') return obj[locale]
      }
      return ''
    }

    const toLoc = (textVal: unknown): LocalizedText => {
      const txt = extractText(textVal)
      return locale === 'vi' ? { vi: txt, en: '' } : { vi: '', en: txt }
    }

    switch (b.type) {
      case 'heading': {
        const text = extractText(data.text)
        if (text) {
          const level = typeof data.level === 'number' && [2, 3, 4].includes(data.level) ? data.level : 2
          result.push({
            type: 'heading',
            level,
            text: toLoc(data.text),
          })
        }
        break
      }
      case 'paragraph': {
        const text = extractText(data.text)
        if (text) {
          result.push({
            type: 'paragraph',
            text: toLoc(data.text),
          })
        }
        break
      }
      case 'bullet_list':
      case 'numbered_list': {
        const rawItems = Array.isArray(data.items) ? data.items : []
        const items: LocalizedText[] = []
        for (const item of rawItems) {
          const text = extractText(item)
          if (text) {
            items.push(toLoc(item))
          }
        }
        if (items.length > 0) {
          result.push({
            type: b.type as 'bullet_list' | 'numbered_list',
            items,
          })
        }
        break
      }
      case 'image': {
        const rawUrl = data.url || data.src || data.publicUrl
        if (typeof rawUrl === 'string' && rawUrl.trim().length > 0) {
          const trimmedUrl = rawUrl.trim()
          if (!trimmedUrl.toLowerCase().startsWith('javascript:')) {
            result.push({
              type: 'image',
              url: trimmedUrl,
              alt: data.alt ? toLoc(data.alt) : undefined,
              caption: data.caption ? toLoc(data.caption) : undefined,
            })
          }
        }
        break
      }
      case 'quote': {
        const text = extractText(data.text)
        if (text) {
          result.push({
            type: 'quote',
            text: toLoc(data.text),
            author: data.author ? toLoc(data.author) : undefined,
          })
        }
        break
      }
      default:
        // Safely skip malformed / unknown blocks
        break
    }
  }

  return result
}

function adaptNewsToItem(n: ApiNewsEvent): NewsItem {
  const viSlug = n.translations?.vi?.slug || n.slug
  const enSlug = n.translations?.en?.slug || undefined
  const slugs: LocalizedText = { vi: viSlug, en: enSlug || '' }

  const image = n.thumbnailImage?.publicUrl || (
    viSlug === 'chuyen-giao-dfa-70xi'
      ? '/images/news/phase-dfa-70xi-transparent.png'
      : '/images/hero/portfolio-hero-v5.png'
  )
  const year = n.publishedAt
    ? new Date(n.publishedAt).getFullYear().toString()
    : new Date(n.createdAt).getFullYear().toString()

  // Determine if authored EN translation exists
  const hasAuthoredEn = !!(n.translations?.en?.title && String(n.translations.en.title).trim().length > 0)

  // Parse VI and EN content blocks independently (never zipped by index)
  const viContentTree = n.translations?.vi ? n.translations.vi.content : n.content
  const enContentTree = hasAuthoredEn ? (n.translations!.en!.content || null) : null

  const viBlocks = parseBlocksForLocale(viContentTree, 'vi')
  // Legacy responses are VI-only; inline EN values cannot establish an EN article.
  const enBlocks = parseBlocksForLocale(enContentTree, 'en')
  const hasEnglish = hasAuthoredEn

  // Build title and excerpt from authored translations (zero synthetic calls)
  const viTitle = n.translations?.vi?.title || n.title || ''
  const enTitle = hasAuthoredEn ? n.translations!.en!.title : ''
  const title: LocalizedText = { vi: viTitle, en: enTitle }

  const viExcerpt = n.translations?.vi ? (n.translations.vi.shortDescription || '') : (n.shortDescription || '')
  const enExcerpt = hasAuthoredEn ? (n.translations!.en!.shortDescription || '') : ''
  const excerpt: LocalizedText = { vi: viExcerpt, en: enExcerpt }

  // Location
  const viLocation = n.translations?.vi
    ? (n.translations.vi.location || '')
    : (n.location || '')
  const enLocation = hasAuthoredEn ? (n.translations!.en!.location || '') : ''
  const location: LocalizedText | undefined = (viLocation || enLocation)
    ? { vi: viLocation, en: enLocation }
    : undefined

  const paragraphs = viBlocks
    .filter((b): b is Extract<NewsBlock, { type: 'paragraph' }> => b.type === 'paragraph')
    .map((b) => b.text)

  let nextAction: NewsItem['nextAction'] = undefined
  let relatedProduct: string | undefined = undefined

  if (viSlug === 'ban-giao-pac-optidist-2') {
    relatedProduct = 'optidist'
  } else if (viSlug === 'hoi-thao-van-an-toan') {
    // Route /baker-hughes is intentionally closed (QA-13); do not attach dead link CTA
    nextAction = undefined
  } else if (viSlug === 'chuyen-giao-dfa-70xi') {
    nextAction = {
      eyebrow: localized('TRAO ĐỔI THEO ỨNG DỤNG', 'APPLICATION-LED DISCUSSION'),
      title: localized('Bạn đang cần thiết bị xác định điểm đông đặc?', 'Do you need an instrument for freezing-point determination?'),
      description: localized(
        'Chia sẻ loại mẫu, phương pháp hoặc tiêu chuẩn áp dụng để đội ngũ kỹ thuật tiếp nhận đúng nhu cầu.',
        'Share the sample type, method or applicable standard so our technical team can review the right requirement.',
      ),
      label: localized('Trao đổi về ứng dụng này', 'Discuss this application'),
      to: '/lien-he?chu-de=phase-70xi',
    }
  }

  const type: NewsType =
    viSlug === 'ban-giao-pac-optidist-2' || viSlug === 'chuyen-giao-dfa-70xi'
      ? 'project'
      : (n.type as NewsType) || 'news'

  return {
    slug: viSlug,
    slugEn: enSlug,
    slugs,
    type,
    year,
    title,
    excerpt,
    location,
    image,
    imageFit: viSlug === 'chuyen-giao-dfa-70xi' ? 'contain' : 'cover',
    relatedProduct,
    nextAction,
    paragraphs,
    blocks: viBlocks,
    blocksByLocale: {
      vi: viBlocks,
      en: enBlocks,
    },
    hasEnglish,
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
        if (Array.isArray(machinesData)) {
          const published = machinesData.filter((m) => m.status === 'published')
          const adaptedProducts = published.map(adaptMachineToProduct)
          setProducts(adaptedProducts)
          hasLiveData = true
        }
      }

      if (newsRes && newsRes.ok) {
        const newsData = (await newsRes.json()) as ApiNewsEvent[]
        if (Array.isArray(newsData)) {
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
      return (
        newsItems.find(
          (n) =>
            n.slug === slug ||
            n.slugEn === slug ||
            n.slugs?.vi === slug ||
            n.slugs?.en === slug,
        ) || getStaticNewsBySlug(slug)
      )
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

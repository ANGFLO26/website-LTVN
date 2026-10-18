/* oxlint-disable react/only-export-components */
import { useEffect } from 'react'
import { useLanguage, type Language } from '../i18n'

export interface SeoHeadProps {
  title?: string
  description?: string
  canonicalPath?: string
  robots?: 'index,follow' | 'noindex,nofollow' | string
  type?: 'website' | 'article'
  image?: string
}

/**
 * Strips HTML tags, collapses whitespace, and trims text for safe inclusion in metadata.
 */
function cleanMetaText(text?: string | null): string {
  if (!text) return ''
  return text
    .replace(/<[^>]*>/g, ' ')
    .replace(/[\r\n\t]+/g, ' ')
    .replace(/\s{2,}/g, ' ')
    .trim()
}

/**
 * Resolves the absolute canonical origin based on browser window or configured public site URL.
 */
function getCanonicalOrigin(): string {
  if (typeof window !== 'undefined' && window.location?.origin) {
    return window.location.origin.replace(/\/+$/, '')
  }
  return ''
}

/**
 * Constructs an absolute canonical URL without query string or hash fragment.
 */
function buildCanonicalUrl(path?: string): string {
  const origin = getCanonicalOrigin()
  let pathname = '/'
  if (path) {
    pathname = path.startsWith('/') ? path : `/${path}`
  } else if (typeof window !== 'undefined' && window.location?.pathname) {
    pathname = window.location.pathname
  }
  // Remove trailing slashes (except root '/')
  if (pathname !== '/' && pathname.endsWith('/')) {
    pathname = pathname.replace(/\/+$/, '')
  }
  return `${origin}${pathname}`
}

/**
 * Resolves an absolute image URL for Open Graph and Twitter Card tags.
 */
function buildAbsoluteImageUrl(imagePath?: string): string {
  const fallback = '/images/brand/ltv-logo.png'
  const chosen = (imagePath && imagePath.trim()) ? imagePath.trim() : fallback
  if (chosen.startsWith('http://') || chosen.startsWith('https://')) {
    return chosen
  }
  const origin = getCanonicalOrigin()
  const normalized = chosen.startsWith('/') ? chosen : `/${chosen}`
  return `${origin}${normalized}`
}

/**
 * Directly updates DOM head metadata ensuring exactly one instance of each tag.
 */
function updateDocumentMetadata(props: SeoHeadProps, language: Language = 'vi') {
  if (typeof document === 'undefined') return

  const rawTitle = cleanMetaText(props.title)
  const fullTitle = rawTitle ? `${rawTitle} | LT Việt Nam` : 'LT Việt Nam Technology Co., Ltd'
  document.title = fullTitle

  // Default fallback descriptions per language
  const defaultDesc = language === 'en'
    ? 'LT Vietnam supplies PAC analytical instruments, Masoneilan control valves, Consolidated safety valves and technical services.'
    : 'LT Việt Nam cung cấp thiết bị phân tích PAC, van điều khiển Masoneilan, van an toàn Consolidated và dịch vụ kỹ thuật.'

  const desc = cleanMetaText(props.description) || defaultDesc
  const robots = props.robots || 'index,follow'
  const canonicalUrl = buildCanonicalUrl(props.canonicalPath)
  const ogType = props.type || 'website'
  const absoluteImage = buildAbsoluteImageUrl(props.image)
  const ogLocale = language === 'en' ? 'en_US' : 'vi_VN'

  // Helper to find or create a meta tag
  const setMeta = (attribute: 'name' | 'property', key: string, content: string) => {
    let el = document.head.querySelector(`meta[${attribute}="${key}"]`) as HTMLMetaElement | null
    if (!el) {
      el = document.createElement('meta')
      el.setAttribute(attribute, key)
      document.head.appendChild(el)
    }
    el.setAttribute('content', content)
  }

  // Helper to find or create canonical link
  const setCanonical = (href: string) => {
    let el = document.head.querySelector('link[rel="canonical"]') as HTMLLinkElement | null
    if (!el) {
      el = document.createElement('link')
      el.setAttribute('rel', 'canonical')
      document.head.appendChild(el)
    }
    el.setAttribute('href', href)
  }

  // 1. Standard search engine tags
  setMeta('name', 'description', desc)
  setMeta('name', 'robots', robots)
  setCanonical(canonicalUrl)

  // 2. Open Graph tags
  setMeta('property', 'og:title', fullTitle)
  setMeta('property', 'og:description', desc)
  setMeta('property', 'og:url', canonicalUrl)
  setMeta('property', 'og:type', ogType)
  setMeta('property', 'og:image', absoluteImage)
  setMeta('property', 'og:locale', ogLocale)

  // 3. Twitter Card tags
  setMeta('name', 'twitter:card', 'summary_large_image')
  setMeta('name', 'twitter:title', fullTitle)
  setMeta('name', 'twitter:description', desc)
  setMeta('name', 'twitter:image', absoluteImage)
}

/**
 * Hook to manage document head metadata.
 */
export function useSeoHead(props: SeoHeadProps) {
  const { language } = useLanguage()
  const { title, description, canonicalPath, robots, type, image } = props

  useEffect(() => {
    updateDocumentMetadata({ title, description, canonicalPath, robots, type, image }, language)
  }, [
    title,
    description,
    canonicalPath,
    robots,
    type,
    image,
    language,
  ])
}

/**
 * Head metadata component for declarative SEO management across public pages.
 */
export function SeoHead(props: SeoHeadProps) {
  useSeoHead(props)
  return null
}

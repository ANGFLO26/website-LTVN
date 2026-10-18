import { useEffect } from 'react'
import { ArrowLeft, ArrowRight, CalendarDays, MapPin } from 'lucide-react'
import { Link, useNavigate, useParams } from 'react-router'
import { useSiteData } from '../context/DataContext'
import { DataLoadError } from '../components/DataLoadError'
import { newsTypeLabels, type NewsBlock } from '../data'
import { SeoHead } from '../components/SeoHead'
import { useLanguage } from '../i18n'

export function ArticlePage() {
  const { slug } = useParams()
  const { getNewsBySlug, getProductBySlug, newsStatus, refreshData } = useSiteData()
  const item = getNewsBySlug(slug)
  const { content, language, setLanguage, t } = useLanguage()
  const navigate = useNavigate()

  // Synchronize route slug when language changes on bilingual articles
  useEffect(() => {
    if (!item) return
    if (language === 'en' && item.hasEnglish && item.slugEn && slug === item.slug) {
      navigate(`/tin-tuc/${item.slugEn}`, { replace: true })
    } else if (language === 'vi' && item.slug && item.slugEn && slug === item.slugEn) {
      navigate(`/tin-tuc/${item.slug}`, { replace: true })
    }
  }, [language, item, slug, navigate])
  if (newsStatus === 'loading') {
    return (
      <>
        <SeoHead
          title={language === 'vi' ? 'Đang tải nội dung...' : 'Loading content...'}
          robots="noindex,nofollow"
        />
        <section className="container not-found" style={{ minHeight: '50vh', justifyContent: 'center' }}>
          <p>{language === 'vi' ? 'Đang tải nội dung...' : 'Loading content...'}</p>
        </section>
      </>
    )
  }

  if (newsStatus === 'error') {
    return <>
      <SeoHead title={t('articleNotFound')} robots="noindex,nofollow" />
      <section className="container" style={{ paddingBlock: '4rem' }}><DataLoadError onRetry={refreshData} /></section>
    </>
  }

  // True 404: slug does not match any known article in any language
  if (!item) {
    return (
      <>
        <SeoHead
          title={t('articleNotFound')}
          canonicalPath={`/tin-tuc/${slug}`}
          robots="noindex,nofollow"
        />
        <section className="not-found container">
          <span className="eyebrow">404</span><h1>{t('articleNotFound')}</h1>
          <Link to="/tin-tuc-su-kien" className="button button-primary">{t('news')}</Link>
        </section>
      </>
    )
  }

  // Policy A: When user is in EN mode and the article has no authored EN translation,
  // display explicit unavailable state (NOT generic 404).
  if (language === 'en' && !item.hasEnglish) {
    return (
      <>
        <SeoHead
          title={content(item.title)}
          description="This article is currently available in Vietnamese only."
          canonicalPath={`/tin-tuc/${item.slug}`}
          robots="noindex,nofollow"
        />
        <section className="container article-unavailable not-found" style={{ minHeight: '50vh', display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', textAlign: 'center', gap: '1rem', padding: '3rem 1rem' }}>
          <span className="eyebrow">LT VIETNAM</span>
          <h1>This article is currently available in Vietnamese only.</h1>
          <p style={{ color: 'var(--text-secondary, #666)', maxWidth: '500px' }}>
            Nội dung bài viết này hiện chỉ có phiên bản Tiếng Việt.
          </p>
          <button
            type="button"
            className="button button-primary"
            onClick={() => {
              setLanguage('vi')
              navigate(`/tin-tuc/${item.slug}`)
            }}
          >
            Xem bản Tiếng Việt
          </button>
        </section>
      </>
    )
  }

  const relatedProduct = getProductBySlug(item.relatedProduct)

  const activeBlocks = item.blocksByLocale ? item.blocksByLocale[language] : (item.blocks || [])

  const activeParagraphs = item.blocksByLocale
    ? activeBlocks.filter((b): b is Extract<NewsBlock, { type: 'paragraph' }> => b.type === 'paragraph').map((b) => b.text)
    : item.paragraphs

  return (
    <>
      <SeoHead
        title={content(item.title)}
        description={content(item.excerpt)}
        canonicalPath={`/tin-tuc/${language === 'en' && item.hasEnglish && item.slugEn ? item.slugEn : item.slug}`}
        robots="index,follow"
        type="article"
        image={item.image}
      />
      <article className="article-page">
      <div className="container article-header">
        <div className="breadcrumbs"><Link to="/">{t('home')}</Link><span>/</span><Link to="/tin-tuc-su-kien">{t('news')}</Link></div>
        <div className="article-meta">
          <span>{content(newsTypeLabels[item.type])}</span>
          <span><CalendarDays size={15} aria-hidden="true" /> {item.year}</span>
          {item.location && content(item.location) && (
            <span className="article-location"><MapPin size={15} aria-hidden="true" /> {content(item.location)}</span>
          )}
        </div>
        <h1>{content(item.title)}</h1>
        <p>{content(item.excerpt)}</p>
      </div>
      <div className={`container article-image${item.imageFit === 'contain' ? ' article-image-equipment' : ''}`}>
        <img src={item.image} alt={content(item.title)} />
      </div>
      <div className="article-body">
        {(!activeBlocks.some((b) => b.type === 'heading')) && (activeBlocks.length || activeParagraphs.length) ? (
          <h2>{language === 'vi' ? 'Thông tin hoạt động' : 'Activity overview'}</h2>
        ) : null}
        {activeBlocks.length > 0 ? (
          activeBlocks.map((block, idx) => {
            switch (block.type) {
              case 'heading': {
                const HeadingTag = block.level === 3 ? 'h3' : block.level === 4 ? 'h4' : 'h2'
                return <HeadingTag key={idx}>{content(block.text)}</HeadingTag>
              }
              case 'paragraph': {
                return <p key={idx}>{content(block.text)}</p>
              }
              case 'bullet_list': {
                return (
                  <ul key={idx} className="article-bullet-list">
                    {block.items.map((itemText, i) => (
                      <li key={i}>{content(itemText)}</li>
                    ))}
                  </ul>
                )
              }
              case 'numbered_list': {
                return (
                  <ol key={idx} className="article-numbered-list">
                    {block.items.map((itemText, i) => (
                      <li key={i}>{content(itemText)}</li>
                    ))}
                  </ol>
                )
              }
              case 'image': {
                return (
                  <figure key={idx} className="article-content-figure">
                    <img
                      src={block.url}
                      alt={block.alt ? content(block.alt) : ''}
                      loading="lazy"
                      decoding="async"
                    />
                    {block.caption && <figcaption>{content(block.caption)}</figcaption>}
                  </figure>
                )
              }
              case 'quote': {
                return (
                  <blockquote key={idx} className="article-content-quote">
                    <p>{content(block.text)}</p>
                    {block.author && <cite>— {content(block.author)}</cite>}
                  </blockquote>
                )
              }
              default:
                return null
            }
          })
        ) : (
          activeParagraphs.map((paragraph, idx) => <p key={idx}>{content(paragraph)}</p>)
        )}
      </div>
      {relatedProduct && (
        <section className="article-related">
          <div className="container article-related-inner">
            <img src={relatedProduct.image} alt={content(relatedProduct.name)} />
            <div><span className="eyebrow">{t('relatedEquipment')}</span><h2>{relatedProduct.model}</h2><p>{content(relatedProduct.name)}</p></div>
            <Link to={`/san-pham/${relatedProduct.slug}`} className="button button-secondary">{t('viewDetail')} <ArrowRight size={16} aria-hidden="true" /></Link>
          </div>
        </section>
      )}
      {item.nextAction && item.nextAction.to !== '/baker-hughes' && (
        <section className="container article-next-action" aria-labelledby={`article-next-action-${item.slug}`}>
          <div>
            <span className="eyebrow">{content(item.nextAction.eyebrow)}</span>
            <h2 id={`article-next-action-${item.slug}`}>{content(item.nextAction.title)}</h2>
            <p>{content(item.nextAction.description)}</p>
          </div>
          <Link to={item.nextAction.to} className="button button-primary">
            {content(item.nextAction.label)} <ArrowRight size={16} aria-hidden="true" />
          </Link>
        </section>
      )}
      <div className="container article-back"><Link to="/tin-tuc-su-kien" className="text-link"><ArrowLeft size={16} aria-hidden="true" /> {t('news')}</Link></div>
    </article>
    </>
  )
}

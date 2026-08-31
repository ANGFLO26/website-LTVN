import { ArrowLeft, ArrowRight, CalendarDays } from 'lucide-react'
import { Link, useParams } from 'react-router'
import { getNewsBySlug, getProductBySlug } from '../data'
import { usePageTitle } from '../hooks'
import { useLanguage } from '../i18n'

export function ArticlePage() {
  const { slug } = useParams()
  const item = getNewsBySlug(slug)
  const { content, language, t } = useLanguage()
  usePageTitle(item ? content(item.title) : t('news'))

  if (!item) {
    return (
      <section className="not-found container">
        <span className="eyebrow">404</span><h1>Không tìm thấy bài viết</h1>
        <Link to="/tin-tuc-su-kien" className="button button-primary">{t('news')}</Link>
      </section>
    )
  }

  const relatedProduct = getProductBySlug(item.relatedProduct)

  return (
    <article className="article-page">
      <div className="container article-header">
        <div className="breadcrumbs"><Link to="/">{t('home')}</Link><span>/</span><Link to="/tin-tuc-su-kien">{t('news')}</Link></div>
        <div className="article-meta"><span>{content(item.type)}</span><span><CalendarDays size={15} aria-hidden="true" /> {item.year}</span></div>
        <h1>{content(item.title)}</h1>
        <p>{item.excerpt}</p>
      </div>
      <div className="container article-image"><img src={item.image} alt={content(item.title)} /></div>
      <div className="article-body">
        <h2>{language === 'vi' ? 'Thông tin hoạt động' : 'Activity overview'}</h2>
        {item.paragraphs.map((paragraph) => <p key={paragraph}>{paragraph}</p>)}
      </div>
      {relatedProduct && (
        <section className="article-related">
          <div className="container article-related-inner">
            <img src={relatedProduct.image} alt={relatedProduct.name} />
            <div><span className="eyebrow">{t('relatedEquipment')}</span><h2>{relatedProduct.model}</h2><p>{content(relatedProduct.name)}</p></div>
            <Link to={`/san-pham/${relatedProduct.slug}`} className="button button-secondary">{t('viewDetail')} <ArrowRight size={16} aria-hidden="true" /></Link>
          </div>
        </section>
      )}
      <div className="container article-back"><Link to="/tin-tuc-su-kien" className="text-link"><ArrowLeft size={16} aria-hidden="true" /> {t('news')}</Link></div>
    </article>
  )
}

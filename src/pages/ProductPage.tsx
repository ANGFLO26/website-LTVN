import { useState, useEffect } from 'react'
import { ArrowLeft, Check, Phone, Send, FileDown } from 'lucide-react'
import { Link, useParams } from 'react-router'
import { ProductCard } from '../components/ProductCard'
import { DataLoadError } from '../components/DataLoadError'
import { useSiteData } from '../context/DataContext'
import { SeoHead } from '../components/SeoHead'
import { useLanguage } from '../i18n'
import { QuickRfqModal } from '../components/QuickRfqModal'

export function ProductPage() {
  const { slug } = useParams()
  const { getProductBySlug, products, productsStatus, refreshData } = useSiteData()
  const product = getProductBySlug(slug)
  const { content, language, t } = useLanguage()
  const [isRfqOpen, setIsRfqOpen] = useState(false)
  const [showStickyBar, setShowStickyBar] = useState(false)

  useEffect(() => {
    const handleScroll = () => {
      setShowStickyBar(window.scrollY > 420)
    }
    window.addEventListener('scroll', handleScroll, { passive: true })
    return () => window.removeEventListener('scroll', handleScroll)
  }, [])

  if (productsStatus === 'loading') {
    return (
      <>
        <SeoHead
          title={language === 'vi' ? 'Đang tải thông tin sản phẩm...' : 'Loading product information...'}
          robots="noindex,nofollow"
        />
        <section className="container not-found" style={{ minHeight: '50vh', justifyContent: 'center' }}>
          <p>{language === 'vi' ? 'Đang tải thông tin sản phẩm...' : 'Loading product information...'}</p>
        </section>
      </>
    )
  }

  if (productsStatus === 'error') {
    return (
      <>
        <SeoHead title={t('productNotFound')} robots="noindex,nofollow" />
        <section className="container" style={{ paddingBlock: '4rem' }}>
          <DataLoadError onRetry={refreshData} />
        </section>
      </>
    )
  }

  if (!product) {
    return (
      <>
        <SeoHead
          title={t('productNotFound')}
          canonicalPath={`/san-pham/${slug}`}
          robots="noindex,nofollow"
        />
        <section className="not-found container">
          <span className="eyebrow">404</span>
          <h1>{t('productNotFound')}</h1>
          <Link to="/pac" className="button button-primary">{t('backToCatalog')}</Link>
        </section>
      </>
    )
  }

  const catalogPath = product.family === 'pac' ? '/pac' : undefined
  const relatedProducts = products
    .filter((item) => item.family === product.family && item.slug !== product.slug)
    .slice(0, 3)

  return (
    <>
      <SeoHead
        title={product.model}
        description={content(product.summary) || content(product.name)}
        canonicalPath={`/san-pham/${product.slug}`}
        robots="index,follow"
        image={product.image}
        type="website"
      />
      <section className="product-detail-hero">
        <div className="container">
          <div className="breadcrumbs">
            <Link to="/">{t('home')}</Link><span>/</span>
            {catalogPath ? (
              <Link to={catalogPath}>{product.family === 'pac' ? 'PAC' : 'Baker Hughes'}</Link>
            ) : (
              <span>{product.family === 'pac' ? 'PAC' : 'Baker Hughes'}</span>
            )}
            <span>/</span>
            <span>{product.model}</span>
          </div>
          <div className="product-detail-grid">
            <figure className="product-gallery">
              <div className="product-gallery-stage">
                <img
                  src={product.image}
                  alt={`${product.model} - ${content(product.name)}`}
                  loading="eager"
                  decoding="async"
                />
              </div>
              <figcaption>
                <span>{product.brand}</span>
                <strong>{product.model}</strong>
                <small>{content(product.category)}</small>
              </figcaption>
            </figure>
            <div className="product-detail-copy">
              <div className="product-detail-meta">
                <span>{product.brand}</span><span>{content(product.category)}</span>
              </div>
              <h1>{product.model}</h1>
              <h2>{content(product.name)}</h2>
              <p>{content(product.summary)}</p>
              <dl className="product-facts">
                <div><dt>{t('brand')}</dt><dd>{product.brand}</dd></div>
                <div>
                  <dt>{t('applications')}</dt>
                  <dd>
                    <ul className="product-fact-tags">
                      {product.applications.map((application) => <li key={application.vi}>{content(application)}</li>)}
                    </ul>
                  </dd>
                </div>
                <div>
                  <dt>{content(product.technicalBasis.label)}</dt>
                  <dd>
                    <ul className="product-fact-tags product-standard-tags">
                      {product.technicalBasis.values.map((value) => <li key={value.vi}>{content(value)}</li>)}
                    </ul>
                  </dd>
                </div>
              </dl>
              <p className="product-advice-hint">{t('productAdviceHint')}</p>
              <div className="hero-actions product-hero-actions">
                <button
                  type="button"
                  className="button button-primary"
                  onClick={() => setIsRfqOpen(true)}
                >
                  <Send size={17} aria-hidden="true" /> {t('quickRfqButton')}
                </button>
                <button
                  type="button"
                  className="button button-secondary"
                  onClick={() => setIsRfqOpen(true)}
                  title={t('downloadBrochure')}
                >
                  <FileDown size={17} aria-hidden="true" /> {t('downloadBrochure')}
                </button>
                <a href="tel:+842466506373" className="button button-secondary product-phone-button">
                  <Phone size={17} aria-hidden="true" /> {t('callTechnicalTeam')}
                </a>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="section product-information">
        <div className="container product-information-grid">
          <div className="product-highlight-block">
            <h2>{t('highlights')}</h2>
            <ul className="detail-highlight-list">
              {product.highlights.map((highlight) => (
                <li key={highlight.vi}><Check size={18} aria-hidden="true" /> {content(highlight)}</li>
              ))}
            </ul>
          </div>
          <div className="product-spec-block">
            <h2>{t('specifications')}</h2>
            <dl className="spec-table">
            {product.specifications.map((specification) => (
              <div key={specification.label.vi} className="spec-row">
                <dt>{content(specification.label)}</dt>
                <dd>{content(specification.value)}</dd>
              </div>
            ))}
            <div className="spec-row">
              <dt>{content(product.technicalBasis.label)}</dt>
              <dd>{product.technicalBasis.values.map((value) => content(value)).join(', ')}</dd>
            </div>
            </dl>
          </div>
        </div>
      </section>

      <section className="product-consultation-cta" aria-labelledby="product-consultation-title">
        <div className="container product-consultation-inner">
          <div>
            <span className="eyebrow">{t('productConsultEyebrow')}</span>
            <h2 id="product-consultation-title">{t('productConsultTitle')}</h2>
            <p>{t('productConsultDesc')}</p>
          </div>
          <div className="product-consultation-actions">
            <button
              type="button"
              className="button button-primary"
              onClick={() => setIsRfqOpen(true)}
            >
              <Send size={17} aria-hidden="true" /> {content({
                vi: `Yêu cầu báo giá ${product.model}`,
                en: `Request a quote for ${product.model}`,
              })}
            </button>
            <a href="tel:+842466506373" className="button product-consultation-phone">
              <Phone size={17} aria-hidden="true" /> {t('callTechnicalTeam')}
            </a>
          </div>
        </div>
      </section>

      <section className="section product-related-section">
        <div className="container">
          <div className="section-heading">
            <div><h2>{t('relatedProducts')}</h2></div>
            {catalogPath && (
              <Link to={catalogPath} className="text-link"><ArrowLeft size={16} aria-hidden="true" /> {t('backToCatalog')}</Link>
            )}
          </div>
          <div className="product-grid three-columns">
            {relatedProducts.map((item) => <ProductCard key={item.slug} product={item} />)}
          </div>
        </div>
      </section>

      {/* Floating / Sticky Bottom RFQ Bar when scrolling */}
      {showStickyBar && (
        <aside className="sticky-rfq-bar" aria-label={t('quickRfqTitle')}>
          <div className="container sticky-rfq-inner">
            <div className="sticky-rfq-info">
              <span className="sticky-rfq-brand">{product.brand}</span>
              <strong>{product.model}</strong>
              <span className="sticky-rfq-name">{content(product.name)}</span>
            </div>
            <div className="sticky-rfq-actions">
              <a href="tel:+842466506373" className="button button-secondary button-sm">
                <Phone size={15} aria-hidden="true" />
                <span className="hide-on-mobile">(024) 6650 6373</span>
              </a>
              <button
                type="button"
                className="button button-primary button-sm"
                onClick={() => setIsRfqOpen(true)}
              >
                <Send size={15} aria-hidden="true" />
                <span>{t('quickRfqButton')}</span>
              </button>
            </div>
          </div>
        </aside>
      )}

      <QuickRfqModal
        isOpen={isRfqOpen}
        onClose={() => setIsRfqOpen(false)}
        product={{
          model: product.model,
          name: content(product.name),
          slug: product.slug,
        }}
      />
    </>
  )
}

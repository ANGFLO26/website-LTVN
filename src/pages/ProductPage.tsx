import { ArrowLeft, Check, Phone, Send } from 'lucide-react'
import { Link, useParams } from 'react-router'
import { ProductCard } from '../components/ProductCard'
import { getProductBySlug, products } from '../data'
import { usePageTitle } from '../hooks'
import { useLanguage } from '../i18n'

export function ProductPage() {
  const { slug } = useParams()
  const product = getProductBySlug(slug)
  const { content, t } = useLanguage()
  usePageTitle(product?.model ?? t('productFallbackTitle'))

  if (!product) {
    return (
      <section className="not-found container">
        <span className="eyebrow">404</span>
        <h1>{t('productNotFound')}</h1>
        <Link to="/pac" className="button button-primary">{t('backToCatalog')}</Link>
      </section>
    )
  }

  const catalogPath = product.family === 'pac' ? '/pac' : '/baker-hughes'
  const relatedProducts = products
    .filter((item) => item.family === product.family && item.slug !== product.slug)
    .slice(0, 3)

  return (
    <>
      <section className="product-detail-hero">
        <div className="container">
          <div className="breadcrumbs">
            <Link to="/">{t('home')}</Link><span>/</span>
            <Link to={catalogPath}>{product.family === 'pac' ? 'PAC' : 'Baker Hughes'}</Link><span>/</span>
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
                <Link to={`/lien-he?san-pham=${product.slug}`} className="button button-primary">
                  <Send size={17} aria-hidden="true" /> {t('requestProduct')}
                </Link>
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
            <Link to={`/lien-he?san-pham=${product.slug}`} className="button button-primary">
              <Send size={17} aria-hidden="true" /> {t('sendRequirement')}
            </Link>
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
            <Link to={catalogPath} className="text-link"><ArrowLeft size={16} aria-hidden="true" /> {t('backToCatalog')}</Link>
          </div>
          <div className="product-grid three-columns">
            {relatedProducts.map((item) => <ProductCard key={item.slug} product={item} />)}
          </div>
        </div>
      </section>
    </>
  )
}

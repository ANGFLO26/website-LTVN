import { ArrowUpRight } from 'lucide-react'
import { Link } from 'react-router'
import type { Product } from '../data'
import { useLanguage } from '../i18n'

export function ProductCard({ product, compact = false }: { product: Product; compact?: boolean }) {
  const { content, t } = useLanguage()
  const applications = product.applications.map((application) => content(application)).join(' · ')
  const technicalBasis = product.technicalBasis.values.map((value) => content(value)).join(' · ')

  return (
    <article className={`product-card hover-scale ${compact ? 'product-card-compact' : ''}`}>
      <Link to={`/san-pham/${product.slug}`} className="product-image-link">
        <img
          src={product.image}
          alt={`${product.model} - ${content(product.name)}`}
          loading="lazy"
          decoding="async"
        />
      </Link>
      <div className="product-card-body">
        <div className="product-meta">
          <span>{product.brand}</span>
          <span>{content(product.category)}</span>
        </div>
        <h3>
          <Link to={`/san-pham/${product.slug}`}>{product.model}</Link>
        </h3>
        <p className="product-card-name">{content(product.name)}</p>
        <dl className="product-card-facts">
          <div>
            <dt>{t('applications')}</dt>
            <dd>{applications}</dd>
          </div>
          <div>
            <dt>{content(product.technicalBasis.label)}</dt>
            <dd>{technicalBasis}</dd>
          </div>
        </dl>
        <Link to={`/san-pham/${product.slug}`} className="text-link">
          {t('viewDetail')} <ArrowUpRight size={16} aria-hidden="true" />
        </Link>
      </div>
    </article>
  )
}

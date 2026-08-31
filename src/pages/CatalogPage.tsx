import { Search } from 'lucide-react'
import { useMemo, useState } from 'react'
import { EmptyState, PageIntro } from '../components/PageElements'
import { ProductCard } from '../components/ProductCard'
import { products, type ProductFamily } from '../data'
import { usePageTitle } from '../hooks'
import { useLanguage } from '../i18n'

const ALL_FILTER = 'Tất cả'

export function CatalogPage({ family }: { family: ProductFamily }) {
  const { content, language, t } = useLanguage()
  const [query, setQuery] = useState('')
  const [brand, setBrand] = useState(ALL_FILTER)
  const [category, setCategory] = useState(ALL_FILTER)
  const familyProducts = useMemo(() => products.filter((product) => product.family === family), [family])
  const brands = [ALL_FILTER, ...new Set(familyProducts.map((product) => product.brand))]
  const categories = [ALL_FILTER, ...new Set(familyProducts.map((product) => product.category))]
  const isPac = family === 'pac'

  const title = isPac ? 'PAC' : 'Baker Hughes'
  usePageTitle(title)

  const filteredProducts = useMemo(() => {
    const normalizedQuery = query.trim().toLocaleLowerCase('vi')

    return familyProducts.filter((product) => {
      const matchesBrand = brand === ALL_FILTER || product.brand === brand
      const matchesCategory = category === ALL_FILTER || product.category === category
      const searchable = [
        product.model,
        product.name,
        content(product.name),
        product.category,
        content(product.category),
        product.summary,
        content(product.summary),
        product.applications.join(' '),
        product.applications.map(content).join(' '),
        product.highlights.join(' '),
        product.highlights.map(content).join(' '),
        product.specifications.flatMap((item) => [item.label, item.value, content(item.label), content(item.value)]).join(' '),
        product.standards.join(' '),
      ].join(' ').toLocaleLowerCase('vi')

      return matchesBrand && matchesCategory && (!normalizedQuery || searchable.includes(normalizedQuery))
    })
  }, [brand, category, content, familyProducts, query])

  const clearFilters = () => {
    setQuery('')
    setBrand(ALL_FILTER)
    setCategory(ALL_FILTER)
  }

  return (
    <>
      <PageIntro
        className={`catalog-page-intro ${isPac ? 'page-intro-pac' : 'page-intro-baker'}`}
        image={isPac ? '/images/hero/ltvietnam-selected-hero-v7.png' : '/images/hero/industrial-service-hero-v3.png'}
        eyebrow={title.toUpperCase()}
        title={isPac ? t('pacTitle') : t('bakerTitle')}
        description={isPac ? t('pacIntro') : t('bakerIntro')}
      />

      <section className="section catalog-section">
        <div className="container">
          <div className="catalog-toolbar">
            <label className="catalog-search">
              <Search size={18} aria-hidden="true" />
              <span className="sr-only">{t('searchPlaceholder')}</span>
              <input
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder={t('searchPlaceholder')}
              />
            </label>
            {brands.length > 2 && (
              <div className="filter-group" aria-label={t('brand')}>
                {brands.map((item) => (
                  <button
                    key={item}
                    type="button"
                    className={brand === item ? 'active' : ''}
                    onClick={() => setBrand(item)}
                    aria-pressed={brand === item}
                  >
                    {item === ALL_FILTER ? t('all') : item}
                  </button>
                ))}
              </div>
            )}
          </div>

          <div className="catalog-category-strip" aria-label={t('productCategories')}>
            {categories.map((item) => (
              <button
                key={item}
                type="button"
                className={category === item ? 'active' : ''}
                onClick={() => setCategory(item)}
                aria-pressed={category === item}
              >
                {item === ALL_FILTER ? t('all') : content(item)}
              </button>
            ))}
          </div>

          <div className="catalog-result-head">
            <h2>{isPac ? 'PAC' : 'Baker Hughes'}</h2>
            <span>{filteredProducts.length} {t('productsCount')}</span>
          </div>

          {filteredProducts.length ? (
            <div className="product-grid">
              {filteredProducts.map((product) => <ProductCard key={product.slug} product={product} />)}
            </div>
          ) : (
            <EmptyState
              title={t('noMatchingProducts')}
              description={t('noResults')}
              actionLabel={t('clearFilters')}
              onAction={clearFilters}
            />
          )}
        </div>
      </section>
    </>
  )
}

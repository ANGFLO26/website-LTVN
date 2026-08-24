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
        className="catalog-page-intro"
        eyebrow={title.toUpperCase()}
        title={
          isPac
            ? language === 'vi'
              ? 'Thiết bị phân tích nhiên liệu và phòng thí nghiệm'
              : 'Fuel and laboratory analysis instruments'
            : language === 'vi'
              ? 'Giải pháp van điều khiển và van an toàn'
              : 'Control valve and safety valve solutions'
        }
        description={
          isPac
            ? language === 'vi'
              ? 'Tìm theo ứng dụng, nhóm thiết bị, phương pháp thử hoặc model.'
              : 'Search by application, equipment group, test method or model.'
            : language === 'vi'
              ? 'Tìm theo loại van, ứng dụng, thương hiệu hoặc model.'
              : 'Search by valve type, application, brand or model.'
        }
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

          <div className="catalog-category-strip" aria-label={language === 'vi' ? 'Nhóm sản phẩm' : 'Product categories'}>
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
            <span>{filteredProducts.length} {language === 'vi' ? 'sản phẩm' : 'products'}</span>
          </div>

          {filteredProducts.length ? (
            <div className="product-grid">
              {filteredProducts.map((product) => <ProductCard key={product.slug} product={product} />)}
            </div>
          ) : (
            <EmptyState
              title={language === 'vi' ? 'Chưa có sản phẩm phù hợp' : 'No matching products'}
              description={t('noResults')}
              actionLabel={language === 'vi' ? 'Xóa bộ lọc' : 'Clear filters'}
              onAction={clearFilters}
            />
          )}
        </div>
      </section>
    </>
  )
}

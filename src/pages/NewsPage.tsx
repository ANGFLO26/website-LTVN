import { ArrowRight } from 'lucide-react'
import { useMemo, useState } from 'react'
import { Link } from 'react-router'
import { NewsCard } from '../components/NewsCard'
import { EmptyState, PageIntro } from '../components/PageElements'
import { newsItems } from '../data'
import { usePageTitle } from '../hooks'
import { useLanguage } from '../i18n'

export function NewsPage() {
  const { content, language, t } = useLanguage()
  const [filter, setFilter] = useState('Tất cả')
  usePageTitle(t('news'))

  const filteredItems = useMemo(
    () => filter === 'Tất cả' ? newsItems : newsItems.filter((item) => item.type === filter),
    [filter],
  )
  const featured = newsItems[0]
  const filterOptions = [
    { value: 'Tất cả', label: t('updatesAll') },
    { value: 'Tin tức', label: t('updatesNews') },
    { value: 'Sự kiện', label: t('updatesEvents') },
    { value: 'Dự án', label: t('updatesProjects') },
  ]

  return (
    <>
      <PageIntro
        className="page-intro-news"
        image="/images/news/safety-valve-seminar.jpg"
        eyebrow={t('updatesEyebrow')}
        title={t('newsEvents')}
        description={t('newsEventsDesc')}
      />

      <section className="featured-story">
        <div className="container featured-story-grid">
          <Link to={`/tin-tuc/${featured.slug}`} className="featured-story-image">
            <img src={featured.image} alt={content(featured.title)} className="hover-scale-img" />
          </Link>
          <div className="featured-story-copy">
            <div className="news-meta"><span>{content(featured.type)}</span><span>{featured.year}</span></div>
            <h2><Link to={`/tin-tuc/${featured.slug}`}>{content(featured.title)}</Link></h2>
            <p>{featured.excerpt}</p>
            <Link to={`/tin-tuc/${featured.slug}`} className="text-link">{t('readArticle')} <ArrowRight size={16} aria-hidden="true" /></Link>
          </div>
        </div>
      </section>

      <section className="section news-list-section">
        <div className="container">
          <div className="news-filter" aria-label={t('filterPosts')}>
            {filterOptions.map((option) => (
              <button
                key={option.value}
                type="button"
                className={filter === option.value ? 'active' : ''}
                onClick={() => setFilter(option.value)}
                aria-pressed={filter === option.value}
              >
                {option.label}
              </button>
            ))}
          </div>
          {filteredItems.length ? (
            <div className="news-grid">
              {filteredItems.map((item) => <NewsCard key={item.slug} item={item} />)}
            </div>
          ) : (
            <EmptyState
              title={t('noPosts')}
              description={t('chooseAnotherCategory')}
              actionLabel={t('viewAll')}
              onAction={() => setFilter('Tất cả')}
            />
          )}
        </div>
      </section>
    </>
  )
}

import { ArrowRight } from 'lucide-react'
import { useMemo, useState } from 'react'
import { Link } from 'react-router'
import { NewsCard } from '../components/NewsCard'
import { EmptyState, PageIntro } from '../components/PageElements'
import { newsItems, newsTypeLabels, type NewsType } from '../data'
import { usePageTitle } from '../hooks'
import { useLanguage } from '../i18n'

export function NewsPage() {
  const { content, t } = useLanguage()
  const [filter, setFilter] = useState<'all' | NewsType>('all')
  usePageTitle(t('news'))

  const filteredItems = useMemo(
    () => filter === 'all' ? newsItems : newsItems.filter((item) => item.type === filter),
    [filter],
  )
  const featured = newsItems[0]
  const filterOptions = [
    { value: 'all' as const, label: t('updatesAll') },
    { value: 'news' as const, label: content(newsTypeLabels.news) },
    { value: 'event' as const, label: content(newsTypeLabels.event) },
    { value: 'project' as const, label: content(newsTypeLabels.project) },
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
            <div className="news-meta"><span>{content(newsTypeLabels[featured.type])}</span><span>{featured.year}</span></div>
            <h2><Link to={`/tin-tuc/${featured.slug}`}>{content(featured.title)}</Link></h2>
            <p>{content(featured.excerpt)}</p>
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
              onAction={() => setFilter('all')}
            />
          )}
        </div>
      </section>
    </>
  )
}

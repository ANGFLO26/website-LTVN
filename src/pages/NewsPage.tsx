import { ArrowRight } from 'lucide-react'
import { useMemo, useState } from 'react'
import { Link } from 'react-router'
import { NewsCard } from '../components/NewsCard'
import { EmptyState, PageIntro, SectionHeading } from '../components/PageElements'
import { newsItems, newsTypeLabels, type NewsType } from '../data'
import { usePageTitle } from '../hooks'
import { useLanguage } from '../i18n'

export function NewsPage() {
  const { content, t } = useLanguage()
  const [filter, setFilter] = useState<'all' | NewsType>('all')
  usePageTitle(t('news'))

  const featured = newsItems.find((item) => item.slug === 'hoi-thao-van-an-toan') ?? newsItems[0]
  const filteredItems = useMemo(
    () => filter === 'all'
      ? newsItems.filter((item) => item.slug !== featured.slug)
      : newsItems.filter((item) => item.type === filter),
    [featured.slug, filter],
  )
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
        image="/images/hero/portfolio-hero-v5.png"
        eyebrow={t('updatesEyebrow')}
        title={t('newsEvents')}
        description={t('newsEventsPurposeDesc')}
        actions={
          <a href="#news-feed" className="button button-primary">{t('browseUpdates')} <ArrowRight size={17} aria-hidden="true" /></a>
        }
        aside={
          <Link to={`/tin-tuc/${featured.slug}`} className="news-hero-feature">
            <img src={featured.image} alt="" aria-hidden="true" />
            <div>
              <span>{t('featuredFieldStory')}</span>
              <strong>{content(featured.title)}</strong>
              <small>{content(newsTypeLabels[featured.type])} · {featured.year}</small>
            </div>
          </Link>
        }
      />

      <section id="news-feed" className="section news-list-section" aria-labelledby="news-feed-title">
        <div className="container">
          <SectionHeading
            eyebrow={t('newsFeedEyebrow')}
            titleId="news-feed-title"
            title={t('newsFeedTitle')}
            description={t('newsFeedDesc')}
          />
          <div className="news-filter-row">
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
            <span className="news-result-count" aria-live="polite">{filteredItems.length} {t('postsCount')}</span>
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

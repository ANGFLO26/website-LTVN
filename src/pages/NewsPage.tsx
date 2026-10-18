import { ArrowRight } from 'lucide-react'
import { useMemo, useState } from 'react'
import { Link } from 'react-router'
import { NewsCard } from '../components/NewsCard'
import { DataLoadError } from '../components/DataLoadError'
import { EmptyState, PageIntro, SectionHeading } from '../components/PageElements'
import { useSiteData } from '../context/DataContext'
import { newsTypeLabels, type NewsType } from '../data'
import { useSeoHead } from '../components/SeoHead'
import { useLanguage } from '../i18n'

export function NewsPage() {
  const { content, t, language } = useLanguage()
  const { newsItems, newsStatus, refreshData } = useSiteData()
  const [filter, setFilter] = useState<'all' | NewsType>('all')
  useSeoHead({
    title: t('news'),
    description: language === 'vi'
      ? 'Cập nhật tin tức hoạt động, dự án chuyển giao công nghệ và sự kiện hội thảo kỹ thuật của LT Việt Nam.'
      : 'Latest updates on operations, technology handovers and technical seminars from LT Vietnam.',
    canonicalPath: '/tin-tuc-su-kien',
    type: 'website',
  })

  // Policy A: In EN mode, only show items with authored English translation
  const localeItems = language === 'en' ? newsItems.filter((item) => item.hasEnglish) : newsItems

  const featured = localeItems.find((item) => item.slug === 'hoi-thao-van-an-toan') ?? localeItems[0]
  const filteredItems = useMemo(
    () => filter === 'all'
      ? localeItems.filter((item) => item.slug !== featured?.slug)
      : localeItems.filter((item) => item.type === filter),
    [featured?.slug, filter, localeItems],
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
          featured ? (
            <Link to={`/tin-tuc/${language === 'en' && featured.slugEn ? featured.slugEn : featured.slug}`} className="news-hero-feature">
              <img src={featured.image} alt="" aria-hidden="true" />
              <div>
                <span>{t('featuredFieldStory')}</span>
                <strong>{content(featured.title)}</strong>
                <small>{content(newsTypeLabels[featured.type])} · {featured.year}</small>
              </div>
            </Link>
          ) : undefined
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
          {newsStatus === 'loading' ? (
            <p role="status">{language === 'vi' ? 'Đang tải bài viết...' : 'Loading articles...'}</p>
          ) : newsStatus === 'error' ? (
            <DataLoadError onRetry={refreshData} />
          ) : filteredItems.length ? (
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

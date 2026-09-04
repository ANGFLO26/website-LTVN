import { ArrowRight } from 'lucide-react'
import { Link } from 'react-router'
import { newsTypeLabels, type NewsItem } from '../data'
import { useLanguage } from '../i18n'

export function NewsCard({ item }: { item: NewsItem }) {
  const { content, t } = useLanguage()

  return (
    <article className={`news-card hover-scale ${item.imageFit === 'contain' ? 'news-card-equipment' : ''}`}>
      <Link
        to={`/tin-tuc/${item.slug}`}
        className="news-image-link"
        aria-label={`${t('readArticle')}: ${content(item.title)}`}
      >
        <img src={item.image} alt={content(item.title)} loading="lazy" decoding="async" />
      </Link>
      <div className="news-card-body">
        <div className="news-meta">
          <span>{content(newsTypeLabels[item.type])}</span>
          <span>{item.year}</span>
        </div>
        <h3>
          <Link to={`/tin-tuc/${item.slug}`}>{content(item.title)}</Link>
        </h3>
        <p>{content(item.excerpt)}</p>
        <Link to={`/tin-tuc/${item.slug}`} className="text-link">
          {t('readArticle')} <ArrowRight size={16} aria-hidden="true" />
        </Link>
      </div>
    </article>
  )
}

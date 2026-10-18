import { ArrowLeft } from 'lucide-react'
import { Link } from 'react-router'
import { useSeoHead } from '../components/SeoHead'
import { useLanguage } from '../i18n'

export function NotFoundPage() {
  const { t } = useLanguage()
  useSeoHead({
    title: t('pageNotFoundTitle'),
    description: t('pageNotFoundDescription'),
    robots: 'noindex,nofollow',
    type: 'website',
  })
  return (
    <section className="not-found container">
      <span className="eyebrow">404</span>
      <h1>{t('pageNotFoundTitle')}</h1>
      <p>{t('pageNotFoundDescription')}</p>
      <Link to="/" className="button button-primary"><ArrowLeft size={17} aria-hidden="true" /> {t('backHome')}</Link>
    </section>
  )
}

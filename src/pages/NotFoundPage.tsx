import { ArrowLeft } from 'lucide-react'
import { Link } from 'react-router'
import { usePageTitle } from '../hooks'
import { useLanguage } from '../i18n'

export function NotFoundPage() {
  const { t } = useLanguage()
  usePageTitle(t('pageNotFoundTitle'))
  return (
    <section className="not-found container">
      <span className="eyebrow">404</span>
      <h1>{t('pageNotFoundTitle')}</h1>
      <p>{t('pageNotFoundDescription')}</p>
      <Link to="/" className="button button-primary"><ArrowLeft size={17} aria-hidden="true" /> {t('backHome')}</Link>
    </section>
  )
}

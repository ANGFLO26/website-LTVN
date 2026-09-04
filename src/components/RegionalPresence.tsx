import { ArrowRight } from 'lucide-react'
import { Link } from 'react-router'
import { offices } from '../data'
import { useLanguage } from '../i18n'

export function RegionalPresence() {
  const { content, t } = useLanguage()

  return (
    <section className="section regional-presence-section" aria-labelledby="regional-presence-title">
      <div className="container regional-presence-layout">
        <div className="regional-presence-copy">
          <span className="eyebrow">{t('regionalPresenceEyebrow')}</span>
          <h2 id="regional-presence-title">{t('regionalPresenceTitle')}</h2>
          <p>{t('regionalPresenceDesc')}</p>
          <Link to="/lien-he#office-network" className="text-link">
            {t('viewOfficeDetails')} <ArrowRight size={16} aria-hidden="true" />
          </Link>
        </div>

        <ol className="regional-presence-list">
          {offices.map((office, index) => (
            <li key={office.city.vi}>
              <span aria-hidden="true">{String(index + 1).padStart(2, '0')}</span>
              <div>
                <small>{content(office.label)}</small>
                <h3>{content(office.city)}</h3>
              </div>
            </li>
          ))}
        </ol>
      </div>
    </section>
  )
}

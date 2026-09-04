import { Mail, MapPin, Phone } from 'lucide-react'
import { offices } from '../data'
import { useLanguage } from '../i18n'
import { SectionHeading } from './PageElements'

export function OfficeNetwork({ description }: { description: string }) {
  const { content, t } = useLanguage()

  return (
    <section className="section office-section">
      <div className="container">
        <SectionHeading title={t('offices')} description={description} />
        <ul className="office-list">
          {offices.map((office) => (
            <li key={office.city.vi} className="office-list-item">
              <div className="office-list-heading">
                <span>{content(office.label)}</span>
                <h3>{content(office.city)}</h3>
              </div>
              <p><MapPin aria-hidden="true" /> {content(office.address)}</p>
              {office.phone ? (
                <a href={`tel:+${office.phone.replace(/\D/g, '')}`}>
                  <Phone aria-hidden="true" />
                  {office.phone}
                </a>
              ) : (
                <a href={`mailto:${office.email}`}>
                  <Mail aria-hidden="true" />
                  {office.email}
                </a>
              )}
            </li>
          ))}
        </ul>
      </div>
    </section>
  )
}

import { CheckCircle2, ClipboardList, Mail, MapPin, Phone } from 'lucide-react'
import { useState, type FormEvent } from 'react'
import { useSearchParams } from 'react-router'
import { OfficeNetwork } from '../components/OfficeNetwork'
import { PageIntro } from '../components/PageElements'
import { offices, products } from '../data'
import { usePageTitle } from '../hooks'
import { useLanguage } from '../i18n'

export function ContactPage() {
  const { content, t } = useLanguage()
  const [searchParams] = useSearchParams()
  const [submitted, setSubmitted] = useState(false)
  const selectedProduct = searchParams.get('san-pham') ?? ''
  usePageTitle(t('contact'))

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setSubmitted(true)
  }

  return (
    <>
      <PageIntro
        className="page-intro-contact"
        image="/images/hero/industrial-lab-plant-hero-v6.png"
        eyebrow={t('talkToOurTeam')}
        title={t('contactLTV')}
        description={t('contactPurposeDesc')}
        actions={
          <>
            <a href="tel:+842466506373" className="button button-primary"><Phone size={17} aria-hidden="true" /> {t('callTechnicalTeam')}</a>
            <a href="mailto:Sales@ltvietnam.com.vn" className="button button-secondary"><Mail size={17} aria-hidden="true" /> {t('sendEmail')}</a>
          </>
        }
        aside={
          <div className="contact-hero-brief">
            <ClipboardList aria-hidden="true" />
            <div>
              <span>{t('prepareBeforeContact')}</span>
              <ul>
                <li>{t('contactBriefApplication')}</li>
                <li>{t('contactBriefStandard')}</li>
                <li>{t('contactBriefCondition')}</li>
              </ul>
            </div>
          </div>
        }
      />

      <section className="section contact-section">
        <div className="container contact-layout">
          <div className="contact-direct">
            <span className="eyebrow">{t('directChannels')}</span>
            <h2>{t('reachRightTeam')}</h2>
            <p>{t('reachRightTeamDesc')}</p>
            <div className="direct-contact-list">
              <a href="tel:+842466506373"><Phone aria-hidden="true" /><span><small>{t('phone')}</small><strong>(84-24) 6650 6373</strong></span></a>
              <a href="mailto:Sales@ltvietnam.com.vn"><Mail aria-hidden="true" /><span><small>{t('salesEmail')}</small><strong>Sales@ltvietnam.com.vn</strong></span></a>
              <div><MapPin aria-hidden="true" /><span><small>{t('mainOffice')}</small><strong>{content(offices[0].address)}</strong></span></div>
            </div>
          </div>
          <form className="contact-form" onSubmit={handleSubmit}>
            <div className="contact-form-heading">
              <span className="eyebrow">{t('contactFormEyebrow')}</span>
              <h2>{t('contactFormTitle')}</h2>
              <p>{t('contactFormDesc')}</p>
              <small>{t('requiredFieldsNote')}</small>
            </div>
            <div className="form-grid contact-form-grid">
              <label>
                <span>{t('fullName')} *</span>
                <input name="name" required autoComplete="name" />
              </label>
              <label>
                <span>{t('contactMethod')} *</span>
                <input name="contact" required autoComplete="email" aria-describedby="contact-method-hint" />
                <small id="contact-method-hint">{t('contactMethodHint')}</small>
              </label>
              <label className="form-wide">
                <span>{t('interest')}</span>
                <select name="product" defaultValue={selectedProduct}>
                  <option value="">{t('selectProduct')}</option>
                  {products.map((product) => <option key={product.slug} value={product.slug}>{product.brand} · {product.model}</option>)}
                </select>
              </label>
              <label className="form-wide">
                <span>{t('message')} *</span>
                <textarea name="message" rows={5} required />
              </label>
            </div>
            <button type="submit" className="button button-primary">{t('sendRequest')}</button>
            {submitted && <p className="form-status" role="status"><CheckCircle2 aria-hidden="true" /> {t('formReady')}</p>}
          </form>
        </div>
      </section>

      <OfficeNetwork description={t('contactNearestOffice')} />
    </>
  )
}

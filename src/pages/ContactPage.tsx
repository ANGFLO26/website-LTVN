import { CheckCircle2, Mail, MapPin, Phone } from 'lucide-react'
import { useState, type FormEvent } from 'react'
import { useSearchParams } from 'react-router'
import { PageIntro, SectionHeading } from '../components/PageElements'
import { offices, products } from '../data'
import { usePageTitle } from '../hooks'
import { useLanguage } from '../i18n'

export function ContactPage() {
  const { language, t } = useLanguage()
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
        description={t('contactLTVDesc')}
      />
      <section className="section contact-section">
        <div className="container contact-layout">
          <div className="contact-direct">
            <h2>{t('reachRightTeam')}</h2>
            <p>{t('reachRightTeamDesc')}</p>
            <div className="direct-contact-list">
              <a href="tel:+842466506373"><Phone aria-hidden="true" /><span><small>{t('phone')}</small><strong>(84-24) 6650 6373</strong></span></a>
              <a href="mailto:Sales@ltvietnam.com.vn"><Mail aria-hidden="true" /><span><small>{t('salesEmail')}</small><strong>Sales@ltvietnam.com.vn</strong></span></a>
              <div><MapPin aria-hidden="true" /><span><small>{t('mainOffice')}</small><strong>{offices[0].address}</strong></span></div>
            </div>
          </div>
          <form className="contact-form" onSubmit={handleSubmit}>
            <div className="form-grid">
              <label><span>{t('fullName')} *</span><input name="name" required autoComplete="name" /></label>
              <label><span>{t('company')}</span><input name="company" autoComplete="organization" /></label>
              <label><span>{t('email')} *</span><input name="email" type="email" required autoComplete="email" /></label>
              <label><span>{t('phone')}</span><input name="phone" type="tel" autoComplete="tel" /></label>
              <label className="form-wide"><span>{t('interest')}</span><select name="product" defaultValue={selectedProduct}><option value="">{t('selectProduct')}</option>{products.map((product) => <option key={product.slug} value={product.slug}>{product.brand} · {product.model}</option>)}</select></label>
              <label className="form-wide"><span>{t('message')} *</span><textarea name="message" rows={5} required /></label>
            </div>
            <button type="submit" className="button button-primary hover-scale">{t('sendRequest')}</button>
            {submitted && <p className="form-status" role="status"><CheckCircle2 aria-hidden="true" /> {t('formReady')}</p>}
          </form>
        </div>
      </section>
      <section className="section office-section">
        <div className="container">
          <SectionHeading
            title={t('offices')}
            description={t('contactNearestOffice')}
          />
          <div className="office-grid">
            {offices.map((office) => <article key={office.city} className="office-card hover-scale"><span>{office.label}</span><h3>{office.city}</h3><p>{office.address}</p><strong>{office.phone}</strong></article>)}
          </div>
        </div>
      </section>
    </>
  )
}

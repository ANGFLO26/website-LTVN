import { CheckCircle2, ClipboardList, Mail, MapPin, Phone } from 'lucide-react'
import { useState, useRef, type FormEvent } from 'react'
import { OfficeNetwork } from '../components/OfficeNetwork'
import { PageIntro } from '../components/PageElements'
import { offices } from '../data'
import { usePageTitle } from '../hooks'
import { useLanguage } from '../i18n'

const requestTypes = [
  ['quotation', 'contactRequestQuotation'],
  ['product_consultation', 'contactRequestProductConsultation'],
  ['technical_support', 'contactRequestTechnicalSupport'],
  ['maintenance_repair', 'contactRequestMaintenanceRepair'],
  ['partnership', 'contactRequestPartnership'],
  ['other', 'contactRequestOther'],
] as const

export function ContactPage() {
  const { content, t } = useLanguage()
  const [submitted, setSubmitted] = useState(false)
  const [submitError, setSubmitError] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const isSubmittingRef = useRef(false)
  usePageTitle(t('contact'))

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (isSubmittingRef.current) return
    const form = event.currentTarget
    const formData = new FormData(form)
    const fullName = (formData.get('fullName') as string)?.trim() ?? ''
    const companyName = (formData.get('companyName') as string)?.trim() ?? ''
    const email = (formData.get('email') as string)?.trim() ?? ''
    const phone = (formData.get('phone') as string)?.trim() ?? ''
    const requestType = (formData.get('requestType') as string)?.trim() ?? ''
    const message = (formData.get('message') as string)?.trim() ?? ''

    const nameInput = form.elements.namedItem('fullName') as HTMLInputElement
    const companyInput = form.elements.namedItem('companyName') as HTMLInputElement
    const requestTypeInput = form.elements.namedItem('requestType') as HTMLSelectElement
    const phoneInput = form.elements.namedItem('phone') as HTMLInputElement
    const messageInput = form.elements.namedItem('message') as HTMLTextAreaElement
    nameInput.setCustomValidity(fullName ? '' : t('contactNameRequired'))
    companyInput.setCustomValidity(companyName ? '' : t('contactCompanyRequired'))
    requestTypeInput.setCustomValidity(requestTypes.some(([value]) => value === requestType) ? '' : t('contactRequestTypeRequired'))
    messageInput.setCustomValidity(message ? '' : t('contactMessageRequired'))
    const phoneDigits = phone.replace(/\D/g, '').length
    const validPhone = /^\+?[0-9 ().-]+$/.test(phone) && phoneDigits >= 7 && phoneDigits <= 15
    phoneInput.setCustomValidity(validPhone ? '' : t('contactPhoneInvalid'))
    if (!form.reportValidity()) return

    const payload = {
      fullName,
      companyName,
      email,
      phone,
      requestType,
      message: message,
    }

    if (isSubmittingRef.current) return
    isSubmittingRef.current = true
    setIsSubmitting(true)
    setSubmitError('')
    setSubmitted(false)
    try {
      const response = await fetch('/api/contacts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
      if (response.ok) {
        setSubmitted(true)
        setSubmitError('')
      } else if (response.status === 400) {
        setSubmitted(false)
        setSubmitError(t('contactValidationError'))
      } else {
        setSubmitted(false)
        setSubmitError(t('contactServerError'))
      }
    } catch {
      setSubmitted(false)
      setSubmitError(t('contactNetworkError'))
    } finally {
      isSubmittingRef.current = false
      setIsSubmitting(false)
    }
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
          <form className="contact-form" onSubmit={handleSubmit} onInput={(event) => {
            const target = event.target
            if (target instanceof HTMLInputElement || target instanceof HTMLTextAreaElement || target instanceof HTMLSelectElement) target.setCustomValidity('')
          }}>
            <div className="contact-form-heading">
              <span className="eyebrow">{t('contactFormEyebrow')}</span>
              <h2>{t('contactFormTitle')}</h2>
              <p>{t('contactFormDesc')}</p>
              <small>{t('requiredFieldsNote')}</small>
            </div>
            <div className="form-grid contact-form-grid">
              <label>
                <span>{t('fullName')} *</span>
                <input name="fullName" required maxLength={255} autoComplete="name" />
              </label>
              <label>
                <span>{t('contactCompany')} *</span>
                <input name="companyName" required maxLength={255} autoComplete="organization" />
              </label>
              <label>
                <span>{t('phone')} *</span>
                <input name="phone" type="tel" required maxLength={50} autoComplete="tel" />
              </label>
              <label>
                <span>{t('email')} *</span>
                <input name="email" type="email" required maxLength={255} autoComplete="email" />
              </label>
              <label className="form-wide">
                <span>{t('contactRequestType')} *</span>
                <select name="requestType" required defaultValue="">
                  <option value="" disabled>{t('contactSelectRequestType')}</option>
                  {requestTypes.map(([value, label]) => <option key={value} value={value}>{t(label)}</option>)}
                </select>
              </label>
              <label className="form-wide">
                <span>{t('message')} *</span>
                <textarea name="message" rows={5} required maxLength={5000} />
              </label>
            </div>
            <button
              type="submit"
              className="button button-primary"
              disabled={isSubmitting}
              aria-busy={isSubmitting}
            >
              {t('sendRequest')}
            </button>
            {submitError && <p className="form-status" role="alert">{submitError}</p>}
            {submitted && <p className="form-status" role="status"><CheckCircle2 aria-hidden="true" /> {t('formReady')}</p>}
          </form>
        </div>
      </section>

      <OfficeNetwork description={t('contactNearestOffice')} />
    </>
  )
}

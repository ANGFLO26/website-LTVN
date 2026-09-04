import { useState, type KeyboardEvent } from 'react'
import { ArrowRight, ClipboardCheck, LifeBuoy, Wrench } from 'lucide-react'
import { Link } from 'react-router'
import { NewsCard } from '../components/NewsCard'
import { SectionHeading } from '../components/PageElements'
import { newsItems } from '../data'
import { usePageTitle } from '../hooks'
import { useLanguage } from '../i18n'

export function HomePage() {
  const { language, t } = useLanguage()
  const [activeSupportStep, setActiveSupportStep] = useState(0)
  usePageTitle(t('home'))

  const supportSteps = [
    {
      label: language === 'vi' ? 'KHẢO SÁT ỨNG DỤNG' : 'APPLICATION REVIEW',
      title: language === 'vi' ? 'Làm rõ yêu cầu' : 'Define the requirement',
      description: language === 'vi' ? 'Xác định loại mẫu, ứng dụng, tiêu chuẩn và điều kiện vận hành.' : 'Identify the sample, application, standards and operating conditions.',
      outcome: language === 'vi' ? 'Thống nhất đúng bài toán kỹ thuật trước khi đề xuất thiết bị.' : 'Align on the technical requirement before recommending equipment.',
      image: '/images/process/clarify-requirements.png',
      imageAlt: language === 'vi' ? 'Hai kỹ sư đối chiếu mẫu thử và yêu cầu kỹ thuật trong phòng thí nghiệm' : 'Two engineers reviewing a sample and technical requirements in an industrial laboratory',
    },
    {
      label: language === 'vi' ? 'CẤU HÌNH & TRIỂN KHAI' : 'CONFIGURATION & DELIVERY',
      title: language === 'vi' ? 'Lựa chọn và triển khai' : 'Select and implement',
      description: language === 'vi' ? 'Tư vấn cấu hình, chuẩn bị lắp đặt và phối hợp đưa thiết bị vào sử dụng.' : 'Configure, prepare the installation and commission the equipment.',
      outcome: language === 'vi' ? 'Cấu hình và kế hoạch triển khai bám sát điều kiện sử dụng thực tế.' : 'Match the configuration and implementation plan to actual site conditions.',
      image: '/images/process/select-implement.png',
      imageAlt: language === 'vi' ? 'Kỹ sư đấu nối và xác nhận cấu hình thiết bị phân tích trước khi vận hành' : 'Engineers connecting and verifying the configuration of an analytical instrument before operation',
    },
    {
      label: language === 'vi' ? 'CHUYỂN GIAO & HẬU MÃI' : 'HANDOVER & SUPPORT',
      title: language === 'vi' ? 'Chuyển giao và hỗ trợ' : 'Handover and support',
      description: language === 'vi' ? 'Hướng dẫn vận hành, bàn giao tài liệu và tiếp tục hỗ trợ sau bán hàng.' : 'Provide operating guidance, documentation and after-sales support.',
      outcome: language === 'vi' ? 'Người vận hành nắm quy trình và có đầu mối hỗ trợ kỹ thuật rõ ràng.' : 'Give operators a clear workflow and a reliable technical point of contact.',
      image: '/images/process/handover-support.png',
      imageAlt: language === 'vi' ? 'Kỹ sư hướng dẫn người vận hành sử dụng thiết bị và tài liệu kỹ thuật' : 'An engineer guiding operators through the instrument and technical documentation',
    },
  ]

  const activeStep = supportSteps[activeSupportStep]

  const handleSupportKeyDown = (event: KeyboardEvent<HTMLButtonElement>, index: number) => {
    let nextIndex = index

    if (event.key === 'ArrowDown' || event.key === 'ArrowRight') nextIndex = (index + 1) % supportSteps.length
    else if (event.key === 'ArrowUp' || event.key === 'ArrowLeft') nextIndex = (index - 1 + supportSteps.length) % supportSteps.length
    else if (event.key === 'Home') nextIndex = 0
    else if (event.key === 'End') nextIndex = supportSteps.length - 1
    else return

    event.preventDefault()
    setActiveSupportStep(nextIndex)
    window.requestAnimationFrame(() => document.getElementById(`support-step-${nextIndex}`)?.focus())
  }

  const servicePromises = [
    { 
      title: language === 'vi' ? 'Tư vấn đúng ứng dụng' : 'Application-led advice', 
      detail: language === 'vi' ? 'Mẫu thử, tiêu chuẩn, điều kiện vận hành' : 'Sample, standard and operating conditions',
      Icon: ClipboardCheck 
    },
    { 
      title: language === 'vi' ? 'Triển khai tại hiện trường' : 'On-site implementation', 
      detail: language === 'vi' ? 'Lắp đặt, hướng dẫn và chuyển giao' : 'Installation, guidance and handover',
      Icon: Wrench 
    },
    { 
      title: language === 'vi' ? 'Hỗ trợ sau bán hàng' : 'After-sales support', 
      detail: language === 'vi' ? 'Tài liệu, vận hành và hỗ trợ kỹ thuật' : 'Documentation, operation and technical support',
      Icon: LifeBuoy 
    },
  ]

  return (
    <>
      <section className="home-hero">
        <img
          className="home-hero-backdrop"
          src="/images/hero/ltvietnam-selected-hero-v8.png"
          alt=""
          aria-hidden="true"
          width="1672"
          height="941"
          fetchPriority="high"
        />
        <div className="container home-hero-inner">
          <div className="home-hero-copy">
            <span className="eyebrow">{t('heroEyebrow')}</span>
            <h1>{t('heroTitle')}</h1>
            <p>{t('heroDesc')}</p>
            <div className="hero-actions">
              <a href="#giai-phap" className="button button-primary">
                {t('exploreSolutions')}
                <ArrowRight size={17} aria-hidden="true" />
              </a>
              <Link to="/lien-he" className="button button-hero-secondary">
                {t('talkToEngineer')}
              </Link>
            </div>
          </div>

        </div>
      </section>

      <section className="home-trust-strip" aria-label={t('serviceCommitments')}>
        <div className="container home-trust-grid">
          {servicePromises.map(({ title, detail, Icon }) => (
            <div key={title}>
              <Icon aria-hidden="true" />
              <span><strong>{title}</strong><small>{detail}</small></span>
            </div>
          ))}
        </div>
      </section>

      <section id="giai-phap" className="section home-solution-section">
        <div className="container">
          <SectionHeading
            title={t('equipmentTwoNeeds')}
            description={t('equipmentDesc')}
          />

          <div className="home-solution-grid">
            <Link to="/pac" className="home-solution-path home-solution-lab">
              <div className="home-solution-copy">
                <span className="home-solution-kicker">PAC · HERZOG</span>
                <h3>{t('labAnalysis')}</h3>
                <p>{t('labDesc')}</p>
                <span className="home-solution-link">
                  {t('explorePac')}
                  <ArrowRight aria-hidden="true" />
                </span>
              </div>
              <div className="home-solution-media home-solution-media-lab" aria-hidden="true">
                <img src="/images/products/optidist-2-official.png" alt="PAC OptiDist 2" loading="lazy" decoding="async" />
                <img src="/images/products/cid-510-transparent.png" alt="Herzog CID 510" loading="lazy" decoding="async" />
              </div>
            </Link>

            <Link to="/baker-hughes" className="home-solution-path home-solution-valves">
              <div className="home-solution-copy">
                <span className="home-solution-kicker">BAKER HUGHES</span>
                <h3>{t('processControl')}</h3>
                <p>{t('processDesc')}</p>
                <span className="home-solution-link">
                  {t('exploreBaker')}
                  <ArrowRight aria-hidden="true" />
                </span>
              </div>
              <div className="home-solution-media home-solution-media-valves" aria-hidden="true">
                <img src="/images/products/valve-21000-transparent.png" alt="Masoneilan Valve" loading="lazy" decoding="async" />
                <img src="/images/products/consolidated-2700-transparent.png" alt="Consolidated Safety Valve" loading="lazy" decoding="async" />
              </div>
            </Link>
          </div>

          <div className="home-flow-bridge" aria-label={t('nextStep')}>
            <div>
              <span>{t('nextStep')}</span>
              <strong>{t('nextStepTitle')}</strong>
            </div>
            <p>{t('nextStepDesc')}</p>
          </div>
        </div>
      </section>

      <section className="home-process-section" aria-labelledby="home-process-title">
        <div className="container">
          <div className="home-process-heading">
            <div>
              <span className="eyebrow">{t('supportProcess')}</span>
              <h2 id="home-process-title">{t('supportProcessTitle')}</h2>
            </div>
            <p>{t('supportProcessDesc')}</p>
          </div>

          <div className="home-process-layout">
            <div
              className="home-process-tabs"
              role="tablist"
              aria-label={t('techSupportSteps')}
              aria-orientation="vertical"
            >
              {supportSteps.map((step, index) => {
                const isActive = activeSupportStep === index

                return (
                  <button
                    key={step.title}
                    id={`support-step-${index}`}
                    className={`home-process-tab${isActive ? ' is-active' : ''}`}
                    type="button"
                    role="tab"
                    aria-selected={isActive}
                    aria-controls="support-step-panel"
                    tabIndex={isActive ? 0 : -1}
                    onClick={() => setActiveSupportStep(index)}
                    onKeyDown={(event) => handleSupportKeyDown(event, index)}
                  >
                    <span className="home-process-tab-copy">
                      <strong>{step.title}</strong>
                      <small>{step.description}</small>
                    </span>
                    <ArrowRight className="home-process-arrow" size={20} aria-hidden="true" />
                  </button>
                )
              })}
            </div>

            <article
              id="support-step-panel"
              className="home-process-panel"
              role="tabpanel"
              aria-labelledby={`support-step-${activeSupportStep}`}
              aria-live="polite"
            >
              <div key={`visual-${activeSupportStep}-${language}`} className="home-process-visual">
                <img
                  src={activeStep.image}
                  alt={activeStep.imageAlt}
                  loading="lazy"
                  decoding="async"
                />
              </div>
              <div key={`copy-${activeSupportStep}-${language}`} className="home-process-panel-copy">
                <span className="home-process-label">{activeStep.label}</span>
                <h3>{activeStep.title}</h3>
                <p>{activeStep.description}</p>
                <div className="home-process-outcome">
                  <span>{t('stepOutcomes')}</span>
                  <strong>{activeStep.outcome}</strong>
                </div>
                <Link to="/gioi-thieu" className="text-link home-process-link">
                  {t('howItWorks')}
                  <ArrowRight size={17} aria-hidden="true" />
                </Link>
              </div>
            </article>
          </div>
        </div>
      </section>

      <section className="section home-news-section">
        <div className="container">
          <SectionHeading
            title={t('capabilityTitle')}
            description={t('capabilityDesc')}
            action={
              <Link to="/tin-tuc-su-kien" className="text-link">
                {t('viewAll')} <ArrowRight size={16} aria-hidden="true" />
              </Link>
            }
          />
          <div className="news-grid home-news-grid">
            {newsItems.slice(0, 3).map((item) => <NewsCard key={item.slug} item={item} />)}
          </div>
        </div>
      </section>

      <section className="contact-cta home-contact-cta">
        <div className="container contact-cta-inner">
          <div>
            <h2>
              {language === 'vi'
                ? 'Cần chọn thiết bị cho một ứng dụng cụ thể?'
                : 'Selecting equipment for a specific application?'}
            </h2>
            <p>
              {language === 'vi'
                ? 'Chia sẻ loại mẫu, tiêu chuẩn hoặc điều kiện vận hành để đội ngũ kỹ thuật hỗ trợ đúng trọng tâm.'
                : 'Share the sample, standard or operating conditions so our technical team can focus on the right solution.'}
            </p>
            <a className="contact-email" href="mailto:Sales@ltvietnam.com.vn">Sales@ltvietnam.com.vn</a>
          </div>
          <Link to="/lien-he" className="button button-light">
            {t('getAdvice')}
            <ArrowRight size={17} aria-hidden="true" />
          </Link>
        </div>
      </section>
    </>
  )
}

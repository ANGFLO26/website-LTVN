import { useState, type KeyboardEvent } from 'react'
import { ArrowDown, ArrowRight, ClipboardCheck, LifeBuoy, Wrench } from 'lucide-react'
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
      image: '/images/hero/industrial-lab-plant-hero-v6.png',
      imageAlt: language === 'vi' ? 'Kỹ thuật viên vận hành thiết bị phân tích trong phòng thí nghiệm nhà máy' : 'Technician operating analytical equipment in a plant laboratory',
    },
    {
      label: language === 'vi' ? 'CẤU HÌNH & TRIỂN KHAI' : 'CONFIGURATION & DELIVERY',
      title: language === 'vi' ? 'Lựa chọn và triển khai' : 'Select and implement',
      description: language === 'vi' ? 'Tư vấn cấu hình, chuẩn bị lắp đặt và phối hợp đưa thiết bị vào sử dụng.' : 'Configure, prepare the installation and commission the equipment.',
      outcome: language === 'vi' ? 'Cấu hình và kế hoạch triển khai bám sát điều kiện sử dụng thực tế.' : 'Match the configuration and implementation plan to actual site conditions.',
      image: '/images/hero/ltvietnam-selected-hero-v7.png',
      imageAlt: language === 'vi' ? 'Kỹ thuật viên thao tác trên thiết bị OptiDist 2 tại nhà máy' : 'Technician operating an OptiDist 2 instrument at an industrial site',
    },
    {
      label: language === 'vi' ? 'CHUYỂN GIAO & HẬU MÃI' : 'HANDOVER & SUPPORT',
      title: language === 'vi' ? 'Chuyển giao và hỗ trợ' : 'Handover and support',
      description: language === 'vi' ? 'Hướng dẫn vận hành, bàn giao tài liệu và tiếp tục hỗ trợ sau bán hàng.' : 'Provide operating guidance, documentation and after-sales support.',
      outcome: language === 'vi' ? 'Người vận hành nắm quy trình và có đầu mối hỗ trợ kỹ thuật rõ ràng.' : 'Give operators a clear workflow and a reliable technical point of contact.',
      image: '/images/hero/industrial-service-hero-v3.png',
      imageAlt: language === 'vi' ? 'Kỹ thuật viên kiểm tra van công nghiệp tại hiện trường' : 'Technician inspecting an industrial valve on site',
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
      detail: language === 'vi' ? 'Mẫu thử · tiêu chuẩn · điều kiện vận hành' : 'Sample · standard · operating conditions', 
      Icon: ClipboardCheck 
    },
    { 
      title: language === 'vi' ? 'Triển khai tại hiện trường' : 'On-site implementation', 
      detail: language === 'vi' ? 'Lắp đặt · hướng dẫn · chuyển giao' : 'Installation · guidance · handover', 
      Icon: Wrench 
    },
    { 
      title: language === 'vi' ? 'Hỗ trợ sau bán hàng' : 'After-sales support', 
      detail: language === 'vi' ? 'Tài liệu · vận hành · kỹ thuật' : 'Documentation · operation · technical support', 
      Icon: LifeBuoy 
    },
  ]

  return (
    <>
      <section className="home-hero">
        <img
          className="home-hero-backdrop"
          src="/images/hero/ltvietnam-selected-hero-v7.png"
          alt=""
          aria-hidden="true"
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

          <div className="hero-trust-bar" aria-label={t('serviceCommitments')}>
            {servicePromises.map(({ title, detail, Icon }) => (
              <div key={title}>
                <Icon aria-hidden="true" />
                <span><strong>{title}</strong><small>{detail}</small></span>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section id="giai-phap" className="section home-solution-section">
        <div className="container">
          <SectionHeading
            eyebrow={t('solutionGroups')}
            title={t('equipmentTwoNeeds')}
            description={t('equipmentDesc')}
          />

          <div className="home-solution-grid">
            <Link to="/pac" className="home-solution-path home-solution-lab hover-scale">
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
                <img src="/images/products/cid-510.png" alt="Herzog CID 510" loading="lazy" decoding="async" />
              </div>
            </Link>

            <Link to="/baker-hughes" className="home-solution-path home-solution-valves hover-scale">
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
                <img src="/images/products/valve-21000.jpg" alt="Masoneilan Valve" loading="lazy" decoding="async" />
                <img src="/images/products/consolidated-2700.png" alt="Consolidated Safety Valve" loading="lazy" decoding="async" />
              </div>
            </Link>
          </div>

          <div className="home-flow-bridge" aria-label={t('nextStep')}>
            <div>
              <span>{t('nextStep')}</span>
              <strong>{t('nextStepTitle')}</strong>
            </div>
            <p>{t('nextStepDesc')}</p>
            <ArrowDown aria-hidden="true" />
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
            <p className="lead">{t('supportProcessDesc')}</p>
          </div>

          <div className="home-process-grid">
            <div
              className="home-process-steps"
              role="tablist"
              aria-label={t('techSupportSteps')}
            >
              {supportSteps.map((step, index) => (
                <button
                  key={step.title}
                  id={`support-step-${index}`}
                  role="tab"
                  aria-selected={activeSupportStep === index}
                  aria-controls={`support-panel-${index}`}
                  tabIndex={activeSupportStep === index ? 0 : -1}
                  className={`home-process-step ${activeSupportStep === index ? 'active' : ''}`}
                  onClick={() => setActiveSupportStep(index)}
                  onKeyDown={(e) => handleSupportKeyDown(e, index)}
                >
                  <div className="step-indicator" aria-hidden="true"></div>
                  <div className="step-content">
                    <span className="step-label">{step.label}</span>
                    <strong className="step-title">{step.title}</strong>
                    <p className="step-desc" id={`support-desc-${index}`}>
                      {step.description}
                    </p>
                  </div>
                </button>
              ))}
            </div>

            <div className="home-process-display">
              <div
                id={`support-panel-${activeSupportStep}`}
                role="tabpanel"
                aria-labelledby={`support-step-${activeSupportStep}`}
                className="home-process-panel"
                tabIndex={0}
              >
                <img
                  src={activeStep.image}
                  alt={activeStep.imageAlt}
                  key={activeStep.image}
                  loading="lazy"
                  decoding="async"
                />
                <div className="home-process-outcome">
                  <span>{t('stepOutcomes')}</span>
                  <p>{activeStep.outcome}</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="section bg-light">
        <div className="container">
          <SectionHeading
            eyebrow={t('projectsActivities')}
            title={t('capabilityTitle')}
            description={t('capabilityDesc')}
          />
          <div className="news-grid">
            {newsItems.slice(0, 3).map((item) => (
              <NewsCard key={item.slug} item={item} />
            ))}
          </div>
          <div className="section-footer">
            <Link to="/tin-tuc-su-kien" className="button button-secondary">
              {t('viewAll')}
              <ArrowRight size={16} aria-hidden="true" />
            </Link>
          </div>
        </div>
      </section>

      <section className="home-cta-section">
        <div className="container">
          <div className="home-cta-inner">
            <span className="eyebrow">{t('startRequirement')}</span>
            <h2>{t('readyToSupport')}</h2>
            <p className="lead">{t('contactSalesDesc')}</p>
            <div className="home-cta-actions">
              <Link to="/lien-he" className="button button-primary">
                {t('getAdvice')}
                <ArrowRight size={17} aria-hidden="true" />
              </Link>
            </div>
          </div>
        </div>
      </section>
    </>
  )
}

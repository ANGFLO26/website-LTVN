import {
  ArrowRight,
  CheckCircle2,
  Headphones,
  PackageCheck,
  ScanSearch,
  Settings2,
} from 'lucide-react'
import { Link } from 'react-router'
import { CustomerShowcase } from '../components/CustomerShowcase'
import { OfficeNetwork } from '../components/OfficeNetwork'
import { PageIntro, SectionHeading } from '../components/PageElements'
import { newsItems } from '../data'
import { usePageTitle } from '../hooks'
import { useLanguage } from '../i18n'

export function AboutPage() {
  const { content, language, t } = useLanguage()
  usePageTitle(t('about'))

  const lifecycle = [
    {
      icon: ScanSearch,
      title: language === 'vi' ? 'Làm rõ yêu cầu' : 'Clarify requirements',
      description: language === 'vi'
        ? 'Xác định ứng dụng, phương pháp, tiêu chuẩn và điều kiện vận hành.'
        : 'Define the application, method, standards and operating conditions.',
    },
    {
      icon: Settings2,
      title: language === 'vi' ? 'Lựa chọn cấu hình' : 'Select configuration',
      description: language === 'vi'
        ? 'Đối chiếu model, tùy chọn và phạm vi cung cấp phù hợp.'
        : 'Match the model, options and suitable supply scope.',
    },
    {
      icon: PackageCheck,
      title: language === 'vi' ? 'Triển khai & chuyển giao' : 'Implement & hand over',
      description: language === 'vi'
        ? 'Phối hợp lắp đặt, chạy thử và hướng dẫn người sử dụng.'
        : 'Coordinate installation, trial operation and user guidance.',
    },
    {
      icon: Headphones,
      title: language === 'vi' ? 'Hỗ trợ vận hành' : 'Support operation',
      description: language === 'vi'
        ? 'Tiếp nhận nhu cầu kỹ thuật, phụ tùng và hỗ trợ sau bán hàng.'
        : 'Handle technical, spare-parts and after-sales requirements.',
    },
  ]
  const caseStudy = newsItems.find((item) => item.slug === 'hoi-thao-van-an-toan')

  return (
    <>
      <PageIntro
        className="page-intro-about"
        image="/images/hero/industrial-service-hero-v3.png"
        eyebrow="LT VIỆT NAM TECHNOLOGY CO., LTD"
        title={language === 'vi' ? 'Năng lực kỹ thuật cho công nghiệp và phòng thí nghiệm' : 'Technical capability for industry and laboratories'}
        description={
          language === 'vi'
            ? 'Thiết bị phù hợp chỉ là điểm bắt đầu. Giá trị nằm ở cách yêu cầu được làm rõ, triển khai và hỗ trợ trong suốt vòng đời vận hành.'
            : 'Suitable equipment is only the starting point. Value comes from how requirements are clarified, implemented and supported throughout operation.'
        }
        actions={
          <>
            <a href="#capability-lifecycle" className="button button-primary">{t('aboutExploreCapabilities')} <ArrowRight size={17} aria-hidden="true" /></a>
            <Link to="/lien-he" className="button button-secondary">{t('discussRequirement')}</Link>
          </>
        }
        aside={
          <div className="about-hero-scope">
            <span>{t('supportScope')}</span>
            <ul>
              <li>{t('laboratoryEquipment')}</li>
              <li>{t('plantEquipment')}</li>
              <li>{t('lifecycleSupport')}</li>
            </ul>
          </div>
        }
      />

      <section className="section about-overview-section">
        <div className="container about-overview-grid">
          <div className="about-overview-copy fade-in-up">
            <span className="eyebrow">{t('aboutOverviewEyebrow')}</span>
            <h2>{t('aboutOverviewTitle')}</h2>
            <p>{t('aboutOverviewDesc')}</p>
          </div>
          <dl className="about-scope-list fade-in-up">
            <div>
              <dt>{t('solutionPortfolio')}</dt>
              <dd>PAC · Masoneilan · Consolidated</dd>
            </div>
            <div>
              <dt>{t('servedEnvironments')}</dt>
              <dd>{t('servedEnvironmentsValue')}</dd>
            </div>
            <div>
              <dt>{t('technicalScope')}</dt>
              <dd>{t('technicalScopeValue')}</dd>
            </div>
          </dl>
        </div>
      </section>

      <section id="capability-lifecycle" className="section capability-lifecycle-section">
        <div className="container">
          <SectionHeading
            eyebrow={t('lifecycleEyebrow')}
            title={t('lifecycleTitle')}
            description={t('lifecycleDesc')}
          />
          <ol className="capability-lifecycle">
            {lifecycle.map((step, index) => {
              const Icon = step.icon
              return (
                <li key={step.title}>
                  <div className="lifecycle-marker"><Icon aria-hidden="true" /><span>{String(index + 1).padStart(2, '0')}</span></div>
                  <h3>{step.title}</h3>
                  <p>{step.description}</p>
                </li>
              )
            })}
          </ol>
        </div>
      </section>

      {caseStudy && (
        <section className="section about-case-study-section" aria-labelledby="case-study-title">
          <div className="container about-case-study-grid">
            <figure className="case-study-media">
              <img src={caseStudy.image} alt={content(caseStudy.title)} loading="lazy" decoding="async" />
              <figcaption>{t('realActivityPhoto')}</figcaption>
            </figure>
            <div className="case-study-copy">
              <span className="eyebrow">{t('realCaseStudy')}</span>
              <h2 id="case-study-title">{content(caseStudy.title)}</h2>
              <p className="case-study-lead">{content(caseStudy.excerpt)}</p>
              <dl className="case-study-facts">
                <div><dt>{t('caseContext')}</dt><dd>{content(caseStudy.paragraphs[0])}</dd></div>
                <div><dt>{t('caseApproach')}</dt><dd>{content(caseStudy.paragraphs[2])}</dd></div>
                <div><dt>{t('caseValue')}</dt><dd>{content(caseStudy.paragraphs[1])}</dd></div>
              </dl>
              <Link to={`/tin-tuc/${caseStudy.slug}`} className="text-link">{t('viewCaseStudy')} <ArrowRight size={16} aria-hidden="true" /></Link>
            </div>
          </div>
        </section>
      )}

      <CustomerShowcase />

      <section className="values-band">
        <div className="container direction-layout">
          <div>
            <span className="eyebrow">{t('directionEyebrow')}</span>
            <h2>{t('directionTitle')}</h2>
            <p>{t('directionDesc')}</p>
          </div>
          <ul className="direction-principles">
            <li><CheckCircle2 aria-hidden="true" /><span>{t('directionPrincipleOne')}</span></li>
            <li><CheckCircle2 aria-hidden="true" /><span>{t('directionPrincipleTwo')}</span></li>
          </ul>
        </div>
      </section>

      <OfficeNetwork description={t('aboutOfficeSummary')} />
    </>
  )
}

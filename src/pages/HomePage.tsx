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

  const supportSteps = language === 'vi'
    ? [
        {
          label: 'KHẢO SÁT ỨNG DỤNG',
          title: 'Làm rõ yêu cầu',
          description: 'Xác định loại mẫu, ứng dụng, tiêu chuẩn và điều kiện vận hành.',
          outcome: 'Thống nhất đúng bài toán kỹ thuật trước khi đề xuất thiết bị.',
          image: '/images/hero/industrial-lab-plant-hero-v6.png',
          imageAlt: 'Kỹ thuật viên vận hành thiết bị phân tích trong phòng thí nghiệm nhà máy',
        },
        {
          label: 'CẤU HÌNH & TRIỂN KHAI',
          title: 'Lựa chọn và triển khai',
          description: 'Tư vấn cấu hình, chuẩn bị lắp đặt và phối hợp đưa thiết bị vào sử dụng.',
          outcome: 'Cấu hình và kế hoạch triển khai bám sát điều kiện sử dụng thực tế.',
          image: '/images/hero/ltvietnam-selected-hero-v7.png',
          imageAlt: 'Kỹ thuật viên thao tác trên thiết bị OptiDist 2 tại nhà máy',
        },
        {
          label: 'CHUYỂN GIAO & HẬU MÃI',
          title: 'Chuyển giao và hỗ trợ',
          description: 'Hướng dẫn vận hành, bàn giao tài liệu và tiếp tục hỗ trợ sau bán hàng.',
          outcome: 'Người vận hành nắm quy trình và có đầu mối hỗ trợ kỹ thuật rõ ràng.',
          image: '/images/hero/industrial-service-hero-v3.png',
          imageAlt: 'Kỹ thuật viên kiểm tra van công nghiệp tại hiện trường',
        },
      ]
    : [
        {
          label: 'APPLICATION REVIEW',
          title: 'Define the requirement',
          description: 'Identify the sample, application, standards and operating conditions.',
          outcome: 'Align on the technical requirement before recommending equipment.',
          image: '/images/hero/industrial-lab-plant-hero-v6.png',
          imageAlt: 'Technician operating analytical equipment in a plant laboratory',
        },
        {
          label: 'CONFIGURATION & DELIVERY',
          title: 'Select and implement',
          description: 'Configure, prepare the installation and commission the equipment.',
          outcome: 'Match the configuration and implementation plan to actual site conditions.',
          image: '/images/hero/ltvietnam-selected-hero-v7.png',
          imageAlt: 'Technician operating an OptiDist 2 instrument at an industrial site',
        },
        {
          label: 'HANDOVER & SUPPORT',
          title: 'Handover and support',
          description: 'Provide operating guidance, documentation and after-sales support.',
          outcome: 'Give operators a clear workflow and a reliable technical point of contact.',
          image: '/images/hero/industrial-service-hero-v3.png',
          imageAlt: 'Technician inspecting an industrial valve on site',
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

  const servicePromises = language === 'vi'
    ? [
        { title: 'Tư vấn đúng ứng dụng', detail: 'Mẫu thử · tiêu chuẩn · điều kiện vận hành', Icon: ClipboardCheck },
        { title: 'Triển khai tại hiện trường', detail: 'Lắp đặt · hướng dẫn · chuyển giao', Icon: Wrench },
        { title: 'Hỗ trợ sau bán hàng', detail: 'Tài liệu · vận hành · kỹ thuật', Icon: LifeBuoy },
      ]
    : [
        { title: 'Application-led advice', detail: 'Sample · standard · operating conditions', Icon: ClipboardCheck },
        { title: 'On-site implementation', detail: 'Installation · guidance · handover', Icon: Wrench },
        { title: 'After-sales support', detail: 'Documentation · operation · technical support', Icon: LifeBuoy },
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
            <span className="eyebrow">
              {language === 'vi' ? 'THIẾT BỊ PHÂN TÍCH · VAN CÔNG NGHIỆP' : 'ANALYTICAL INSTRUMENTS · INDUSTRIAL VALVES'}
            </span>
            <h1>
              {language === 'vi'
                ? 'Giải pháp thiết bị cho phòng thí nghiệm và nhà máy.'
                : 'Equipment solutions for laboratories and plants.'}
            </h1>
            <p>
              {language === 'vi'
                ? 'Thiết bị phân tích PAC, Herzog và van công nghiệp Baker Hughes, được tư vấn theo ứng dụng, lắp đặt và chuyển giao bởi đội ngũ kỹ thuật LT Việt Nam.'
                : 'PAC and Herzog analytical instruments and Baker Hughes industrial valves, selected, installed and handed over by LT Vietnam\'s technical team.'}
            </p>
            <div className="hero-actions">
              <a href="#giai-phap" className="button button-primary">
                {language === 'vi' ? 'Khám phá giải pháp' : 'Explore solutions'}
                <ArrowRight size={17} aria-hidden="true" />
              </a>
              <Link to="/lien-he" className="button button-hero-secondary">
                {language === 'vi' ? 'Trao đổi với kỹ sư' : 'Talk to an engineer'}
              </Link>
            </div>
          </div>

          <div className="hero-trust-bar" aria-label={language === 'vi' ? 'Cam kết dịch vụ' : 'Service commitments'}>
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
            eyebrow={language === 'vi' ? 'NHÓM GIẢI PHÁP' : 'SOLUTION GROUPS'}
            title={language === 'vi' ? 'Thiết bị cho hai nhu cầu cốt lõi' : 'Equipment for two core needs'}
            description={
              language === 'vi'
                ? 'Đi thẳng đến nhóm thiết bị phù hợp với phòng thí nghiệm hoặc hệ thống công nghệ của nhà máy.'
                : 'Go directly to equipment for your laboratory or plant process system.'
            }
          />

          <div className="home-solution-grid">
            <Link to="/pac" className="home-solution-path home-solution-lab">
              <div className="home-solution-copy">
                <span className="home-solution-kicker">PAC · HERZOG</span>
                <h3>{language === 'vi' ? 'Phân tích nhiên liệu và phòng thí nghiệm' : 'Fuel and laboratory analysis'}</h3>
                <p>
                  {language === 'vi'
                    ? 'Thiết bị chưng cất, sắc ký khí, phân tích nguyên tố và kiểm tra tính chất nhiên liệu.'
                    : 'Distillation, gas chromatography, elemental analysis and fuel property testing.'}
                </p>
                <span className="home-solution-link">
                  {language === 'vi' ? 'Khám phá thiết bị PAC' : 'Explore PAC equipment'}
                  <ArrowRight aria-hidden="true" />
                </span>
              </div>
              <div className="home-solution-media home-solution-media-lab" aria-hidden="true">
                <img src="/images/products/optidist-2-official.png" alt="" loading="lazy" decoding="async" />
                <img src="/images/products/cid-510.png" alt="" loading="lazy" decoding="async" />
              </div>
            </Link>

            <Link to="/baker-hughes" className="home-solution-path home-solution-valves">
              <div className="home-solution-copy">
                <span className="home-solution-kicker">BAKER HUGHES</span>
                <h3>{language === 'vi' ? 'Điều khiển và bảo vệ áp suất' : 'Process control and pressure protection'}</h3>
                <p>
                  {language === 'vi'
                    ? 'Van điều khiển Masoneilan, van an toàn Consolidated và thiết bị hỗ trợ vận hành.'
                    : 'Masoneilan control valves, Consolidated safety valves and supporting equipment.'}
                </p>
                <span className="home-solution-link">
                  {language === 'vi' ? 'Khám phá Baker Hughes' : 'Explore Baker Hughes'}
                  <ArrowRight aria-hidden="true" />
                </span>
              </div>
              <div className="home-solution-media home-solution-media-valves" aria-hidden="true">
                <img src="/images/products/valve-21000.jpg" alt="" loading="lazy" decoding="async" />
                <img src="/images/products/consolidated-2700.png" alt="" loading="lazy" decoding="async" />
              </div>
            </Link>
          </div>

          <div className="home-flow-bridge" aria-label={language === 'vi' ? 'Bước tiếp theo' : 'Next step'}>
            <div>
              <span>{language === 'vi' ? 'BƯỚC TIẾP THEO' : 'NEXT STEP'}</span>
              <strong>{language === 'vi' ? 'Từ lựa chọn đến triển khai' : 'From selection to implementation'}</strong>
            </div>
            <p>
              {language === 'vi'
                ? 'Sau khi xác định nhóm thiết bị, đội ngũ kỹ thuật tiếp tục làm rõ yêu cầu, cấu hình và kế hoạch chuyển giao.'
                : 'After identifying the equipment group, the technical team defines requirements, configuration and handover plan.'}
            </p>
            <ArrowDown aria-hidden="true" />
          </div>
        </div>
      </section>

      <section className="home-process-section" aria-labelledby="home-process-title">
        <div className="container">
          <div className="home-process-heading">
            <div>
              <span className="eyebrow">{language === 'vi' ? 'QUY TRÌNH HỖ TRỢ' : 'SUPPORT PROCESS'}</span>
              <h2 id="home-process-title">
                {language === 'vi'
                  ? 'Một quy trình, rõ trách nhiệm ở từng bước'
                  : 'One process, clear responsibility at every step'}
              </h2>
            </div>
            <p>
              {language === 'vi'
                ? 'Chọn từng bước để xem cách LT Việt Nam phối hợp từ yêu cầu ban đầu đến khi thiết bị được đưa vào vận hành.'
                : 'Select each step to see how LT Vietnam works from the initial requirement through equipment operation.'}
            </p>
          </div>

          <div className="home-process-layout">
            <div
              className="home-process-tabs"
              role="tablist"
              aria-label={language === 'vi' ? 'Các bước hỗ trợ kỹ thuật' : 'Technical support steps'}
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
                    onMouseEnter={() => setActiveSupportStep(index)}
                    onKeyDown={(event) => handleSupportKeyDown(event, index)}
                  >
                    <span className="home-process-index">{String(index + 1).padStart(2, '0')}</span>
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
                <span className="home-process-step-count">
                  {language === 'vi' ? 'BƯỚC' : 'STEP'} {String(activeSupportStep + 1).padStart(2, '0')} / {String(supportSteps.length).padStart(2, '0')}
                </span>
              </div>
              <div key={`copy-${activeSupportStep}-${language}`} className="home-process-panel-copy">
                <span className="home-process-label">{activeStep.label}</span>
                <h3>{activeStep.title}</h3>
                <p>{activeStep.description}</p>
                <div className="home-process-outcome">
                  <span>{language === 'vi' ? 'KẾT QUẢ CỦA BƯỚC' : 'STEP OUTCOME'}</span>
                  <strong>{activeStep.outcome}</strong>
                </div>
                <Link to="/gioi-thieu" className="text-link home-process-link">
                  {language === 'vi' ? 'Tìm hiểu cách LT Việt Nam làm việc' : 'How LT Vietnam works'}
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
            eyebrow={language === 'vi' ? 'DỰ ÁN & HOẠT ĐỘNG KỸ THUẬT' : 'PROJECTS & TECHNICAL ACTIVITIES'}
            title={language === 'vi' ? 'Năng lực qua dự án và hoạt động kỹ thuật' : 'Capability through projects and technical activities'}
            description={
              language === 'vi'
                ? 'Các hoạt động lắp đặt, chuyển giao và chia sẻ chuyên môn thể hiện cách đội ngũ LT Việt Nam đồng hành cùng khách hàng.'
                : 'Installation, handover and knowledge-sharing activities show how LT Vietnam supports customers.'
            }
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
            <span className="eyebrow">{language === 'vi' ? 'BẮT ĐẦU TỪ YÊU CẦU CỦA BẠN' : 'START WITH YOUR REQUIREMENT'}</span>
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
            {language === 'vi' ? 'Nhận tư vấn kỹ thuật' : 'Get technical advice'}
            <ArrowRight size={17} aria-hidden="true" />
          </Link>
        </div>
      </section>
    </>
  )
}

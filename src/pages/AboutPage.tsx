import {
  ArrowRight,
  CheckCircle2,
  Download,
  Factory,
  Flame,
  FlaskConical,
  ScanSearch,
  ShieldCheck,
  Wrench,
  Zap,
} from 'lucide-react'
import { Link } from 'react-router'
import { PageIntro, SectionHeading } from '../components/PageElements'
import { RegionalPresence } from '../components/RegionalPresence'
import { useSiteData } from '../context/DataContext'
import type { NewsBlock } from '../data'
import { useSeoHead } from '../components/SeoHead'
import { useLanguage } from '../i18n'

export function AboutPage() {
  const { content, language, t } = useLanguage()
  const { newsItems } = useSiteData()
  useSeoHead({
    title: t('about'),
    description: language === 'vi'
      ? 'Hồ sơ năng lực LT Việt Nam: Đại diện phân phối ủy quyền thiết bị phân tích PAC (Hoa Kỳ) và đối tác kỹ thuật cho các dòng van công nghiệp. Đồng hành trọn vòng đời từ tư vấn tiêu chuẩn đến dịch vụ kỹ thuật hiện trường.'
      : 'LT Vietnam corporate capability: Authorized distributor for PAC analytical instruments (USA) and engineering partner for industrial valves. Delivering end-to-end lifecycle support.',
    canonicalPath: '/gioi-thieu',
    type: 'website',
  })

  const caseStudyRaw = newsItems.find((item) => item.slug === 'hoi-thao-van-an-toan' || item.slugEn === 'hoi-thao-van-an-toan')
  // Policy A: hide case study in EN mode if it has no authored EN translation
  const caseStudy = caseStudyRaw && (language !== 'en' || caseStudyRaw.hasEnglish) ? caseStudyRaw : undefined

  return (
    <>
      <PageIntro
        className="page-intro-about"
        image="/images/hero/industrial-service-hero-v3.png"
        eyebrow="LT VIỆT NAM TECHNOLOGY CO., LTD"
        title={language === 'vi' ? 'Hồ sơ năng lực kỹ thuật và giải pháp phân tích công nghiệp' : 'Technical capability & industrial analytical solutions'}
        description={
          language === 'vi'
            ? 'Đại diện phân phối ủy quyền thiết bị phân tích PAC (Hoa Kỳ) và đối tác dịch vụ kỹ thuật cho các dòng van công nghiệp. Đồng hành trọn vòng đời từ khảo sát ứng dụng, triển khai hiện trường đến bảo hành và phụ tùng chính hãng.'
            : 'Authorized distribution partner for PAC analytical instruments (USA) and engineering partner for industrial valves. Delivering end-to-end lifecycle support from application review to on-site commissioning and genuine spare parts.'
        }
        actions={
          <>
            <Link to="/lien-he?chu-de=ho-so-nang-luc" className="button button-primary">
              <Download size={17} aria-hidden="true" />
              {language === 'vi' ? 'Nhận Hồ sơ Năng lực (Profile)' : 'Request Company Profile'}
            </Link>
            <Link to="/lien-he" className="button button-secondary">
              {t('discussRequirement')}
            </Link>
          </>
        }
        aside={
          <div className="about-hero-scope">
            <span>{language === 'vi' ? 'CHỨNG THỰC NĂNG LỰC' : 'CREDIBILITY HIGHLIGHTS'}</span>
            <ul>
              <li>{language === 'vi' ? 'Đại diện phân phối ủy quyền chính thức PAC (Hoa Kỳ)' : 'Authorized distribution partner for PAC (USA)'}</li>
              <li>{language === 'vi' ? '100% Kỹ sư được đào tạo & cấp chứng chỉ từ hãng' : '100% Factory-trained & certified engineers'}</li>
              <li>{language === 'vi' ? 'Kho phụ tùng, sensor & vật tư tiêu hao sẵn có tại VN' : 'Local inventory of genuine spares & consumables'}</li>
              <li>{language === 'vi' ? 'Hỗ trợ kỹ thuật hiện trường & hiệu chuẩn 24/7' : '24/7 Field technical & calibration support'}</li>
            </ul>
          </div>
        }
      />

      {/* Key Metrics Strip */}
      <section className="about-metrics-section" aria-label={language === 'vi' ? 'Số liệu năng lực' : 'Capability metrics'}>
        <div className="container">
          <div className="about-metrics-grid">
            <div className="about-metric-card">
              <span className="about-metric-number">10<small>+</small></span>
              <span className="about-metric-label">{language === 'vi' ? 'Năm kinh nghiệm chuyên sâu' : 'Years of specialized expertise'}</span>
              <p className="about-metric-desc">
                {language === 'vi'
                  ? 'Phân phối và làm chủ công nghệ thiết bị phân tích phòng lab & van công nghiệp'
                  : 'Distributing and mastering analytical instruments & industrial valves'}
              </p>
            </div>
            <div className="about-metric-card">
              <span className="about-metric-number">100<small>%</small></span>
              <span className="about-metric-label">{language === 'vi' ? 'Kỹ sư chứng nhận bởi PAC' : 'PAC-certified engineering team'}</span>
              <p className="about-metric-desc">
                {language === 'vi'
                  ? 'Được tập đoàn PAC (Hoa Kỳ) đào tạo và cấp chứng chỉ định kỳ hàng năm'
                  : 'Regularly trained and certified directly by PAC Group (USA)'}
              </p>
            </div>
            <div className="about-metric-card">
              <span className="about-metric-number">50<small>+</small></span>
              <span className="about-metric-label">{language === 'vi' ? 'Nhà máy & Phòng Lab tin dùng' : 'Plants & Laboratories supported'}</span>
              <p className="about-metric-desc">
                {language === 'vi'
                  ? 'Bao gồm các nhà máy lọc hóa dầu, nhiệt điện, phân bón và trung tâm Quatest'
                  : 'Including oil refineries, power plants, fertilizer plants and Quatest'}
              </p>
            </div>
            <div className="about-metric-card">
              <span className="about-metric-number">24<small>h</small></span>
              <span className="about-metric-label">{language === 'vi' ? 'Phản hồi & Sẵn sàng ứng cứu' : 'Rapid technical response'}</span>
              <p className="about-metric-desc">
                {language === 'vi'
                  ? 'Tiếp nhận bài toán và cử kỹ sư hỗ trợ hiện trường tại các cụm công nghiệp'
                  : 'Immediate issue triage and field engineer dispatch to industrial clusters'}
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Overview Context */}
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

      {/* 3 Core Engineering Pillars (Replaces duplicate 4-step generic lifecycle) */}
      <section id="capability-lifecycle" className="section about-pillars-section">
        <div className="container">
          <SectionHeading
            eyebrow={language === 'vi' ? 'NĂNG LỰC CỐT LÕI' : 'CORE CAPABILITIES'}
            title={language === 'vi' ? '3 Trụ cột năng lực kỹ thuật tạo nên sự khác biệt' : '3 Core engineering pillars that define our value'}
            description={
              language === 'vi'
                ? 'Chúng tôi không chỉ cung cấp thiết bị mà cung cấp năng lực làm chủ công nghệ, giải pháp đo lường chuẩn xác và dịch vụ đồng hành xuyên suốt vòng đời vận hành.'
                : 'We do not just supply equipment; we deliver technological mastery, precision measurement solutions, and dedicated lifecycle support.'
            }
          />
          
          <div className="about-pillars-grid">
            {/* Pillar 1 */}
            <div className="about-pillar-card">
              <div className="about-pillar-header">
                <div className="about-pillar-icon"><ScanSearch size={26} aria-hidden="true" /></div>
                <span className="about-pillar-index">01</span>
              </div>
              <h3>{language === 'vi' ? 'Làm chủ Tiêu chuẩn & Tư vấn Ứng dụng' : 'Standards Mastery & Application Advisory'}</h3>
              <p>
                {language === 'vi'
                  ? 'Đội ngũ kỹ sư am hiểu sâu sắc hệ thống phương pháp thử nghiệm quốc tế ASTM (D86, D93, D2500, D3241, D5972), ISO và IP. Khảo sát trực tiếp mẫu thử, dải nhiệt độ và điều kiện vận hành tại nhà máy để tư vấn cấu hình chính xác, tránh lãng phí đầu tư.'
                  : 'Our engineering team holds deep expertise in ASTM (D86, D93, D2500, D3241, D5972), ISO and IP test methods. We analyze sample matrices and operating conditions to configure the exact instrument needed.'}
              </p>
              <ul className="about-pillar-points">
                <li>{language === 'vi' ? 'Đối chiếu chính xác phương pháp thử chuẩn ASTM/ISO' : 'Direct mapping to ASTM/ISO standard methods'}</li>
                <li>{language === 'vi' ? 'Cấu hình tối ưu theo mẫu thử thực tế' : 'Optimized configuration for real sample types'}</li>
              </ul>
            </div>

            {/* Pillar 2 */}
            <div className="about-pillar-card">
              <div className="about-pillar-header">
                <div className="about-pillar-icon"><Wrench size={26} aria-hidden="true" /></div>
                <span className="about-pillar-index">02</span>
              </div>
              <h3>{language === 'vi' ? 'Lắp đặt, Nghiệm thu & Chuyển giao Hiện trường' : 'On-Site Commissioning & Handover'}</h3>
              <p>
                {language === 'vi'
                  ? 'Thực hiện quy trình kiểm tra nghiệm thu tại hiện trường (SAT) nghiêm ngặt. Đội ngũ kỹ thuật trực tiếp lắp đặt, đấu nối hạ tầng khí/điện, chạy mẫu chuẩn đối chứng và đào tạo người sử dụng đến khi làm chủ 100% quy trình vận hành và bảo dưỡng cấp 1.'
                  : 'Rigorous Site Acceptance Testing (SAT) on client premises. Our engineers install, connect utilities, run certified reference standards, and train operators until they master complete instrument workflows.'}
              </p>
              <ul className="about-pillar-points">
                <li>{language === 'vi' ? 'Biên bản nghiệm thu kỹ thuật và hồ sơ IQ/OQ hoàn chỉnh' : 'Full IQ/OQ commissioning and technical sign-off'}</li>
                <li>{language === 'vi' ? 'Đào tạo thực hành trực tiếp trên mẫu thật của khách hàng' : 'Hands-on operator training with real site samples'}</li>
              </ul>
            </div>

            {/* Pillar 3 */}
            <div className="about-pillar-card">
              <div className="about-pillar-header">
                <div className="about-pillar-icon"><ShieldCheck size={26} aria-hidden="true" /></div>
                <span className="about-pillar-index">03</span>
              </div>
              <h3>{language === 'vi' ? 'Bảo hành, Hiệu chuẩn & Kho Phụ tùng Sẵn sàng' : 'Genuine Spares, Calibration & Support'}</h3>
              <p>
                {language === 'vi'
                  ? 'Khắc phục triệt để nỗi lo gián đoạn phân tích của phòng lab. Chúng tôi lưu kho sẵn các phụ tùng tiêu hao chính hãng (bầu chưng cất, cảm biến nhiệt độ, phớt làm kín, điện cực) ngay tại Việt Nam cùng chính sách hỗ trợ kỹ thuật hiện trường trong vòng 24 giờ.'
                  : 'Eliminating laboratory downtime. We maintain local stock of genuine consumables (distillation flasks, Pt100 sensors, seals, electrodes) in Vietnam, backed by rapid 24-hour on-site technical response.'}
              </p>
              <ul className="about-pillar-points">
                <li>{language === 'vi' ? 'Phụ tùng, vật tư tiêu hao chính hãng PAC có sẵn tại kho' : 'Local inventory of genuine PAC replacement parts'}</li>
                <li>{language === 'vi' ? 'Đội ngũ kỹ thuật ứng cứu và bảo trì định kỳ tại chỗ' : 'Local emergency support & preventative maintenance'}</li>
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* Sector Experience & Track Record (Replaces duplicate 1-to-1 customer logo grid) */}
      <section className="section about-sectors-section">
        <div className="container">
          <SectionHeading
            eyebrow={language === 'vi' ? 'KINH NGHIỆM THỰC CHIẾN' : 'INDUSTRY EXPERIENCE'}
            title={language === 'vi' ? 'Đồng hành cùng các phân ngành công nghiệp trọng điểm' : 'Trusted partner across key industrial sectors'}
            description={
              language === 'vi'
                ? 'Kinh nghiệm triển khai thực tế tại các dự án trọng điểm quốc gia, khẳng định năng lực đáp ứng những yêu cầu kỹ thuật khắt khe nhất.'
                : 'Proven track record across national flagship projects, demonstrating our capability to meet the most demanding technical standards.'
            }
          />

          <div className="about-sectors-grid">
            {/* Sector 1: Refining & Petrochemicals */}
            <div className="about-sector-card">
              <div className="about-sector-header">
                <div className="about-sector-icon"><Flame size={22} aria-hidden="true" /></div>
                <div>
                  <span className="about-sector-badge">{language === 'vi' ? 'DẦU KHÍ & HÓA CHẤT' : 'OIL & PETROCHEMICAL'}</span>
                  <h4>{language === 'vi' ? 'Lọc hóa dầu & Chế biến Khí' : 'Refining & Petrochemicals'}</h4>
                </div>
              </div>
              <p className="about-sector-desc">
                {language === 'vi'
                  ? 'Cung cấp thiết bị kiểm tra chất lượng nhiên liệu (chưng cất Herzog, chớp cháy ISL, điểm đông đặc Phase) cho các phòng kiểm nghiệm trung tâm và trạm phân tích online.'
                  : 'Supplying fuel testing instruments (Herzog distillation, ISL flash point, Phase cold flow) for central quality control labs and on-line monitoring stations.'}
              </p>
              <div className="about-sector-clients">
                <span className="about-clients-label">{language === 'vi' ? 'Đối tác tiêu biểu:' : 'Key clients:'}</span>
                <div className="about-client-tags">
                  <span className="client-tag">BSR Dung Quất</span>
                  <span className="client-tag">Nghi Sơn (NSRP)</span>
                  <span className="client-tag">Đạm Phú Mỹ (PVFCCo)</span>
                  <span className="client-tag">PVOIL</span>
                </div>
              </div>
            </div>

            {/* Sector 2: Power Generation */}
            <div className="about-sector-card">
              <div className="about-sector-header">
                <div className="about-sector-icon"><Zap size={22} aria-hidden="true" /></div>
                <div>
                  <span className="about-sector-badge">{language === 'vi' ? 'NĂNG LƯỢNG' : 'POWER & UTILITIES'}</span>
                  <h4>{language === 'vi' ? 'Nhiệt điện & Năng lượng Khí' : 'Power Generation & Gas Utilities'}</h4>
                </div>
              </div>
              <p className="about-sector-desc">
                {language === 'vi'
                  ? 'Tư vấn cấu hình và cung cấp giải pháp van điều khiển Masoneilan, van an toàn Consolidated chịu áp suất và nhiệt độ cao, đảm bảo vận hành an toàn tuyệt đối cho tổ máy.'
                  : 'Consulting and supplying Masoneilan control valves and Consolidated safety valves engineered for high pressure and temperature to ensure continuous turbine safety.'}
              </p>
              <div className="about-sector-clients">
                <span className="about-clients-label">{language === 'vi' ? 'Đối tác tiêu biểu:' : 'Key clients:'}</span>
                <div className="about-client-tags">
                  <span className="client-tag">PV Power</span>
                  <span className="client-tag">Nhà máy điện Cà Mau</span>
                  <span className="client-tag">PV Gas City</span>
                  <span className="client-tag">PMS</span>
                </div>
              </div>
            </div>

            {/* Sector 3: Testing & Commercial Inspection */}
            <div className="about-sector-card">
              <div className="about-sector-header">
                <div className="about-sector-icon"><FlaskConical size={22} aria-hidden="true" /></div>
                <div>
                  <span className="about-sector-badge">{language === 'vi' ? 'THỬ NGHIỆM & KIỂM ĐỊNH' : 'TESTING & INSPECTION'}</span>
                  <h4>{language === 'vi' ? 'Phòng Thử nghiệm Độc lập' : 'Commercial Testing Laboratories'}</h4>
                </div>
              </div>
              <p className="about-sector-desc">
                {language === 'vi'
                  ? 'Trang bị các hệ thống phân tích tự động PAC đáp ứng hoàn toàn các tiêu chuẩn thương mại quốc tế (ASTM/ISO) phục vụ công tác cấp chứng nhận hàng hóa và giám định thương mại.'
                  : 'Equipping automated PAC testing suites fully compliant with international commercial standards (ASTM/ISO) for commodity certification and custody transfer.'}
              </p>
              <div className="about-sector-clients">
                <span className="about-clients-label">{language === 'vi' ? 'Đối tác tiêu biểu:' : 'Key clients:'}</span>
                <div className="about-client-tags">
                  <span className="client-tag">Quatest 1 / 2 / 3</span>
                  <span className="client-tag">PTSC</span>
                  <span className="client-tag">SGS Vietnam</span>
                  <span className="client-tag">Intertek</span>
                </div>
              </div>
            </div>

            {/* Sector 4: Heavy Industry & Infrastructure */}
            <div className="about-sector-card">
              <div className="about-sector-header">
                <div className="about-sector-icon"><Factory size={22} aria-hidden="true" /></div>
                <div>
                  <span className="about-sector-badge">{language === 'vi' ? 'CÔNG NGHIỆP NẶNG' : 'HEAVY INDUSTRY'}</span>
                  <h4>{language === 'vi' ? 'Công nghiệp nặng & Vật liệu' : 'Heavy Industry & Materials'}</h4>
                </div>
              </div>
              <p className="about-sector-desc">
                {language === 'vi'
                  ? 'Hỗ trợ kỹ thuật, van công nghiệp chịu mài mòn và phụ tùng thay thế cho các dây chuyền sản xuất quy mô lớn, nhà máy xi măng và công trình phụ trợ.'
                  : 'Engineering support, erosion-resistant industrial valves and genuine replacement parts for large-scale production lines, cement plants and balance-of-plant systems.'}
              </p>
              <div className="about-sector-clients">
                <span className="about-clients-label">{language === 'vi' ? 'Đối tác tiêu biểu:' : 'Key clients:'}</span>
                <div className="about-client-tags">
                  <span className="client-tag">Thyssenkrupp</span>
                  <span className="client-tag">Xi măng Xuân Thành</span>
                  <span className="client-tag">Hamon Infrastructure</span>
                  <span className="client-tag">Đạm Ninh Bình</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Case Study Feature */}
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
              {(() => {
                const caseStudyParagraphs = caseStudy.blocksByLocale
                  ? caseStudy.blocksByLocale[language].filter((b): b is Extract<NewsBlock, { type: 'paragraph' }> => b.type === 'paragraph').map((b) => b.text)
                  : caseStudy.paragraphs

                return (
                  <>
                    {(caseStudyParagraphs?.[0] || caseStudyParagraphs?.[2] || caseStudyParagraphs?.[1]) && (
                      <dl className="case-study-facts">
                        {caseStudyParagraphs?.[0] && (
                          <div><dt>{t('caseContext')}</dt><dd>{content(caseStudyParagraphs[0])}</dd></div>
                        )}
                        {caseStudyParagraphs?.[2] && (
                          <div><dt>{t('caseApproach')}</dt><dd>{content(caseStudyParagraphs[2])}</dd></div>
                        )}
                        {caseStudyParagraphs?.[1] && (
                          <div><dt>{t('caseValue')}</dt><dd>{content(caseStudyParagraphs[1])}</dd></div>
                        )}
                      </dl>
                    )}
                    <Link to={`/tin-tuc/${language === 'en' && caseStudy.slugEn ? caseStudy.slugEn : caseStudy.slug}`} className="text-link">
                      {t('viewCaseStudy')} <ArrowRight size={16} aria-hidden="true" />
                    </Link>
                  </>
                )
              })()}
            </div>
          </div>
        </section>
      )}

      {/* Direction & Commitments */}
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

      {/* Regional Presence */}
      <RegionalPresence />
    </>
  )
}

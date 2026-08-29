import { Building2, CheckCircle2, Handshake, Target, Wrench } from 'lucide-react'
import { Link } from 'react-router'
import { PageIntro, SectionHeading } from '../components/PageElements'
import { offices } from '../data'
import { usePageTitle } from '../hooks'
import { useLanguage } from '../i18n'

export function AboutPage() {
  const { language, t } = useLanguage()
  usePageTitle(t('about'))

  return (
    <>
      <PageIntro
        className="page-intro-about"
        image="/images/hero/industrial-service-hero-v3.png"
        eyebrow="LT VIỆT NAM TECHNOLOGY CO., LTD"
        title={language === 'vi' ? 'Năng lực kỹ thuật cho công nghiệp và phòng thí nghiệm' : 'Technical capability for industry and laboratories'}
        description={
          language === 'vi'
            ? 'Tổng quan về lĩnh vực hoạt động, năng lực hỗ trợ và hệ thống văn phòng của LT Việt Nam.'
            : 'An overview of LT Vietnam, our technical capabilities and office network.'
        }
      />

      <section className="section">
        <div className="container about-overview-grid">
          <div className="about-overview-copy">
            <h2>
              {language === 'vi'
                ? 'Đối tác cung cấp thiết bị và dịch vụ kỹ thuật'
                : 'Equipment and technical service partner'}
            </h2>
            <p>
              {language === 'vi'
                ? 'LT Việt Nam cung cấp thiết bị, phụ tùng và vật tư tiêu hao cho các nhà máy công nghiệp nặng tại Việt Nam, bao gồm lọc hóa dầu, khí, phân bón, điện, xi măng và phòng thí nghiệm.'
                : 'LT Vietnam supplies equipment, spare parts and consumables to heavy industrial plants across Vietnam, including refining, gas, fertilizer, power, cement and laboratory operations.'}
            </p>
            <p>
              {language === 'vi'
                ? 'Danh mục trọng tâm gồm thiết bị PAC, van Masoneilan, van an toàn Consolidated cùng dịch vụ tư vấn, lắp đặt và hỗ trợ sau bán hàng.'
                : 'Our core portfolio covers PAC instruments, Masoneilan valves, Consolidated safety valves, installation and after-sales support.'}
            </p>
          </div>
          <div className="about-overview-image">
            <img src="/images/news/safety-valve-seminar.jpg" alt="Hội thảo kỹ thuật LT Việt Nam" loading="lazy" decoding="async" />
          </div>
        </div>
      </section>

      <section className="section capabilities-section">
        <div className="container">
          <SectionHeading
            title={language === 'vi' ? 'Một đầu mối cho toàn bộ vòng đời thiết bị' : 'One partner across the equipment lifecycle'}
            description={language === 'vi' ? 'Từ lựa chọn cấu hình đến vận hành, mỗi giai đoạn đều có đầu mối kỹ thuật chịu trách nhiệm rõ ràng.' : 'From configuration selection to operation, every stage has a clear technical owner.'}
          />
          <div className="capability-grid">
            <article><Target aria-hidden="true" /><h3>{language === 'vi' ? 'Tư vấn lựa chọn' : 'Solution consultation'}</h3><p>{language === 'vi' ? 'Phân tích ứng dụng, phương pháp và cấu hình phù hợp.' : 'Review applications, methods and suitable configurations.'}</p></article>
            <article><Building2 aria-hidden="true" /><h3>{language === 'vi' ? 'Cung cấp thiết bị' : 'Equipment supply'}</h3><p>{language === 'vi' ? 'PAC, Masoneilan, Consolidated và phụ kiện liên quan.' : 'PAC, Masoneilan, Consolidated and related accessories.'}</p></article>
            <article><Wrench aria-hidden="true" /><h3>{language === 'vi' ? 'Hỗ trợ kỹ thuật' : 'Technical support'}</h3><p>{language === 'vi' ? 'Lắp đặt, chạy thử, hướng dẫn vận hành và hậu mãi.' : 'Installation, commissioning, operation guidance and after-sales support.'}</p></article>
          </div>
        </div>
      </section>

      <section className="values-band">
        <div className="container">
          <SectionHeading
            title={language === 'vi' ? 'Định hướng phát triển' : 'Our direction'}
            description={language === 'vi' ? 'Giá trị được xây dựng từ năng lực kỹ thuật, trách nhiệm và hiệu quả vận hành dài hạn.' : 'Value built on technical capability, accountability and long-term operational performance.'}
          />
          <div className="values-grid">
            <article>
              <Target aria-hidden="true" />
              <div><h3>{language === 'vi' ? 'Tầm nhìn' : 'Vision'}</h3><p>{language === 'vi' ? 'Trở thành đối tác được khách hàng ưu tiên lựa chọn nhờ chất lượng sản phẩm, năng lực kỹ thuật và trách nhiệm.' : 'Become a preferred partner through product quality, technical capability and accountability.'}</p></div>
            </article>
            <article>
              <Handshake aria-hidden="true" />
              <div><h3>{language === 'vi' ? 'Sứ mệnh' : 'Mission'}</h3><p>{language === 'vi' ? 'Cung cấp giải pháp phù hợp, hỗ trợ rõ ràng và tạo hiệu quả vận hành lâu dài.' : 'Provide suitable solutions, clear support and lasting operational value.'}</p></div>
            </article>
          </div>
        </div>
      </section>

      <section className="section office-section">
        <div className="container">
          <SectionHeading
            title={t('offices')}
            description={language === 'vi' ? 'Ba điểm hỗ trợ giúp đội ngũ phối hợp nhanh hơn với khách hàng trên toàn quốc.' : 'Three offices help our team respond to customers nationwide.'}
          />
          <div className="office-grid">
            {offices.map((office) => (
              <article key={office.city} className="office-card">
                <span>{office.label}</span>
                <h3>{office.city}</h3>
                <p>{office.address}</p>
                <strong>{office.phone}</strong>
              </article>
            ))}
          </div>
          <div className="inline-cta">
            <CheckCircle2 aria-hidden="true" />
            <span>{language === 'vi' ? 'Bạn cần trao đổi với văn phòng gần nhất?' : 'Need to contact the nearest office?'}</span>
            <Link to="/lien-he" className="text-link">{t('contact')}</Link>
          </div>
        </div>
      </section>
    </>
  )
}

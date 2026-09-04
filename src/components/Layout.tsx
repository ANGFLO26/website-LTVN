import { useEffect, useState } from 'react'
import {
  ArrowRight,
  Languages,
  Mail,
  MapPin,
  Menu,
  Phone,
  X,
} from 'lucide-react'
import { Link, NavLink, Outlet, useLocation } from 'react-router'
import { offices } from '../data'
import { useLanguage, type UiKey } from '../i18n'

const navItems: Array<{ to: string; end?: boolean; key?: UiKey; label?: string }> = [
  { to: '/', key: 'home' as const, end: true },
  { to: '/gioi-thieu', key: 'about' as const },
  { to: '/pac', label: 'PAC' },
  { to: '/baker-hughes', label: 'BAKER HUGHES' },
  { to: '/tin-tuc-su-kien', key: 'news' as const },
  { to: '/lien-he', key: 'contact' as const },
]

function Header() {
  const [open, setOpen] = useState(false)
  const { language, setLanguage, t } = useLanguage()

  useEffect(() => {
    if (!open) return

    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setOpen(false)
    }

    window.addEventListener('keydown', closeOnEscape)
    return () => window.removeEventListener('keydown', closeOnEscape)
  }, [open])

  return (
    <header className="site-header">
      <div className="header-inner">
        <div className="header-brand-zone">
          <Link to="/" className="brand" aria-label={t('brandHomeLabel')} onClick={() => setOpen(false)}>
            <img src="/images/brand/ltv-logo.png" alt="LT Việt Nam Logo" />
            <span>
              <strong>LT VIỆT NAM</strong>
              <small>TECHNOLOGY CO., LTD</small>
            </span>
          </Link>
        </div>

        <nav className={`main-nav ${open ? 'is-open' : ''}`} aria-label={t('navigation')}>
          {navItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}
              onClick={() => setOpen(false)}
            >
              {item.key ? t(item.key) : item.label}
            </NavLink>
          ))}
        </nav>

        <div className="header-actions">
          <div className="language-switch" aria-label={t('languageLabel')}>
            <Languages size={16} aria-hidden="true" />
            <button
              type="button"
              className={language === 'vi' ? 'active' : ''}
              onClick={() => setLanguage('vi')}
              aria-pressed={language === 'vi'}
            >
              VI
            </button>
            <span>/</span>
            <button
              type="button"
              className={language === 'en' ? 'active' : ''}
              onClick={() => setLanguage('en')}
              aria-pressed={language === 'en'}
            >
              EN
            </button>
          </div>
          <button
            type="button"
            className="menu-button"
            aria-label={open ? t('closeMenu') : t('menu')}
            aria-expanded={open}
            onClick={() => setOpen((value) => !value)}
          >
            {open ? <X aria-hidden="true" /> : <Menu aria-hidden="true" />}
          </button>
        </div>
      </div>
    </header>
  )
}

function Footer() {
  const { content, language, t } = useLanguage()
  const mainOffice = offices[0]
  const companyLinks = navItems.filter((item) => item.to !== '/pac' && item.to !== '/baker-hughes')

  return (
    <footer className="site-footer">
      <div className="container footer-brand-strip">
        <span>{language === 'vi' ? 'THƯƠNG HIỆU GIẢI PHÁP' : 'SOLUTION BRANDS'}</span>
        <div>
          <strong>PAC</strong>
          <strong>HERZOG</strong>
          <strong>MASONEILAN</strong>
          <strong>CONSOLIDATED</strong>
        </div>
      </div>

      <div className="container footer-grid">
        <div className="footer-brand">
          <Link to="/" className="brand brand-footer">
            <img src="/images/brand/ltv-logo.png" alt="LT Việt Nam Logo" />
            <span>
              <strong>LT VIỆT NAM</strong>
              <small>TECHNOLOGY CO., LTD</small>
            </span>
          </Link>
          <p>
            {language === 'vi'
              ? 'Thiết bị phân tích, van công nghiệp và giải pháp kỹ thuật cho phòng thí nghiệm và nhà máy.'
              : 'Analytical instruments, industrial valves and technical solutions for laboratories and plants.'}
          </p>
        </div>

        <div className="footer-group">
          <h2>{language === 'vi' ? 'Giải pháp' : 'Solutions'}</h2>
          <div className="footer-links">
            <Link to="/pac">PAC · Herzog</Link>
            <Link to="/baker-hughes">Baker Hughes</Link>
          </div>
        </div>

        <div className="footer-group">
          <h2>{language === 'vi' ? 'Công ty' : 'Company'}</h2>
          <div className="footer-links">
            {companyLinks.map((item) => (
              <Link key={item.to} to={item.to}>
                {item.key ? t(item.key) : item.label}
              </Link>
            ))}
          </div>
        </div>

        <div className="footer-group footer-group-contact">
          <h2>{t('contact')}</h2>
          <div className="footer-contact">
            <a href="tel:+842466506373">
              <Phone size={16} aria-hidden="true" /> {mainOffice.phone}
            </a>
            <a href="mailto:Sales@ltvietnam.com.vn">
              <Mail size={16} aria-hidden="true" /> Sales@ltvietnam.com.vn
            </a>
            <span>
              <MapPin size={16} aria-hidden="true" /> {content(mainOffice.address)}
            </span>
          </div>
        </div>
      </div>
      <div className="footer-bottom">
        <div className="container">© 2026 LT Việt Nam. {t('copyright')}</div>
      </div>
    </footer>
  )
}

function PreFooterCta({ pathname }: { pathname: string }) {
  const { language } = useLanguage()
  const isPacCatalog = pathname === '/pac'
  const isBakerCatalog = pathname === '/baker-hughes'

  if (!isPacCatalog && !isBakerCatalog) return null

  const copy = isPacCatalog
    ? {
        eyebrow: language === 'vi' ? 'HỖ TRỢ LỰA CHỌN THIẾT BỊ' : 'EQUIPMENT SELECTION SUPPORT',
        title: language === 'vi'
          ? 'Chưa xác định được thiết bị phù hợp với phương pháp thử?'
          : 'Not sure which instrument fits your test method?',
        description: language === 'vi'
          ? 'Cung cấp loại mẫu, phương pháp hoặc tiêu chuẩn áp dụng để đội ngũ kỹ thuật đối chiếu cấu hình phù hợp.'
          : 'Share the sample type, method or applicable standard so our technical team can help match the right configuration.',
        action: language === 'vi' ? 'Nhờ tư vấn thiết bị phân tích' : 'Request analytical instrument advice',
        to: '/lien-he?nhom=pac',
      }
    : {
        eyebrow: language === 'vi' ? 'HỖ TRỢ LỰA CHỌN GIẢI PHÁP VAN' : 'VALVE SOLUTION SELECTION SUPPORT',
        title: language === 'vi'
          ? 'Cần lựa chọn van theo điều kiện vận hành?'
          : 'Selecting a valve for specific operating conditions?',
        description: language === 'vi'
          ? 'Cung cấp môi chất, áp suất, nhiệt độ và yêu cầu ứng dụng để đội ngũ kỹ thuật hỗ trợ xác định giải pháp.'
          : 'Share the process medium, pressure, temperature and application requirements so our technical team can help identify a suitable solution.',
        action: language === 'vi' ? 'Nhờ tư vấn giải pháp van' : 'Request valve solution advice',
        to: '/lien-he?nhom=baker-hughes',
      }

  return (
    <section className="pre-footer-cta pre-footer-cta-paper">
      <div className="container pre-footer-cta-inner">
        <div>
          <span className="eyebrow">{copy.eyebrow}</span>
          <h2>{copy.title}</h2>
          <p>{copy.description}</p>
        </div>
        <Link to={copy.to} className="button button-primary">
          {copy.action}
          <ArrowRight size={18} aria-hidden="true" />
        </Link>
      </div>
    </section>
  )
}

export function Layout() {
  const location = useLocation()
  const { t } = useLanguage()

  useEffect(() => {
    if (location.hash) {
      const targetId = decodeURIComponent(location.hash.slice(1))
      const frame = window.requestAnimationFrame(() => {
        const target = document.getElementById(targetId)
        const header = document.querySelector<HTMLElement>('.site-header')

        if (!target) return

        const headerOffset = header?.getBoundingClientRect().height ?? 0
        const targetTop = window.scrollY + target.getBoundingClientRect().top - headerOffset - 16
        window.scrollTo({ top: Math.max(0, targetTop), behavior: 'instant' })
      })

      return () => window.cancelAnimationFrame(frame)
    }

    window.scrollTo({ top: 0, behavior: 'instant' })
  }, [location.hash, location.pathname])

  return (
    <div className="site-shell">
      <a className="skip-link" href="#main-content">{t('skipNavigation')}</a>
      <Header />
      <main id="main-content">
        <Outlet />
      </main>
      <PreFooterCta pathname={location.pathname} />
      <Footer />
    </div>
  )
}

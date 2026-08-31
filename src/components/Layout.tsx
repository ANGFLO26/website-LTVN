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
          <Link to="/" className="brand" aria-label="LT Việt Nam - Trang chủ" onClick={() => setOpen(false)}>
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
          <div className="language-switch" aria-label={language === 'vi' ? 'Ngôn ngữ hiển thị' : 'Display language'}>
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
      <div className="site-scroll-progress" aria-hidden="true" />
    </header>
  )
}

function Footer() {
  const { language, t } = useLanguage()
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

        <div>
          <h2>{language === 'vi' ? 'Giải pháp' : 'Solutions'}</h2>
          <div className="footer-links">
            <Link to="/pac">PAC · Herzog</Link>
            <Link to="/baker-hughes">Baker Hughes</Link>
          </div>
        </div>

        <div>
          <h2>{language === 'vi' ? 'Công ty' : 'Company'}</h2>
          <div className="footer-links">
            {companyLinks.map((item) => (
              <Link key={item.to} to={item.to}>
                {item.key ? t(item.key) : item.label}
              </Link>
            ))}
          </div>
        </div>

        <div>
          <h2>{t('contact')}</h2>
          <div className="footer-contact">
            <a href="tel:+842466506373">
              <Phone size={16} aria-hidden="true" /> {mainOffice.phone}
            </a>
            <a href="mailto:Sales@ltvietnam.com.vn">
              <Mail size={16} aria-hidden="true" /> Sales@ltvietnam.com.vn
            </a>
            <span>
              <MapPin size={16} aria-hidden="true" /> {mainOffice.address}
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

  if (pathname === '/' || pathname === '/lien-he' || pathname.startsWith('/san-pham/')) {
    return null
  }

  return (
    <section className="pre-footer-cta">
      <div className="container pre-footer-cta-inner">
        <div>
          <span className="eyebrow">
            {language === 'vi' ? 'HỖ TRỢ TỪ ĐỘI NGŨ KỸ THUẬT' : 'SUPPORT FROM OUR TECHNICAL TEAM'}
          </span>
          <h2>
            {language === 'vi'
              ? 'Trao đổi yêu cầu trước khi lựa chọn thiết bị'
              : 'Discuss your requirements before selecting equipment'}
          </h2>
          <p>
            {language === 'vi'
              ? 'Cung cấp loại mẫu, tiêu chuẩn hoặc điều kiện vận hành để nhận tư vấn đúng trọng tâm.'
              : 'Share the sample, standard or operating conditions for focused technical advice.'}
          </p>
        </div>
        <Link to="/lien-he" className="button button-primary">
          {language === 'vi' ? 'Gửi yêu cầu kỹ thuật' : 'Send a technical request'}
          <ArrowRight size={18} aria-hidden="true" />
        </Link>
      </div>
    </section>
  )
}

export function Layout() {
  const location = useLocation()

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'instant' })
  }, [location.pathname])

  useEffect(() => {
    const progress = document.querySelector<HTMLElement>('.site-scroll-progress')
    const header = document.querySelector<HTMLElement>('.site-header')
    const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    let scrollFrame = 0

    const updateScrollState = () => {
      const scrollRange = document.documentElement.scrollHeight - window.innerHeight
      const value = scrollRange > 0 ? Math.min(window.scrollY / scrollRange, 1) : 0
      progress?.style.setProperty('--scroll-progress', String(value))
      header?.classList.toggle('is-scrolled', window.scrollY > 12)
      scrollFrame = 0
    }

    const requestScrollUpdate = () => {
      if (!scrollFrame) scrollFrame = window.requestAnimationFrame(updateScrollState)
    }

    window.addEventListener('scroll', requestScrollUpdate, { passive: true })
    window.addEventListener('resize', requestScrollUpdate)
    updateScrollState()

    const revealSelector = [
      '.section-heading',
      '.home-solution-path',
      '.home-flow-bridge',
      '.home-process-heading > *',
      '.home-process-tabs',
      '.home-process-panel',
      '.home-news-grid > *',
      '.contact-cta-inner > *',
      '.about-overview-grid > *',
      '.capability-grid > *',
      '.values-grid > *',
      '.office-grid > *',
      '.inline-cta > *',
      '.catalog-toolbar',
      '.catalog-category-strip',
      '.catalog-result-head',
      '.product-grid > *',
      '.featured-story-grid > *',
      '.news-filter',
      '.news-grid > *',
      '.contact-layout > *',
      '.product-detail-grid > *',
      '.product-information-grid > *',
      '.article-header > *',
      '.article-image',
      '.article-body > *',
      '.article-related-inner > *',
      '.pre-footer-cta-inner > *',
    ].join(',')

    const revealItems = Array.from(document.querySelectorAll<HTMLElement>(revealSelector))
    let observer: IntersectionObserver | undefined

    if (!reduceMotion && 'IntersectionObserver' in window) {
      revealItems.forEach((item) => {
        const siblings = item.parentElement ? Array.from(item.parentElement.children) : []
        const siblingIndex = Math.max(siblings.indexOf(item), 0)
        item.classList.add('scroll-reveal')
        item.style.setProperty('--reveal-delay', `${Math.min(siblingIndex, 3) * 70}ms`)
      })

      observer = new IntersectionObserver(
        (entries) => {
          entries.forEach((entry) => {
            if (!entry.isIntersecting) return
            entry.target.classList.add('is-visible')
            observer?.unobserve(entry.target)
          })
        },
        { rootMargin: '0px 0px -8% 0px', threshold: 0.08 },
      )

      revealItems.forEach((item) => observer?.observe(item))
    } else {
      revealItems.forEach((item) => item.classList.add('is-visible'))
    }

    return () => {
      window.removeEventListener('scroll', requestScrollUpdate)
      window.removeEventListener('resize', requestScrollUpdate)
      if (scrollFrame) window.cancelAnimationFrame(scrollFrame)
      observer?.disconnect()
    }
  }, [location.pathname])

  return (
    <div className="site-shell">
      <a className="skip-link" href="#main-content">Bỏ qua điều hướng</a>
      <Header />
      <main id="main-content">
        <Outlet />
      </main>
      <PreFooterCta pathname={location.pathname} />
      <Footer />
    </div>
  )
}

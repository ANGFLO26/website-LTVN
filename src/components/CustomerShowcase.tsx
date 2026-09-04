import { SectionHeading } from './PageElements'
import { useLanguage } from '../i18n'

type CustomerLogo = {
  id: string
  name: { vi: string; en: string }
  logo: string
  width: number
  height: number
}

const customers: CustomerLogo[] = [
  {
    id: 'pvfcco',
    name: { vi: 'PVFCCo - Phú Mỹ', en: 'PVFCCo - Phu My' },
    logo: '/images/customers/logos/pvfcco.webp',
    width: 600,
    height: 600,
  },
  {
    id: 'pv-power',
    name: { vi: 'PV Power', en: 'PV Power' },
    logo: '/images/customers/logos/pv-power.jpg',
    width: 600,
    height: 500,
  },
  {
    id: 'pms',
    name: { vi: 'PMS', en: 'Petroleum Maintenance Services (PMS)' },
    logo: '/images/customers/logos/pms.jpg',
    width: 561,
    height: 600,
  },
  {
    id: 'bsr-bf',
    name: { vi: 'BSR-BF', en: 'BSR-BF' },
    logo: '/images/customers/logos/bsr-bf.png',
    width: 72,
    height: 85,
  },
  {
    id: 'nsrp',
    name: { vi: 'Lọc hóa dầu Nghi Sơn (NSRP)', en: 'Nghi Son Refinery (NSRP)' },
    logo: '/images/customers/logos/nsrp.svg',
    width: 335,
    height: 84,
  },
  {
    id: 'ptsc',
    name: { vi: 'PTSC', en: 'PTSC' },
    logo: '/images/customers/logos/ptsc.png',
    width: 150,
    height: 124,
  },
  {
    id: 'pv-gas-city',
    name: { vi: 'PV Gas City', en: 'PV Gas City' },
    logo: '/images/customers/logos/pv-gas-city.jpg',
    width: 75,
    height: 98,
  },
  {
    id: 'bsr',
    name: { vi: 'Lọc hóa dầu Bình Sơn (BSR)', en: 'Binh Son Refining and Petrochemical (BSR)' },
    logo: '/images/customers/logos/bsr.png',
    width: 584,
    height: 600,
  },
  {
    id: 'dam-ninh-binh',
    name: { vi: 'Đạm Ninh Bình', en: 'Ninh Binh Fertilizer' },
    logo: '/images/customers/logos/dam-ninh-binh.png',
    width: 179,
    height: 120,
  },
  {
    id: 'thyssenkrupp',
    name: { vi: 'thyssenkrupp', en: 'thyssenkrupp' },
    logo: '/images/customers/logos/thyssenkrupp.svg',
    width: 100,
    height: 76,
  },
  {
    id: 'hamon',
    name: { vi: 'Hamon Infrastructure', en: 'Hamon Infrastructure' },
    logo: '/images/customers/logos/hamon.png',
    width: 600,
    height: 353,
  },
  {
    id: 'xuan-thanh',
    name: { vi: 'Xi măng Xuân Thành', en: 'Xuan Thanh Cement' },
    logo: '/images/customers/logos/xuan-thanh.png',
    width: 600,
    height: 360,
  },
  {
    id: 'phuc-loc',
    name: { vi: 'Phúc Lộc Group', en: 'Phuc Loc Group' },
    logo: '/images/customers/logos/phuc-loc.png',
    width: 373,
    height: 417,
  },
  {
    id: 'dam-ha-bac',
    name: { vi: 'Đạm Hà Bắc', en: 'Ha Bac Fertilizer' },
    logo: '/images/customers/logos/dam-ha-bac.png',
    width: 600,
    height: 595,
  },
  {
    id: 'pvoil',
    name: { vi: 'PVOIL', en: 'PVOIL' },
    logo: '/images/customers/logos/pvoil.png',
    width: 366,
    height: 116,
  },
  {
    id: 'castrol',
    name: { vi: 'Castrol', en: 'Castrol' },
    logo: '/images/customers/logos/castrol.svg',
    width: 456,
    height: 110,
  },
  {
    id: 'hyundai-ec',
    name: { vi: 'Hyundai Engineering & Construction', en: 'Hyundai Engineering & Construction' },
    logo: '/images/customers/logos/hyundai-ec.png',
    width: 600,
    height: 123,
  },
  {
    id: 'vietsovpetro',
    name: { vi: 'Vietsovpetro', en: 'Vietsovpetro' },
    logo: '/images/customers/logos/vietsovpetro.png',
    width: 180,
    height: 128,
  },
]

export function CustomerShowcase() {
  const { language, t } = useLanguage()

  return (
    <section className="section customers-section" aria-labelledby="customers-title">
      <div className="container">
        <SectionHeading
          eyebrow={t('customersEyebrow')}
          title={t('customersTitle')}
          titleId="customers-title"
          description={t('customersDescription')}
        />

        <div className="customers-showcase">
          <ul className="customer-logo-grid" aria-label={t('customersListLabel')}>
            {customers.map((customer) => (
              <li key={customer.id} className="customer-logo-item">
                <img
                  className="customer-logo"
                  src={customer.logo}
                  width={customer.width}
                  height={customer.height}
                  alt={customer.name[language]}
                  loading="lazy"
                />
              </li>
            ))}
          </ul>
        </div>
      </div>
    </section>
  )
}

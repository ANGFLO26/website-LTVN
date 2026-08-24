import { ArrowLeft } from 'lucide-react'
import { Link } from 'react-router'
import { usePageTitle } from '../hooks'

export function NotFoundPage() {
  usePageTitle('Không tìm thấy trang')
  return (
    <section className="not-found container">
      <span className="eyebrow">404</span>
      <h1>Không tìm thấy trang</h1>
      <p>Đường dẫn bạn truy cập không tồn tại hoặc đã được thay đổi.</p>
      <Link to="/" className="button button-primary"><ArrowLeft size={17} aria-hidden="true" /> Về trang chủ</Link>
    </section>
  )
}

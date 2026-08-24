import { Route, Routes } from 'react-router'
import { Layout } from './components/Layout'
import { AboutPage } from './pages/AboutPage'
import { ArticlePage } from './pages/ArticlePage'
import { CatalogPage } from './pages/CatalogPage'
import { ContactPage } from './pages/ContactPage'
import { HomePage } from './pages/HomePage'
import { NewsPage } from './pages/NewsPage'
import { NotFoundPage } from './pages/NotFoundPage'
import { ProductPage } from './pages/ProductPage'

function App() {
  return (
    <Routes>
      <Route element={<Layout />}>
        <Route index element={<HomePage />} />
        <Route path="gioi-thieu" element={<AboutPage />} />
        <Route path="pac" element={<CatalogPage family="pac" />} />
        <Route path="baker-hughes" element={<CatalogPage family="baker-hughes" />} />
        <Route path="san-pham/:slug" element={<ProductPage />} />
        <Route path="tin-tuc-su-kien" element={<NewsPage />} />
        <Route path="tin-tuc/:slug" element={<ArticlePage />} />
        <Route path="lien-he" element={<ContactPage />} />
        <Route path="*" element={<NotFoundPage />} />
      </Route>
    </Routes>
  )
}

export default App


import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router'
import App from './App.tsx'
import { LanguageProvider } from './i18n.tsx'
import { DataProvider } from './context/DataContext.tsx'
import './site-v7.css'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <BrowserRouter>
      <LanguageProvider>
        <DataProvider>
          <App />
        </DataProvider>
      </LanguageProvider>
    </BrowserRouter>
  </StrictMode>,
)

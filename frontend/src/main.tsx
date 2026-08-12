import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import App from './App'
import { FixedCanvas } from './app/FixedCanvas'
import { I18nProvider } from './shared/i18n/I18n'
import './styles.css'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <I18nProvider>
      <FixedCanvas>
        <App />
      </FixedCanvas>
    </I18nProvider>
  </StrictMode>,
)

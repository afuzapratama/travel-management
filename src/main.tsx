import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'
import { AppProvider } from './context/AppContext.tsx'
import { ConfirmProvider } from './components/ConfirmDialog.tsx'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <AppProvider>
      <ConfirmProvider>
        <App />
      </ConfirmProvider>
    </AppProvider>
  </StrictMode>,
)

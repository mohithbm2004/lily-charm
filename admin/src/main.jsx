import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import './index.css'
import App from './App.jsx'
import ErrorBoundary from './components/ErrorBoundary.jsx'
import { StudioProvider } from './context/StudioContext.jsx'
import { AlertProvider } from './context/AlertContext.jsx'
import { AdminAuthProvider } from './context/AdminAuthContext.jsx'

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <ErrorBoundary>
      <BrowserRouter>
        <AdminAuthProvider>
          <AlertProvider>
            <StudioProvider>
              <App />
            </StudioProvider>
          </AlertProvider>
        </AdminAuthProvider>
      </BrowserRouter>
    </ErrorBoundary>
  </StrictMode>,
)

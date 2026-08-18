import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import { GoogleOAuthProvider } from '@react-oauth/google'
import './index.css'
import App from './App.jsx'
import ErrorBoundary from './components/ErrorBoundary.jsx'
import { CartProvider } from './context/CartContext.jsx'
import { AuthProvider } from './context/AuthContext.jsx'
import { StudioProvider } from './context/StudioContext.jsx'
import { AlertProvider } from './context/AlertContext.jsx'
import { GOOGLE_CLIENT_ID } from './config/api'

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <ErrorBoundary>
      <GoogleOAuthProvider clientId={GOOGLE_CLIENT_ID}>
        <BrowserRouter>
          <AlertProvider>
            <AuthProvider>
              <StudioProvider>
                <CartProvider>
                  <App />
                </CartProvider>
              </StudioProvider>
            </AuthProvider>
          </AlertProvider>
        </BrowserRouter>
      </GoogleOAuthProvider>
    </ErrorBoundary>
  </StrictMode>,
)

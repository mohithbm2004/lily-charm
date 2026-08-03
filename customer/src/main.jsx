import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import './index.css'
import App from './App.jsx'
import { CartProvider } from './context/CartContext.jsx'
import { AuthProvider } from './context/AuthContext.jsx'
import { StudioProvider } from './context/StudioContext.jsx'

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <BrowserRouter>
      <AuthProvider>
        <StudioProvider>
          <CartProvider>
            <App />
          </CartProvider>
        </StudioProvider>
      </AuthProvider>
    </BrowserRouter>
  </StrictMode>,
)

import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'
import { StudioProvider } from './context/StudioContext.jsx'
import { AlertProvider } from './context/AlertContext.jsx'

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <AlertProvider>
      <StudioProvider>
        <App />
      </StudioProvider>
    </AlertProvider>
  </StrictMode>,
)

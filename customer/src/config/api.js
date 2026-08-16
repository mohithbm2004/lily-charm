const isLocalhost =
  typeof window !== 'undefined' &&
  ['localhost', '127.0.0.1'].includes(window.location.hostname)

const envApiUrl = import.meta.env.VITE_API_URL?.trim()

export const API_URL =
  envApiUrl && (!envApiUrl.includes('localhost') || isLocalhost)
    ? envApiUrl
    : isLocalhost
    ? 'http://localhost:5000/api'
    : 'https://lily-charm-server.onrender.com/api'

export const SOCKET_URL = import.meta.env.VITE_WS_URL || API_URL.replace(/\/api\/?$/, '')

export const RAZORPAY_KEY_ID = import.meta.env.VITE_RAZORPAY_KEY_ID || ''

export const GOOGLE_CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID || ''

export default API_URL

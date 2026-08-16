const isProduction =
  typeof window !== 'undefined' &&
  !['localhost', '127.0.0.1'].includes(window.location.hostname)

export const API_URL =
  import.meta.env.VITE_API_URL && import.meta.env.VITE_API_URL !== 'http://localhost:5000/api'
    ? import.meta.env.VITE_API_URL
    : isProduction
    ? 'https://lily-charm-server.onrender.com/api'
    : 'http://localhost:5000/api'

export const SOCKET_URL = import.meta.env.VITE_WS_URL || API_URL.replace(/\/api\/?$/, '')

export const STOREFRONT_URL =
  import.meta.env.VITE_STOREFRONT_URL || (isProduction ? 'https://lilycharm.in' : 'http://localhost:5173')

export default API_URL

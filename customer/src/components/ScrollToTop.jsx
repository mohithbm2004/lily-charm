import { useEffect } from 'react'
import { useLocation } from 'react-router-dom'

/**
 * ScrollToTop Component
 * Listens to React Router location changes (pathname and search queries) and
 * immediately resets the window and document scroll positions to (0, 0).
 */
export default function ScrollToTop() {
  const { pathname, search } = useLocation()

  useEffect(() => {
    // 1. Instant window scroll reset
    window.scrollTo({
      top: 0,
      left: 0,
      behavior: 'instant',
    })

    // 2. Direct DOM document & root element resets for full cross-browser safety
    if (document.documentElement) {
      document.documentElement.scrollTop = 0
    }
    if (document.body) {
      document.body.scrollTop = 0
    }
    const rootElement = document.getElementById('root')
    if (rootElement) {
      rootElement.scrollTop = 0
    }
  }, [pathname, search])

  return null
}

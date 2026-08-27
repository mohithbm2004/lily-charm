import { useEffect, useRef } from 'react'
import { useLocation } from 'react-router-dom'

/**
 * ScrollToTop / ScrollManager Component
 * Preserves current scroll position when navigating between routes via navbar,
 * and restores per-route scroll positions when navigating back/forward or re-visiting routes.
 */
export default function ScrollToTop() {
  const location = useLocation()
  const scrollMap = useRef({})
  const prevPathRef = useRef(location.pathname + location.search)

  // 1. Take manual control over scroll restoration to prevent automatic browser jump to (0,0)
  useEffect(() => {
    if ('scrollRestoration' in window.history) {
      window.history.scrollRestoration = 'manual'
    }
  }, [])

  // 2. Continuously track current page scroll position
  useEffect(() => {
    const handleScroll = () => {
      const currentPath = prevPathRef.current
      const currentY = window.scrollY || document.documentElement.scrollTop || 0
      scrollMap.current[currentPath] = currentY
    }

    window.addEventListener('scroll', handleScroll, { passive: true })
    return () => window.removeEventListener('scroll', handleScroll)
  }, [])

  // 3. Preserve/restore scroll position on route change
  useEffect(() => {
    const currentPath = location.pathname + location.search
    const prevPath = prevPathRef.current

    // Save previous route's scroll position
    const currentScrollY = window.scrollY || document.documentElement.scrollTop || 0
    scrollMap.current[prevPath] = currentScrollY

    prevPathRef.current = currentPath

    // Check if target route has a previously stored scroll position
    const savedY = scrollMap.current[currentPath]
    const targetY = typeof savedY === 'number' ? savedY : currentScrollY

    // Helper to apply scroll position across window and DOM roots
    const applyScroll = () => {
      window.scrollTo({
        top: targetY,
        left: 0,
        behavior: 'instant',
      })
      if (document.documentElement) document.documentElement.scrollTop = targetY
      if (document.body) document.body.scrollTop = targetY
    }

    applyScroll()

    // Re-apply over requestAnimationFrame & timeouts to account for page transitions and lazy loading
    const rafId = requestAnimationFrame(() => {
      applyScroll()
    })
    const timerId1 = setTimeout(applyScroll, 50)
    const timerId2 = setTimeout(applyScroll, 150)
    const timerId3 = setTimeout(applyScroll, 320)

    return () => {
      cancelAnimationFrame(rafId)
      clearTimeout(timerId1)
      clearTimeout(timerId2)
      clearTimeout(timerId3)
    }
  }, [location.pathname, location.search])

  return null
}

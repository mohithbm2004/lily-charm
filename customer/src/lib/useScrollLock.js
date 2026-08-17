import { useEffect } from 'react'

let lockCount = 0
let savedOverflow = ''
let savedHtmlOverflow = ''

export function useScrollLock(lock) {
  useEffect(() => {
    if (!lock) return

    if (lockCount === 0) {
      savedOverflow = document.body.style.overflow
      savedHtmlOverflow = document.documentElement.style.overflow

      document.documentElement.classList.add('modal-open')
      document.body.classList.add('modal-open')

      document.body.style.overflow = 'hidden'
      document.documentElement.style.overflow = 'hidden'
      document.body.style.overscrollBehavior = 'none'
      document.documentElement.style.overscrollBehavior = 'none'
    }
    lockCount++

    return () => {
      lockCount = Math.max(0, lockCount - 1)
      if (lockCount === 0) {
        document.documentElement.classList.remove('modal-open')
        document.body.classList.remove('modal-open')

        document.body.style.overflow = savedOverflow || ''
        document.documentElement.style.overflow = savedHtmlOverflow || ''
        document.body.style.overscrollBehavior = ''
        document.documentElement.style.overscrollBehavior = ''
      }
    }
  }, [lock])
}

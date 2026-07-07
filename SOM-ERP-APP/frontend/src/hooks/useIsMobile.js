import { useState, useEffect } from 'react'

const QUERY = '(max-width: 767px)'

/**
 * useIsMobile — tracks whether the viewport is below Tailwind's `md` breakpoint (768px).
 * Backed by matchMedia so it updates live on resize/orientation change.
 *
 * @returns {boolean}
 */
export function useIsMobile() {
  const [isMobile, setIsMobile] = useState(
    () => typeof window !== 'undefined' && window.matchMedia(QUERY).matches
  )

  useEffect(() => {
    const mql = window.matchMedia(QUERY)
    const onChange = (e) => setIsMobile(e.matches)
    mql.addEventListener('change', onChange)
    return () => mql.removeEventListener('change', onChange)
  }, [])

  return isMobile
}

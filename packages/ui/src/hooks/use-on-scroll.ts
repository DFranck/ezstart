'use client'
import { useCallback, useEffect, useState, type RefObject } from 'react'

interface UseScrollOptions {
  /** Throttle interval for scroll tracking in ms (default: 100) */
  throttleMs?: number
  /** Default smooth behavior for scrollTo (default: 'smooth') */
  defaultBehavior?: ScrollBehavior
}

interface ScrollToOptions {
  behavior?: ScrollBehavior
  block?: ScrollLogicalPosition
  inline?: ScrollLogicalPosition
  /** Delay in ms before scrolling (useful for waiting on animations) */
  delay?: number
}

interface UseScrollReturn {
  /** Current vertical scroll position */
  scrollY: number
  /** Scroll to an element ref */
  scrollTo: (ref: RefObject<HTMLElement | null> | HTMLElement | null, options?: ScrollToOptions) => void
  /** Scroll to the top of the page/container */
  scrollToTop: (behavior?: ScrollBehavior) => void
  /** Scroll to the bottom of the page/container */
  scrollToBottom: (behavior?: ScrollBehavior) => void
}

export function useScroll(options?: UseScrollOptions): UseScrollReturn {
  const { throttleMs = 100, defaultBehavior = 'smooth' } = options ?? {}
  const [scrollY, setScrollY] = useState(0)

  useEffect(() => {
    if (typeof window === 'undefined') return

    let timeout: ReturnType<typeof setTimeout> | null = null

    const handleScroll = () => {
      if (timeout) return
      timeout = setTimeout(() => {
        setScrollY(window.scrollY)
        timeout = null
      }, throttleMs)
    }

    window.addEventListener('scroll', handleScroll)
    return () => {
      window.removeEventListener('scroll', handleScroll)
      if (timeout) clearTimeout(timeout)
    }
  }, [throttleMs])

  const scrollTo = useCallback(
    (target: RefObject<HTMLElement | null> | HTMLElement | null, opts?: ScrollToOptions) => {
      const { behavior = defaultBehavior, block = 'center', inline, delay = 0 } = opts ?? {}

      const el = target && 'current' in target ? target.current : target
      if (!el) return

      const doScroll = () => el.scrollIntoView({ behavior, block, inline })
      delay > 0 ? setTimeout(doScroll, delay) : doScroll()
    },
    [defaultBehavior]
  )

  const scrollToTop = useCallback(
    (behavior: ScrollBehavior = defaultBehavior) => {
      window.scrollTo({ top: 0, behavior })
    },
    [defaultBehavior]
  )

  const scrollToBottom = useCallback(
    (behavior: ScrollBehavior = defaultBehavior) => {
      window.scrollTo({ top: document.documentElement.scrollHeight, behavior })
    },
    [defaultBehavior]
  )

  return { scrollY, scrollTo, scrollToTop, scrollToBottom }
}

/** @deprecated Use useScroll() instead */
export function useOnScroll(throttleMs = 100): number {
  const { scrollY } = useScroll({ throttleMs })
  return scrollY
}

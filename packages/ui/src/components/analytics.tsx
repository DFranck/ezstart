/**
 * Plausible Analytics Utilities
 *
 * Privacy-focused, GDPR-compliant analytics without cookies.
 *
 * This file contains helper functions only (no React components with Next.js dependencies).
 * For the full PlausibleAnalytics component, use it directly in your Next.js app layouts.
 */

import { logger } from '@ezstart/logger'

declare global {
  interface Window {
    plausible?: (event: string, options?: { props?: Record<string, any>; u?: string }) => void
  }
}

/**
 * Custom event tracking
 *
 * @example
 * ```tsx
 * trackEvent('signup', { method: 'google' })
 * trackEvent('download', { file: 'report.pdf' })
 * ```
 */
export function trackEvent(eventName: string, props?: Record<string, string | number | boolean>) {
  if (typeof window !== 'undefined' && (window as any).plausible) {
    ;(window as any).plausible(eventName, { props })
  } else {
    logger.warn('[Analytics] Plausible not loaded yet')
  }
}

/**
 * Track outbound link click manually
 */
export function trackOutboundLink(url: string, callback?: () => void) {
  trackEvent('Outbound Link: Click', { url })
  if (callback) {
    setTimeout(callback, 150) // Small delay to ensure event is sent
  }
}

/**
 * Track file download manually
 */
export function trackFileDownload(filename: string) {
  trackEvent('File Download', { filename })
}

/**
 * Hook to track custom events easily
 *
 * @example
 * ```tsx
 * const analytics = useAnalytics()
 *
 * <button onClick={() => analytics.track('button_click', { button: 'cta' })}>
 *   Click me
 * </button>
 * ```
 */
export function useAnalytics() {
  return {
    track: trackEvent,
    trackOutbound: trackOutboundLink,
    trackDownload: trackFileDownload,
  }
}

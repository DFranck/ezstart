'use client'

import { useEffect } from 'react'
import { usePathname, useSearchParams } from 'next/navigation'
import Script from 'next/script'

interface PlausibleAnalyticsProps {
  /**
   * Your Plausible domain (e.g., "ezstart.xyz", "ezauth.ezstart.xyz")
   */
  domain: string
  /**
   * Custom Plausible API host (default: https://plausible.io)
   */
  apiHost?: string
  /**
   * Enable automatic outbound link tracking
   */
  trackOutboundLinks?: boolean
  /**
   * Enable file download tracking
   */
  trackFileDownloads?: boolean
}

/**
 * Plausible Analytics Component
 *
 * Privacy-focused, GDPR-compliant analytics without cookies.
 *
 * Usage in your app/[locale]/layout.tsx:
 * ```tsx
 * import { PlausibleAnalytics } from './PlausibleAnalytics'
 *
 * <PlausibleAnalytics
 *   domain="your-domain.com"
 *   trackOutboundLinks
 *   trackFileDownloads
 * />
 * ```
 */
export function PlausibleAnalytics({
  domain,
  apiHost = 'https://plausible.io',
  trackOutboundLinks = false,
  trackFileDownloads = false,
}: PlausibleAnalyticsProps) {
  const pathname = usePathname()
  const searchParams = useSearchParams()

  // Track page views on route change
  useEffect(() => {
    const win = window as unknown as { plausible?: (event: string, options: { u: string }) => void }
    if (typeof window !== 'undefined' && win.plausible) {
      const url = pathname + (searchParams?.toString() ? `?${searchParams.toString()}` : '')
      win.plausible('pageview', { u: url })
    }
  }, [pathname, searchParams])

  // Build script extensions
  const extensions: string[] = []
  if (trackOutboundLinks) extensions.push('outbound-links')
  if (trackFileDownloads) extensions.push('file-downloads')

  const scriptSrc =
    extensions.length > 0
      ? `${apiHost}/js/script.${extensions.join('.')}.js`
      : `${apiHost}/js/script.js`

  return (
    <Script
      defer
      data-domain={domain}
      data-api={`${apiHost}/api/event`}
      src={scriptSrc}
      strategy="afterInteractive"
    />
  )
}

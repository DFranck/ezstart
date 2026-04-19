'use client'

import { useState, useEffect } from 'react'
import { Div, P } from '@ezstart/ui/components'
import { useAuth } from '../react/hooks.js'
import { useAuthContext } from '../react/auth-provider.js'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface DevModeBannerProps {
  className?: string
  /** Override app name (e.g., from ?app= query param) */
  appName?: string
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Truncate a key to its first 12 characters + ellipsis. */
function truncateKey(key: string): string {
  if (key.length <= 12) return key
  return `${key.slice(0, 12)}...`
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

/**
 * Dev-only banner showing the current auth configuration state.
 * Returns `null` in production — zero footprint.
 *
 * @example
 * ```tsx
 * <SignInForm appName="myapp" />
 * <DevModeBanner />
 * ```
 */
export function DevModeBanner({ className, appName }: DevModeBannerProps) {
  const [mounted, setMounted] = useState(false)
  useEffect(() => setMounted(true), [])

  // Never render server-side (avoid hydration mismatch)
  if (!mounted) return null

  return <DevModeBannerInner className={className} overrideAppName={appName} />
}

/**
 * Inner component that uses hooks (separated so the production guard
 * can return null before any hooks are called).
 */
function DevModeBannerInner({
  className,
  overrideAppName,
}: DevModeBannerProps & { overrideAppName?: string }) {
  const { scope, publishableKey } = useAuth()
  const { webUrl, appName: contextAppName } = useAuthContext()

  const appName = overrideAppName || contextAppName

  // Build the developer dashboard URL for getting an API key
  const developerUrl = `${webUrl}/developer?tab=api-keys`

  // First-party mode without ?app= override — only visible to ezauth devs
  // Don't show banner when there's an app override (user came from external app)
  if (scope === 'first-party' && !overrideAppName) {
    return null // Don't show banner on ezauth's own pages
  }

  let icon: string
  let label: string
  let details: string | null = null

  if (!publishableKey) {
    // No key configured — show link to get one
    icon = '\u{1F527}' // wrench emoji
    label = `Dev Mode — ${appName}`
    details = 'No API key configured'
  } else if (scope === 'admin') {
    icon = '\u{1F451}' // crown emoji
    label = `Admin — ${appName}`
    details = `${truncateKey(publishableKey)} | Platform scope`
  } else {
    icon = '\u{1F511}' // key emoji
    label = `${scope === 'live' ? 'Live' : 'Test'} — ${appName}`
    details = truncateKey(publishableKey)
  }

  return (
    <Div
      className={[
        'bg-muted/50 border border-border rounded-md p-2 text-xs text-muted-foreground',
        className,
      ]
        .filter(Boolean)
        .join(' ')}
    >
      <P size="xs" className="text-muted-foreground leading-relaxed">
        {icon} {label}
        {details && (
          <>
            {' \u2014 '}
            {details}
          </>
        )}
      </P>
      {!publishableKey && scope !== 'first-party' && (
        <P size="xs" className="text-muted-foreground mt-1">
          Get your key{' \u2192 '}
          <a
            href={developerUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="text-primary underline underline-offset-2 hover:text-primary/80"
          >
            EZAuth Dashboard
          </a>
        </P>
      )}
    </Div>
  )
}

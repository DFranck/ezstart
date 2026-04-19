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
  /** Override app name (e.g., resolved from ?key= or legacy ?app= param) */
  appName?: string
  /**
   * Key validation status:
   * - `'valid'` — key was validated successfully
   * - `'invalid'` — key is invalid, revoked, or expired
   * - `'missing'` — no key provided (legacy ?app= mode or first-party)
   * - `undefined` — not yet resolved (show nothing extra)
   */
  keyStatus?: 'valid' | 'invalid' | 'missing'
  /** The raw publishable key from the URL (for display). */
  urlKey?: string
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
export function DevModeBanner({ className, appName, keyStatus, urlKey }: DevModeBannerProps) {
  const [mounted, setMounted] = useState(false)
  useEffect(() => setMounted(true), [])

  // Never render server-side (avoid hydration mismatch)
  if (!mounted) return null

  return (
    <DevModeBannerInner
      className={className}
      overrideAppName={appName}
      keyStatus={keyStatus}
      urlKey={urlKey}
    />
  )
}

/**
 * Inner component that uses hooks (separated so the production guard
 * can return null before any hooks are called).
 */
function DevModeBannerInner({
  className,
  overrideAppName,
  keyStatus,
  urlKey,
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
  let isError = false

  // URL-level key status takes priority (set by the auth pages themselves)
  if (keyStatus === 'invalid') {
    icon = '\u{274C}' // red cross
    label = 'Invalid API Key'
    details = urlKey ? truncateKey(urlKey) : 'Key is invalid, revoked, or expired'
    isError = true
  } else if (keyStatus === 'valid') {
    icon = '\u{2705}' // green check
    label = `${appName}`
    details = urlKey ? `Key: ${truncateKey(urlKey)}` : 'Valid key'
  } else if (!publishableKey) {
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
        'border rounded-md p-2 text-xs',
        isError
          ? 'bg-destructive/10 border-destructive/30 text-destructive'
          : 'bg-muted/50 border-border text-muted-foreground',
        className,
      ]
        .filter(Boolean)
        .join(' ')}
    >
      <P
        size="xs"
        className={
          isError ? 'text-destructive leading-relaxed' : 'text-muted-foreground leading-relaxed'
        }
      >
        {icon} {label}
        {details && (
          <>
            {' \u2014 '}
            {details}
          </>
        )}
      </P>
      {(keyStatus === 'invalid' || (!publishableKey && keyStatus !== 'valid')) && (
        <P
          size="xs"
          className={isError ? 'text-destructive/80 mt-1' : 'text-muted-foreground mt-1'}
        >
          {keyStatus === 'invalid' ? 'Get a valid key' : 'Get your key'}
          {' \u2192 '}
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

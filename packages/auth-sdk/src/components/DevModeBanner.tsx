'use client'

import { Div, P } from '@ezstart/ui/components'
import { useEffect, useState } from 'react'
import { useAuthContext } from '../react/auth-provider.js'
import { useAuth } from '../react/hooks.js'

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
  /**
   * BCP-47 locale used to prefix the "Get your key" developer portal URL.
   * Defaults to `'en'`. Consumers rendering inside Next.js `[locale]` routes
   * should pass the active locale so the link resolves to the matching
   * locale route.
   */
  locale?: string
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
export function DevModeBanner({
  className,
  appName,
  keyStatus,
  urlKey,
  locale,
}: DevModeBannerProps) {
  const [mounted, setMounted] = useState(false)
  useEffect(() => setMounted(true), [])

  // Never render server-side (avoid hydration mismatch)
  if (!mounted) return null

  // Never render in production — dev-only tool, zero footprint in prod bundles.
  // Next.js statically replaces `process.env.NODE_ENV` at build time, so this
  // branch is eliminated by the minifier for production builds.
  // NOTE: no `typeof process` guard here — see P4-WIRE.1 (the guard defeats
  // Next.js' static substitution and causes the env read to return undefined).
  if (process.env.NODE_ENV === 'production') return null

  return (
    <DevModeBannerInner
      className={className}
      overrideAppName={appName}
      keyStatus={keyStatus}
      urlKey={urlKey}
      locale={locale}
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
  locale,
}: DevModeBannerProps & { overrideAppName?: string }) {
  const { scope, publishableKey } = useAuth()
  const { webUrl, appName: contextAppName } = useAuthContext()

  const appName = overrideAppName || contextAppName
  const resolvedLocale = locale && locale.length > 0 ? locale : 'en'

  // Build the developer dashboard URL for getting an API key
  const developerUrl = `${webUrl}/${resolvedLocale}/developer?tab=api-keys`

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
    label = `Dev Mode`
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
      intent={'warning'}
      className={[
        'border rounded-md p-2 text-xs flex justify-between',
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
        <P size="xs" className={isError ? 'text-destructive/80' : 'text-muted-foreground'}>
          <a
            href={developerUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="text-primary underline underline-offset-2 hover:text-primary/80"
          >
            {keyStatus === 'invalid' ? 'Get a valid key' : 'Get your key'}
          </a>
        </P>
      )}
    </Div>
  )
}

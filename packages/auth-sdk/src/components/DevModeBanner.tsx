'use client'

import { Div, P } from '@ezstart/ui/components'
import { useAuth } from '../react/hooks.js'
import { useAuthContext } from '../react/auth-provider.js'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface DevModeBannerProps {
  className?: string
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
export function DevModeBanner({ className }: DevModeBannerProps) {
  // Zero footprint in production
  if (typeof process !== 'undefined' && process.env?.NODE_ENV !== 'development') {
    return null
  }

  return <DevModeBannerInner className={className} />
}

/**
 * Inner component that uses hooks (separated so the production guard
 * can return null before any hooks are called).
 */
function DevModeBannerInner({ className }: DevModeBannerProps) {
  const { scope, publishableKey } = useAuth()
  const { webUrl, appName } = useAuthContext()

  // Build the developer dashboard URL for getting an API key
  const developerUrl = `${webUrl}/developer?tab=api-keys`

  let icon: string
  let label: string
  let details: string | null = null

  if (scope === 'first-party') {
    // D) First-party mode
    icon = '\u{1F3E0}' // house emoji
    label = 'First-Party Mode'
    details = 'EZAuth direct access'
  } else if (!publishableKey) {
    // A) No key configured
    icon = '\u{1F527}' // wrench emoji
    label = 'Development Mode'
    details = 'No API key configured'
  } else if (scope === 'admin') {
    // C) Admin key
    icon = '\u{1F451}' // crown emoji
    label = 'Admin Mode'
    details = `${truncateKey(publishableKey)} | Platform scope | All apps`
  } else {
    // B) Live/test key
    icon = '\u{1F511}' // key emoji
    label = `${scope === 'live' ? 'Live' : 'Test'} Mode`
    details = `${truncateKey(publishableKey)} | App: ${appName} | Scope: ${scope}`
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

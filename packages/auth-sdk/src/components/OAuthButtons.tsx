'use client'

import { useState } from 'react'
import { Button, Div, Span, Spinner } from '@ezstart/ui/components'
import { useAuthContext } from '../react/auth-provider.js'

// ─── Types ──────────────────────────────────────────────────────────────────

export type OAuthProvider = 'google'

export interface OAuthButtonsTexts {
  continueWithGoogle: string
  orContinueWith: string
  /** Shown while the browser is being redirected to the provider. */
  redirecting: string
}

export interface OAuthButtonsProps {
  /** App name passed to the OAuth flow */
  appName: string
  /** Redirect URI after OAuth completes */
  redirectUri?: string
  /** OAuth providers to display (default: ['google']) */
  providers?: OAuthProvider[]
  /** Override texts */
  texts?: Partial<OAuthButtonsTexts>
  /**
   * Override the EZAuth API base URL used to start the OAuth flow.
   * Defaults to the URL configured on the surrounding `<AuthProvider>`.
   * Pass an explicit value when rendering outside an `AuthProvider`.
   */
  apiUrl?: string
}

// ─── Defaults ───────────────────────────────────────────────────────────────

const DEFAULT_TEXTS: OAuthButtonsTexts = {
  continueWithGoogle: 'Continue with Google',
  orContinueWith: 'or continue with',
  redirecting: 'Redirecting…',
}

// ─── Helpers ────────────────────────────────────────────────────────────────

/**
 * Strip a trailing `/api/auth` (or `/api`) suffix from the SDK-internal
 * client URL so the OAuth endpoint can re-append `/api/auth/google`.
 *
 * @internal
 */
function normalizeOAuthBase(url: string): string {
  let base = url
  if (base.endsWith('/api/auth')) {
    base = base.slice(0, -'/api/auth'.length)
  } else if (base.endsWith('/api')) {
    base = base.slice(0, -'/api'.length)
  }
  if (base.endsWith('/')) base = base.slice(0, -1)
  return base
}

// ─── Component ──────────────────────────────────────────────────────────────

/**
 * Display OAuth provider buttons that redirect to the EZAuth API to start
 * a third-party login flow.
 *
 * The API base URL is resolved from (in order): the `apiUrl` prop, the
 * surrounding `<AuthProvider>` configuration, or — as a last resort — the
 * current page origin. The component never imports `@ezstart/config` so it
 * remains agnostic to any monorepo-specific URL helpers.
 *
 * @example
 * ```tsx
 * <OAuthButtons appName="myapp" redirectUri="https://app.example.com/auth/callback" />
 * ```
 */
export function OAuthButtons({
  appName,
  redirectUri,
  providers = ['google'],
  texts,
  apiUrl,
}: OAuthButtonsProps) {
  const t = { ...DEFAULT_TEXTS, ...texts }
  const [isRedirecting, setIsRedirecting] = useState(false)

  // ALWAYS call the hook (rules of hooks). The provider is optional, so we
  // wrap in try/catch to fall back to window.origin when no provider is in
  // the tree. This keeps the hook order stable across renders — the hook
  // itself is invoked unconditionally, only its consumption is guarded.
  let providerApiUrl: string | undefined
  try {
    // eslint-disable-next-line react-hooks/rules-of-hooks
    providerApiUrl = useAuthContext().client.getApiUrl()
  } catch {
    providerApiUrl = undefined
  }

  const resolvedApiUrl =
    apiUrl ?? providerApiUrl ?? (typeof window !== 'undefined' ? window.location.origin : undefined)

  const handleGoogleLogin = () => {
    if (!resolvedApiUrl || isRedirecting) return
    setIsRedirecting(true)
    const base = normalizeOAuthBase(resolvedApiUrl)
    const params = new URLSearchParams({
      app: appName,
      ...(redirectUri && { redirect_uri: redirectUri }),
    })
    // Full page redirect — the loading state is for the brief window between
    // click and the browser kicking off navigation (a slow API can stall
    // here for 1-2s on cold starts).
    window.location.href = `${base}/api/auth/google?${params.toString()}`
  }

  return (
    <Div className="space-y-3">
      {providers.includes('google') && (
        <Button
          type="button"
          variant="outline"
          className="w-full cursor-pointer"
          onClick={handleGoogleLogin}
          disabled={isRedirecting}
          aria-busy={isRedirecting}
        >
          {isRedirecting ? (
            <Spinner size="sm" className="mr-2" />
          ) : (
            <svg
              className="mr-2"
              width="20"
              height="20"
              viewBox="0 0 24 24"
              xmlns="http://www.w3.org/2000/svg"
              aria-hidden="true"
            >
              <path
                d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                fill="#4285F4"
              />
              <path
                d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                fill="#34A853"
              />
              <path
                d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                fill="#FBBC05"
              />
              <path
                d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                fill="#EA4335"
              />
            </svg>
          )}
          <Span>{isRedirecting ? t.redirecting : t.continueWithGoogle}</Span>
        </Button>
      )}

      {/* Divider */}
      <Div className="relative">
        <Div className="absolute inset-0 flex items-center">
          <Span className="w-full border-t" />
        </Div>
        <Div className="relative flex justify-center text-xs uppercase">
          <Span className="bg-background px-2 text-muted-foreground">{t.orContinueWith}</Span>
        </Div>
      </Div>
    </Div>
  )
}

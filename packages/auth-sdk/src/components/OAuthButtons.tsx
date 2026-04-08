'use client'

import { Button, Div, Span } from '@ezstart/ui/components'
import { getApiUrl } from '@ezstart/config/urls'

// ─── Types ──────────────────────────────────────────────────────────────────

export type OAuthProvider = 'google'

export interface OAuthButtonsTexts {
  continueWithGoogle: string
  orContinueWith: string
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
}

// ─── Defaults ───────────────────────────────────────────────────────────────

const DEFAULT_TEXTS: OAuthButtonsTexts = {
  continueWithGoogle: 'Continue with Google',
  orContinueWith: 'or continue with',
}

// ─── Component ──────────────────────────────────────────────────────────────

export function OAuthButtons({
  appName,
  redirectUri,
  providers = ['google'],
  texts,
}: OAuthButtonsProps) {
  const t = { ...DEFAULT_TEXTS, ...texts }

  const handleGoogleLogin = () => {
    const apiUrl = getApiUrl('ezauth')
    const params = new URLSearchParams({
      app: appName,
      ...(redirectUri && { redirect_uri: redirectUri }),
    })

    window.location.href = `${apiUrl}/api/auth/google?${params.toString()}`
  }

  return (
    <Div className="space-y-3">
      {providers.includes('google') && (
        <Button
          type="button"
          variant="outline"
          className="w-full cursor-pointer"
          onClick={handleGoogleLogin}
        >
          <svg
            className="mr-2"
            width="20"
            height="20"
            viewBox="0 0 24 24"
            xmlns="http://www.w3.org/2000/svg"
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
          <Span>{t.continueWithGoogle}</Span>
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

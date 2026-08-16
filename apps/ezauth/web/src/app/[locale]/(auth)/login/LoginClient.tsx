'use client'

import {
  MagicLinkButton,
  SignInCard,
  type MagicLinkButtonTexts,
} from '@ezstart/auth-sdk/components'
import { useAuth } from '@ezstart/auth-sdk'
import { apiCall } from '@ezstart/api-sdk'
import { Div, Spinner } from '@ezstart/ui/components'
import { useLocale, useTranslations } from 'next-intl'
import { useSearchParams } from 'next/navigation'
import { useEffect, useRef, useState } from 'react'

interface LoginClientProps {
  ssrAppName: string | null
  ssrAppDisplayName: string | null
}

/**
 * Cross-app SSO handoff (client-side fallback to the SSR-side handoff in
 * `page.tsx`). Fires when ALL of:
 *   - user is authenticated client-side (localStorage Zustand store)
 *   - search params carry `redirect_uri` AND (`app` OR `key`)
 *   - SSR didn't already short-circuit (we'd have been redirected earlier)
 *
 * Why both client + server : in dev, SDK forces `localStorage` mode which
 * means the cookie is never set on ezauth → SSR `getServerAuth` returns null
 * → SSR SSO branch can't fire. In prod with httpOnly cookies the SSR path
 * usually wins (no flash). The client fallback is the safety net.
 *
 * Calls POST /api/auth/sso/authorize with Bearer token (auth-sdk `apiCall`
 * attaches it automatically). Bounces the user to `redirect_uri?code=...`.
 */
function useSsoAutoHandoff({ enabled }: { enabled: boolean }) {
  const { isAuthenticated, isAuthReady } = useAuth()
  const searchParams = useSearchParams()
  const firedRef = useRef(false)
  const [pending, setPending] = useState(false)

  useEffect(() => {
    if (!enabled) return
    if (firedRef.current) return
    if (!isAuthReady || !isAuthenticated) return
    const redirectUri = searchParams.get('redirect_uri')
    if (!redirectUri) return
    const appParam = searchParams.get('app')
    const keyParam = searchParams.get('key')
    if (!appParam && !keyParam) return
    firedRef.current = true
    setPending(true)

    void (async () => {
      try {
        // Resolve the app slug from the publishable key when only `key` is present.
        let app = appParam ?? null
        if (!app && keyParam) {
          const cfg = await apiCall<{ appName?: string }>(
            `/keys/config?key=${encodeURIComponent(keyParam)}`,
            { appName: 'ezauth', method: 'GET' }
          )
          app = cfg.appName && cfg.appName !== '*' ? cfg.appName : null
        }
        if (!app) {
          setPending(false)
          firedRef.current = false
          return
        }
        // Issue the handoff code. apiCall attaches the Bearer token automatically.
        const result = await apiCall<{ code: string; expiresIn: number }>('/auth/sso/authorize', {
          appName: 'ezauth',
          method: 'POST',
          body: { app, redirectUri },
        })
        const target = new URL(redirectUri)
        target.searchParams.set('code', result.code)
        window.location.assign(target.toString())
      } catch {
        // Fall through to render the form so the user has a recovery path.
        setPending(false)
        firedRef.current = false
      }
    })()
  }, [enabled, isAuthReady, isAuthenticated, searchParams])

  return pending
}

export default function LoginClient({ ssrAppName, ssrAppDisplayName }: LoginClientProps) {
  const t = useTranslations('magicLink')
  const locale = useLocale()
  const handoffPending = useSsoAutoHandoff({ enabled: true })

  if (handoffPending) {
    return (
      <Div
        className="flex items-center justify-center min-h-[60vh] p-4"
        role="status"
        aria-busy="true"
        aria-label="Signing you in"
      >
        <Spinner variant="primary" size="lg" text="Signing you in…" />
      </Div>
    )
  }

  const magicLinkTexts: Partial<MagicLinkButtonTexts> = {
    triggerLabel: t('triggerLabel'),
    modalTitle: t('modalTitle'),
    modalDescription: t('modalDescription'),
    closeButton: t('closeButton'),
    emailLabel: t('emailLabel'),
    emailPlaceholder: t('emailPlaceholder'),
    submitButton: t('submitButton'),
    submittingButton: t('submittingButton'),
    required: t('required'),
    invalidEmail: t('invalidEmail'),
    successTitle: t('successTitle'),
    // Pass `{email}` literal so next-intl substitutes our placeholder verbatim
    // — the SDK component then runs its own .replace('{email}', submittedEmail).
    // Without this, next-intl throws FORMATTING_ERROR on every render.
    successMessage: t('successMessage', { email: '{email}' }),
    resetButton: t('resetButton'),
    errorGeneric: t('errorGeneric'),
    networkError: t('networkError'),
  }

  return (
    <Div className="space-y-3 w-full max-w-md mx-auto">
      <SignInCard ssrAppName={ssrAppName} ssrAppDisplayName={ssrAppDisplayName} />
      <Div className="text-center">
        <MagicLinkButton
          texts={magicLinkTexts}
          appName={ssrAppName ?? undefined}
          locale={locale}
          variant="link"
          showIcon={false}
        />
      </Div>
    </Div>
  )
}

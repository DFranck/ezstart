'use client'

import { SignInCard } from '@ezstart/auth-sdk/components'

interface LoginClientProps {
  /**
   * SSR-resolved app slug from the middleware `x-app-theme` header. Passed
   * through to `<SignInCard ssrAppName>` so the first render already matches
   * the consumer brand (no `'EZAuth'` flash before the client probe).
   * `null` when no key was provided on the URL (first-party login).
   */
  ssrAppName: string | null
  /**
   * SSR-resolved Application.name from the middleware `x-app-display-name`
   * header. Passed through to `<SignInCard ssrAppDisplayName>` so the
   * brand pill in the subtitle renders correctly on first paint.
   */
  ssrAppDisplayName: string | null
}

/**
 * Thin client wrapper around `<SignInCard>` — kept only to forward the SSR-
 * resolved app name / display name from the server `page.tsx`. All chrome,
 * brand handling, key-config probing, OAuth, 2FA, toasts, and footer cross-
 * link rendering live in the SDK Card.
 */
export default function LoginClient({ ssrAppName, ssrAppDisplayName }: LoginClientProps) {
  return <SignInCard ssrAppName={ssrAppName} ssrAppDisplayName={ssrAppDisplayName} />
}

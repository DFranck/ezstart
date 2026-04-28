'use client'

import { SignInModal } from '@ezstart/auth-sdk/components'
import { useRouter } from '@/i18n/navigation'
import { MODAL_AS_PAGE } from '@/config/auth-modal'

interface LoginClientProps {
  /**
   * SSR-resolved app slug from the middleware `x-app-theme` header. Passed
   * through to `<SignInModal ssrAppName>` so the first render already matches
   * the consumer brand (no `'EZAuth'` flash before the client probe).
   * `null` when no key was provided on the URL (first-party login).
   */
  ssrAppName: string | null
  /**
   * SSR-resolved Application.name from the middleware `x-app-display-name`
   * header. Passed through to `<SignInModal ssrAppDisplayName>` so the
   * brand pill in the subtitle renders correctly on first paint.
   */
  ssrAppDisplayName: string | null
}

/**
 * Thin client wrapper around `<SignInModal>` — kept only to forward the SSR-
 * resolved app name / display name from the server `page.tsx`. All chrome,
 * brand handling, key-config probing, OAuth, 2FA, toasts, and footer cross-
 * link rendering live in the SDK Modal. The standalone-route mode keeps the
 * modal always-open and dismisses to home (locale-aware) on close.
 */
export default function LoginClient({ ssrAppName, ssrAppDisplayName }: LoginClientProps) {
  const router = useRouter()
  return (
    <SignInModal
      isOpen
      onClose={() => router.push('/')}
      ssrAppName={ssrAppName}
      ssrAppDisplayName={ssrAppDisplayName}
      modalShellProps={MODAL_AS_PAGE}
    />
  )
}

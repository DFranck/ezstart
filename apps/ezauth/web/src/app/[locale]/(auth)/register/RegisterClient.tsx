'use client'

import { SignUpModal } from '@ezstart/auth-sdk/components'
import { useRouter } from '@/i18n/navigation'
import { MODAL_AS_PAGE } from '@/config/auth-modal'

interface RegisterClientProps {
  ssrAppName: string | null
  ssrAppDisplayName: string | null
}

/**
 * Thin client wrapper around `<SignUpModal>` — forwards SSR-resolved brand
 * info from the server `page.tsx`. All chrome, key-config, OAuth, promo
 * codes, password strength, footer cross-link live in the SDK Modal.
 */
export default function RegisterClient({ ssrAppName, ssrAppDisplayName }: RegisterClientProps) {
  const router = useRouter()
  return (
    <SignUpModal
      isOpen
      onClose={() => router.push('/')}
      ssrAppName={ssrAppName}
      ssrAppDisplayName={ssrAppDisplayName}
      modalShellProps={MODAL_AS_PAGE}
    />
  )
}

'use client'

import { ForgotPasswordModal } from '@ezstart/auth-sdk/components'
import { useRouter } from '@/i18n/navigation'
import { MODAL_AS_PAGE } from '@/config/auth-modal'

interface ForgotPasswordClientProps {
  ssrAppName: string | null
  ssrAppDisplayName: string | null
}

/**
 * Thin client wrapper around `<ForgotPasswordModal>` — forwards SSR-resolved
 * app slug for context. All chrome and form behaviour live in the SDK Modal.
 */
export default function ForgotPasswordClient({ ssrAppName }: ForgotPasswordClientProps) {
  const router = useRouter()
  return (
    <ForgotPasswordModal
      isOpen
      onClose={() => router.push('/')}
      ssrAppName={ssrAppName}
      modalShellProps={MODAL_AS_PAGE}
    />
  )
}

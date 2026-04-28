'use client'

import { VerifyEmailModal } from '@ezstart/auth-sdk/components'
import { useRouter } from '@/i18n/navigation'
import { MODAL_AS_PAGE } from '@/config/auth-modal'

export default function VerifyEmailPage() {
  const router = useRouter()
  return (
    <VerifyEmailModal isOpen onClose={() => router.push('/')} modalShellProps={MODAL_AS_PAGE} />
  )
}

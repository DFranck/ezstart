'use client'

import { ResetPasswordModal } from '@ezstart/auth-sdk/components'
import { useRouter } from '@/i18n/navigation'
import { MODAL_AS_PAGE } from '@/config/auth-modal'

export default function ResetPasswordPage() {
  const router = useRouter()
  return (
    <ResetPasswordModal isOpen onClose={() => router.push('/')} modalShellProps={MODAL_AS_PAGE} />
  )
}

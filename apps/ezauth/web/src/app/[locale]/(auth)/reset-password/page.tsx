'use client'

import { ResetPasswordModal } from '@ezstart/auth-sdk/components'
import { useRouter } from '@/i18n/navigation'

export default function ResetPasswordPage() {
  const router = useRouter()
  return <ResetPasswordModal isOpen onClose={() => router.push('/')} />
}

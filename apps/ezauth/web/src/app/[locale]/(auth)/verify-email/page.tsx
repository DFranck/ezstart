'use client'

import { VerifyEmailModal } from '@ezstart/auth-sdk/components'
import { useRouter } from '@/i18n/navigation'

export default function VerifyEmailPage() {
  const router = useRouter()
  return <VerifyEmailModal isOpen onClose={() => router.push('/')} />
}

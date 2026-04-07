'use client'

import { useAuthStore } from '@ezstart/auth-sdk'
import { PayAdminDashboard, PayProvider } from '@ezstart/pay-sdk'
import { H1, P } from '@ezstart/ui/components'
import { useTranslations } from 'next-intl'

export default function AdminPaymentsPage() {
  const t = useTranslations('admin')
  const { accessToken } = useAuthStore()

  return (
    <>
      <H1 className="mb-2">{t('payments.title')}</H1>
      <P className="text-muted-foreground mb-6">{t('payments.description')}</P>
      <PayProvider appName="green-pulse" getToken={() => accessToken}>
        <PayAdminDashboard appName="green-pulse" />
      </PayProvider>
    </>
  )
}

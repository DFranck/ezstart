'use client'

import { useAuthStore } from '@ezstart/auth-sdk'
import { PayAdminDashboard, PayProvider } from '@ezstart/pay-sdk'
import { H1, P } from '@ezstart/ui/components'
import { useTranslations } from 'next-intl'

/**
 * Application id resolved at build time from `NEXT_PUBLIC_EZAUTH_APP_ID`
 * (see `.env.local`). Required to scope pay-sdk queries to the green-pulse
 * tenant instead of relying on the deprecated `appName` legacy path.
 */
const applicationId = process.env.NEXT_PUBLIC_EZAUTH_APP_ID

export default function AdminPaymentsPage() {
  const t = useTranslations('admin')
  const { accessToken } = useAuthStore()

  return (
    <>
      <H1 className="mb-2">{t('payments.title')}</H1>
      <P className="text-muted-foreground mb-6">{t('payments.description')}</P>
      <PayProvider applicationId={applicationId} getToken={() => accessToken}>
        <PayAdminDashboard applicationId={applicationId} />
      </PayProvider>
    </>
  )
}

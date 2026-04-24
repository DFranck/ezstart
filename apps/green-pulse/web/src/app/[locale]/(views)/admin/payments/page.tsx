'use client'

import { useAuthStore } from '@ezstart/auth-sdk'
import { PayAdminDashboard, PayProvider } from '@ezstart/pay-sdk'
import { H1, P } from '@ezstart/ui/components'
import { useLocale, useTranslations } from 'next-intl'

/**
 * Application id resolved at build time from `NEXT_PUBLIC_EZAUTH_APP_ID`
 * (see `.env.local`). Required to scope pay-sdk queries to the green-pulse
 * tenant instead of relying on the deprecated `appName` legacy path.
 */
const applicationId = process.env.NEXT_PUBLIC_EZAUTH_APP_ID

/**
 * EZPay API base URL — required by `<PayProvider>` so pay-sdk hooks hit the
 * ezpay API instead of the Next.js origin.
 */
const EZPAY_API_URL = process.env.NEXT_PUBLIC_EZPAY_API_URL ?? 'http://localhost:6130'

export default function AdminPaymentsPage() {
  const t = useTranslations('admin')
  const locale = useLocale()
  const { accessToken } = useAuthStore()

  return (
    <>
      <H1 className="mb-2">{t('payments.title')}</H1>
      <P className="text-muted-foreground mb-6">{t('payments.description')}</P>
      <PayProvider
        applicationId={applicationId}
        config={{ apiUrl: EZPAY_API_URL }}
        locale={locale}
        getToken={() => accessToken}
      >
        <PayAdminDashboard applicationId={applicationId} />
      </PayProvider>
    </>
  )
}

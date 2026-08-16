'use client'

import { useAuth } from '@ezstart/auth-sdk'
import { PricingPage } from '@ezstart/pay-sdk/components'
import { Div, H1, Main, P } from '@ezstart/ui/components'
import { useTranslations } from 'next-intl'

const EZPAY_APP_ID = process.env.NEXT_PUBLIC_EZPAY_APP_ID

/**
 * Public `/pricing` route for EZPay.
 *
 * Renders the pay-sdk `<PricingPage />` scoped to the EZPay Application
 * (via `NEXT_PUBLIC_EZPAY_APP_ID`). Falls back to a "Pricing coming soon"
 * placeholder when the env var is missing, matching the landing page
 * behaviour so local dev without the id still builds.
 */
export default function PricingRoute() {
  const t = useTranslations('home')
  const { user } = useAuth()

  const fullName =
    [user?.firstName, user?.lastName].filter(Boolean).join(' ') || user?.username || undefined

  return (
    <Main className="flex flex-1 flex-col items-center py-12 px-4">
      {EZPAY_APP_ID ? (
        <PricingPage
          applicationId={EZPAY_APP_ID}
          userId={user?._id}
          userEmail={user?.email}
          userName={fullName}
          texts={{
            title: t('pricingSectionTitle'),
            subtitle: t('pricingSectionSubtitle'),
          }}
        />
      ) : (
        <Div className="text-center max-w-2xl">
          <H1 size="h2">{t('pricingSectionTitle')}</H1>
          <P className="mt-4 text-muted-foreground">{t('pricingSectionSubtitle')}</P>
        </Div>
      )}
    </Main>
  )
}

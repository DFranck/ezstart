'use client'

import { useAuth } from '@ezstart/auth-sdk'
import { useApplicationContext } from '@ezstart/pay-sdk'
import { PricingPage } from '@ezstart/pay-sdk/components'
import { Div, H1, Main, P } from '@ezstart/ui/components'
import { useTranslations } from 'next-intl'

/**
 * Public `/pricing` route for EZAuth.
 *
 * Renders the pay-sdk `<PricingPage />` scoped to the EZAuth Application.
 *
 * Phase A1 ENV-DIET (2026-05-05) — `applicationId` is auto-resolved by the
 * pay-sdk PayProvider from `NEXT_PUBLIC_EZPAY_KEY` via ezpay's
 * `/keys/config.applicationId`. No more `NEXT_PUBLIC_EZAUTH_APP_ID` env
 * var needed in the consumer's `.env.local`. Falls back to a minimal
 * "Pricing coming soon" placeholder when the publishable key resolution
 * hasn't completed yet (or the key is unset).
 */
export default function PricingRoute() {
  const t = useTranslations('home')
  const { user } = useAuth()
  const { applicationId } = useApplicationContext()

  const fullName =
    [user?.firstName, user?.lastName].filter(Boolean).join(' ') || user?.username || undefined

  return (
    <Main className="flex flex-1 flex-col items-center py-12 px-4">
      {applicationId ? (
        <PricingPage
          applicationId={applicationId}
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

'use client'

import { useTranslations } from 'next-intl'
import { PricingPage, type PricingPageTexts } from '@ezstart/pay-sdk/components'
import { useAuth } from '@ezstart/auth-sdk'

// EZPay self Application id (Application slug='ezpay' — dogfood plans).
// The PricingPage auto-fetches active plans for this Application via usePlans.
const EZPAY_APPLICATION_ID = '69e7017c0977c53844e4d077'

type PlansSectionProps = {
  /**
   * @deprecated Kept for backward compatibility with the developer page.
   * The new PricingPage resolves the current plan from subscription status.
   */
  currentFeePercent?: number
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars -- currentFeePercent kept for API compat
export function PlansSection(_props: PlansSectionProps) {
  const t = useTranslations('developer.plans')
  const { user } = useAuth()

  const texts: Partial<PricingPageTexts> = {
    title: t('title'),
    subtitle: t('subtitle'),
    free: t('free'),
    perMonth: t('perMonth').replace(/^\//, ''),
    currentPlan: t('current'),
    upgrade: t('upgrade'),
  }

  const fullName = [user?.firstName, user?.lastName].filter(Boolean).join(' ') || user?.username

  return (
    <PricingPage
      applicationId={EZPAY_APPLICATION_ID}
      userId={user?._id}
      userEmail={user?.email}
      userName={fullName}
      texts={texts}
    />
  )
}

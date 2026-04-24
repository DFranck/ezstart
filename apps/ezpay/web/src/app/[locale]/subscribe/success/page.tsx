'use client'

import { Suspense, useEffect, useState } from 'react'
import { useLocale, useTranslations } from 'next-intl'
import { useRouter, useSearchParams } from 'next/navigation'
import { Link } from '@/i18n/navigation'
import {
  Button,
  Div,
  H1,
  H3,
  Icon,
  LI,
  P,
  Section,
  Span,
  Spinner,
  UL,
} from '@ezstart/ui/components'

/**
 * Subscription checkout success landing page for EZPay.
 *
 * Stripe Checkout redirects here with `session_id` in the query string. We
 * display a success screen and auto-redirect to the user's billing page
 * after 3 seconds.
 */
function SubscribeSuccessContent() {
  const t = useTranslations('success')
  const locale = useLocale()
  const router = useRouter()
  const searchParams = useSearchParams()
  const sessionId = searchParams.get('session_id')
  const [countdown, setCountdown] = useState(3)

  useEffect(() => {
    if (countdown <= 0) {
      router.push(`/${locale}/dashboard?section=billing`)
      return
    }
    const timer = setTimeout(() => setCountdown(c => c - 1), 1000)
    return () => clearTimeout(timer)
  }, [countdown, router, locale])

  return (
    <Section size={'full'} className="relative pt-24 md:pt-32">
      <Div className="max-w-2xl mx-auto text-center px-4">
        <Div className="mb-12 flex justify-center">
          <Div className="relative w-24 h-24 md:w-32 md:h-32 rounded-full bg-primary/10 flex items-center justify-center">
            <Icon name="lucide:CreditCard" className="w-12 h-12 md:w-16 md:h-16 text-primary" />
          </Div>
        </Div>

        <H1 className="text-4xl md:text-5xl font-bold mb-6">
          <Span className="text-primary">{t('subscribeTitle')}</Span>
        </H1>

        <P className="text-xl text-muted-foreground mb-6">{t('subscribeMessage')}</P>

        <Div className="flex items-center justify-center gap-3 mb-12 text-sm text-muted-foreground">
          <Spinner variant="primary" size="sm" />
          <Span>{t('redirecting', { seconds: countdown })}</Span>
        </Div>

        <Div className="flex flex-col sm:flex-row gap-4 justify-center mb-16">
          <Button asChild size="lg">
            <Link href={`/${locale}/dashboard?section=billing`}>
              <Icon name="lucide:LayoutDashboard" className="w-5 h-5 mr-2" />
              {t('goToBilling')}
            </Link>
          </Button>
          <Button asChild variant="outline" size="lg">
            <Link href={`/${locale}`}>
              <Icon name="lucide:Home" className="w-5 h-5 mr-2" />
              {t('backHome')}
            </Link>
          </Button>
        </Div>

        <Div className="p-8 bg-muted/50 rounded-2xl text-left border border-border">
          <H3 className="font-semibold text-lg mb-4 flex items-center gap-2">
            <Icon name="lucide:Sparkles" className="w-5 h-5 text-primary" />
            {t('whatNext')}
          </H3>
          <UL className="space-y-3 text-sm text-muted-foreground">
            <LI className="flex items-start gap-3">
              <Icon name="lucide:Mail" className="w-5 h-5 mt-0.5 text-primary flex-shrink-0" />
              <Span>{t('emailConfirmation')}</Span>
            </LI>
            <LI className="flex items-start gap-3">
              <Icon name="lucide:Zap" className="w-5 h-5 mt-0.5 text-primary flex-shrink-0" />
              <Span>{t('accessGranted')}</Span>
            </LI>
            <LI className="flex items-start gap-3">
              <Icon name="lucide:Receipt" className="w-5 h-5 mt-0.5 text-primary flex-shrink-0" />
              <Span>{t('receiptAvailable')}</Span>
            </LI>
          </UL>
        </Div>

        {sessionId ? (
          <Div className="mt-6 text-xs text-muted-foreground/60" data-session-id={sessionId}>
            {t('reference', { id: sessionId.slice(-12) })}
          </Div>
        ) : null}
      </Div>
    </Section>
  )
}

export default function SubscribeSuccessPage() {
  return (
    <Suspense
      fallback={
        <Div className="min-h-[60vh] flex items-center justify-center">
          <Spinner variant="primary" size="lg" />
        </Div>
      }
    >
      <SubscribeSuccessContent />
    </Suspense>
  )
}

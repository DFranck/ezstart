'use client'

import { useAuth } from '@ezstart/auth-sdk'
import {
  BackButton,
  Badge,
  Button,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  Div,
  H2,
  Icon,
  P,
  Span,
  Spinner,
} from '@ezstart/ui/components'
import { toast } from '@ezstart/ui/utils'
import { useTranslations } from 'next-intl'
import { useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import type { PlanInfo } from '../types'

const FREE_PLAN: PlanInfo = {
  id: 'free',
  name: 'Free',
  price: 0,
  quotaMonthly: 1000,
  maxKeys: 1,
  features: ['communitySupport'],
}

const PLANS: PlanInfo[] = [
  FREE_PLAN,
  {
    id: 'pro',
    name: 'Pro',
    price: 2900,
    quotaMonthly: 50000,
    maxKeys: 10,
    features: ['emailSupport', 'priorityRateLimit'],
  },
  {
    id: 'business',
    name: 'Business',
    price: 9900,
    quotaMonthly: null,
    maxKeys: null,
    features: ['dedicatedSupport', 'sla'],
  },
]

function formatPrice(cents: number): string {
  if (cents === 0) return '$0'
  return `$${(cents / 100).toFixed(0)}`
}

function formatQuota(quota: number | null, unlimitedLabel: string): string {
  if (quota === null) return unlimitedLabel
  return quota.toLocaleString()
}

export default function BillingPage() {
  const t = useTranslations('developer.billing')
  const { user, isAuthenticated } = useAuth()
  const router = useRouter()

  // Wait for initial mount + store hydration
  const [mounted, setMounted] = useState(false)
  useEffect(() => setMounted(true), [])

  // Redirect to login if not authenticated (after hydration)
  useEffect(() => {
    if (mounted && !isAuthenticated) {
      router.replace('/login')
    }
  }, [mounted, isAuthenticated, router])

  // Current plan is always free for now (no API integration yet)
  const currentPlanId = 'free'
  const currentPlan = PLANS.find((p) => p.id === currentPlanId) ?? FREE_PLAN

  const handleUpgrade = () => {
    toast.info(t('comingSoon'))
  }

  const handleManageSubscription = () => {
    toast.info(t('comingSoon'))
  }

  if (!mounted || !isAuthenticated || !user) {
    return (
      <Div className="flex flex-1 items-center justify-center min-h-[50vh]">
        <Spinner variant="primary" size="lg" />
      </Div>
    )
  }

  return (
    <Div className="flex flex-1 items-center justify-center px-2">
    <Div className="max-w-4xl w-full space-y-6">
      {/* Current Plan */}
      <Card className="relative">
        <Div className="absolute top-4 left-4">
          <BackButton />
        </Div>

        <CardHeader className="text-center pb-4">
          <CardTitle className="text-xl md:text-2xl font-bold">{t('title')}</CardTitle>
          <CardDescription>{t('description')}</CardDescription>
        </CardHeader>

        <CardContent className="space-y-4">
          <Div className="flex items-center justify-between rounded-lg border bg-card p-4">
            <Div className="space-y-1">
              <Div className="flex items-center gap-2">
                <P className="font-semibold text-lg">{t('currentPlan')}</P>
                <Badge variant="primary">{currentPlan.name}</Badge>
              </Div>
              <P className="text-sm text-muted-foreground">
                {t('quotaLabel', {
                  quota: formatQuota(currentPlan.quotaMonthly, t('unlimited')),
                })}
              </P>
              <P className="text-sm text-muted-foreground">
                {t('maxKeysLabel', {
                  count: currentPlan.maxKeys !== null ? String(currentPlan.maxKeys) : t('unlimited'),
                })}
              </P>
            </Div>
            {currentPlanId !== 'free' && (
              <Button variant="outline" size="sm" onClick={handleManageSubscription}>
                <Icon name="lucide:Settings" className="w-4 h-4 mr-1.5" />
                {t('manageSubscription')}
              </Button>
            )}
          </Div>
        </CardContent>
      </Card>

      {/* Plans Comparison */}
      <Div className="space-y-4">
        <H2 className="text-lg font-semibold text-center">{t('choosePlan')}</H2>

        <Div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {PLANS.map((plan) => {
            const isCurrent = plan.id === currentPlanId
            return (
              <Card
                key={plan.id}
                className={`relative ${plan.id === 'pro' ? 'border-primary' : ''}`}
              >
                {plan.id === 'pro' && (
                  <Div className="absolute -top-3 left-1/2 -translate-x-1/2">
                    <Badge variant="primary">{t('popular')}</Badge>
                  </Div>
                )}

                <CardHeader className="text-center pb-2">
                  <CardTitle className="text-lg">{plan.name}</CardTitle>
                  <Div className="mt-2">
                    <Span className="text-3xl font-bold text-foreground">
                      {formatPrice(plan.price)}
                    </Span>
                    {plan.price > 0 && (
                      <Span className="text-muted-foreground text-sm">/{t('month')}</Span>
                    )}
                  </Div>
                </CardHeader>

                <CardContent className="space-y-4">
                  <Div className="space-y-2">
                    <Div className="flex items-center gap-2">
                      <Icon name="lucide:Zap" className="w-4 h-4 text-primary shrink-0" />
                      <Span className="text-sm">
                        {formatQuota(plan.quotaMonthly, t('unlimited'))} {t('requestsPerMonth')}
                      </Span>
                    </Div>
                    <Div className="flex items-center gap-2">
                      <Icon name="lucide:Key" className="w-4 h-4 text-primary shrink-0" />
                      <Span className="text-sm">
                        {plan.maxKeys !== null ? String(plan.maxKeys) : t('unlimited')}{' '}
                        {t('apiKeys')}
                      </Span>
                    </Div>
                    {plan.features.map((feature) => (
                      <Div key={feature} className="flex items-center gap-2">
                        <Icon
                          name="lucide:Check"
                          className="w-4 h-4 text-success shrink-0"
                        />
                        <Span className="text-sm">{t(`features.${feature}`)}</Span>
                      </Div>
                    ))}
                  </Div>

                  {isCurrent ? (
                    <Button variant="outline" className="w-full" disabled>
                      {t('currentLabel')}
                    </Button>
                  ) : (
                    <Button
                      variant={plan.id === 'pro' ? 'default' : 'outline'}
                      className="w-full"
                      onClick={handleUpgrade}
                    >
                      {plan.price > currentPlan.price ? t('upgrade') : t('downgrade')}
                    </Button>
                  )}
                </CardContent>
              </Card>
            )
          })}
        </Div>
      </Div>
    </Div>
    </Div>
  )
}

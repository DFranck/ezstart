'use client'

import {
  Badge,
  Button,
  Card,
  CardContent,
  CardHeader,
  Div,
  H2,
  H3,
  Icon,
  P,
  Skeleton,
  Span,
} from '@ezstart/ui/components'
import { useSubscriptionStatus } from '../react/hooks/useSubscriptionStatus.js'
import { usePaymentHistory } from '../react/hooks/usePaymentHistory.js'
import { usePayContext } from '../react/pay-provider.js'
import { formatCurrency } from '../core/format-currency.js'
import { PaymentHistory } from './PaymentHistory.js'
import { useState } from 'react'

export interface BillingDashboardTexts {
  title: string
  currentPlan: string
  freePlan: string
  nextBillingDate: string
  canceledNotice: string
  upgrade: string
  changePlan: string
  cancelSubscription: string
  cancelingSubscription: string
  recentPayments: string
  viewAll: string
  noSubscription: string
  noSubscriptionDescription: string
  choosePlan: string
  loading: string
  paymentMethod: string
  endingIn: string
  features: string
  active: string
  canceled: string
}

const DEFAULT_TEXTS: BillingDashboardTexts = {
  title: 'Billing',
  currentPlan: 'Current plan',
  freePlan: 'Free',
  nextBillingDate: 'Next billing date',
  canceledNotice: 'Your subscription will end on',
  upgrade: 'Upgrade',
  changePlan: 'Change plan',
  cancelSubscription: 'Cancel subscription',
  cancelingSubscription: 'Canceling...',
  recentPayments: 'Recent payments',
  viewAll: 'View all',
  noSubscription: 'No active subscription',
  noSubscriptionDescription: 'You are currently on the free plan.',
  choosePlan: 'Choose a plan',
  loading: 'Loading billing info...',
  paymentMethod: 'Payment method',
  endingIn: 'ending in',
  features: 'Included features',
  active: 'Active',
  canceled: 'Canceled',
}

export interface BillingDashboardProps {
  appName: string
  userId?: string
  /** Called when the user clicks "Upgrade" or "Change plan" */
  onUpgrade?: () => void
  /** Called when the user clicks "View all" on payment history */
  onViewAllPayments?: () => void
  /** Number of recent payments to show (default 5) */
  recentPaymentsCount?: number
  /** Customizable texts with English defaults */
  texts?: Partial<BillingDashboardTexts>
  className?: string
}

export function BillingDashboard({
  appName,
  userId,
  onUpgrade,
  onViewAllPayments,
  recentPaymentsCount = 5,
  texts: textsProp,
  className,
}: BillingDashboardProps) {
  const t = { ...DEFAULT_TEXTS, ...textsProp }
  const { client } = usePayContext()
  const subStatus = useSubscriptionStatus({ userId: userId || '', appName })
  const { payments, isLoading: paymentsLoading } = usePaymentHistory({
    userId,
    limit: recentPaymentsCount,
  })
  const [canceling, setCanceling] = useState(false)

  const handleCancel = async () => {
    if (!subStatus.subscription) return
    const subscriptionId =
      (subStatus.subscription.metadata?.subscriptionId as string) || subStatus.subscription.id
    setCanceling(true)
    try {
      await client.cancelSubscription(subscriptionId)
      // Reload page to reflect updated status
      window.location.reload()
    } catch {
      setCanceling(false)
    }
  }

  if (subStatus.loading) {
    return (
      <Div className={`space-y-6 ${className || ''}`}>
        <Skeleton className="h-10 w-48" />
        <Skeleton className="h-48 rounded-xl" />
        <Skeleton className="h-48 rounded-xl" />
      </Div>
    )
  }

  return (
    <Div className={`space-y-6 ${className || ''}`}>
      <H2>{t.title}</H2>

      {/* Current Plan Card */}
      <Card>
        <CardHeader>
          <Div className="flex items-center justify-between">
            <H3>{t.currentPlan}</H3>
            <Badge variant={subStatus.isActive ? (subStatus.isCanceling ? 'warning' : 'success') : 'secondary'}>
              {subStatus.isActive ? (subStatus.isCanceling ? t.canceled : t.active) : t.freePlan}
            </Badge>
          </Div>
        </CardHeader>
        <CardContent className="space-y-4">
          {subStatus.isActive && subStatus.subscription ? (
            <>
              {/* Plan name and price */}
              <Div className="flex items-baseline gap-2">
                <Span className="text-2xl font-bold">
                  {subStatus.plan || t.freePlan}
                </Span>
                <Span className="text-muted-foreground">
                  {formatCurrency(subStatus.subscription.amount / 100, subStatus.subscription.currency)}
                  {' / '}
                  {(subStatus.subscription.metadata?.interval as string) === 'year'
                    ? 'year'
                    : 'month'}
                </Span>
              </Div>

              {/* Next billing date */}
              {subStatus.periodEnd && (
                <Div className="flex items-center gap-2 text-sm">
                  <Icon name="lucide:Calendar" className="w-4 h-4 text-muted-foreground" />
                  <Span className="text-muted-foreground">
                    {subStatus.isCanceling ? t.canceledNotice : t.nextBillingDate}
                    {': '}
                    {subStatus.periodEnd.toLocaleDateString()}
                  </Span>
                </Div>
              )}

              {/* Payment method (from subscription metadata if available) */}
              {subStatus.subscription.paymentMethod && (
                <Div className="flex items-center gap-2 text-sm">
                  <Icon name="lucide:CreditCard" className="w-4 h-4 text-muted-foreground" />
                  <Span className="text-muted-foreground">
                    {t.paymentMethod}: **** {subStatus.subscription.paymentMethod}
                  </Span>
                </Div>
              )}

              {/* Features */}
              {subStatus.features.length > 0 && (
                <>
                  <Div className="border-t" />
                  <Div>
                    <P className="text-sm font-medium mb-2">{t.features}</P>
                    <Div className="space-y-1.5">
                      {subStatus.features.map((feature, i) => (
                        <Div key={i} className="flex items-center gap-2">
                          <Icon name="lucide:Check" className="w-3.5 h-3.5 text-success shrink-0" />
                          <Span className="text-sm text-muted-foreground">{feature}</Span>
                        </Div>
                      ))}
                    </Div>
                  </Div>
                </>
              )}

              {/* Actions */}
              <Div className="border-t" />
              <Div className="flex flex-wrap gap-3">
                {onUpgrade && (
                  <Button variant="default" onClick={onUpgrade}>
                    <Icon name="lucide:ArrowUp" className="w-4 h-4" />
                    {subStatus.isCanceling ? t.choosePlan : t.changePlan}
                  </Button>
                )}
                {!subStatus.isCanceling && (
                  <Button
                    variant="outline"
                    onClick={handleCancel}
                    disabled={canceling}
                  >
                    {canceling ? (
                      <>
                        <Icon name="lucide:Loader2" className="w-4 h-4 animate-spin" />
                        {t.cancelingSubscription}
                      </>
                    ) : (
                      t.cancelSubscription
                    )}
                  </Button>
                )}
              </Div>
            </>
          ) : (
            /* No active subscription */
            <Div className="text-center py-6">
              <Icon name="lucide:CreditCard" className="w-10 h-10 text-muted-foreground/40 mx-auto mb-3" />
              <P className="text-muted-foreground mb-1">{t.noSubscription}</P>
              <P className="text-muted-foreground text-sm mb-4">{t.noSubscriptionDescription}</P>
              {onUpgrade && (
                <Button variant="default" onClick={onUpgrade}>
                  {t.choosePlan}
                </Button>
              )}
            </Div>
          )}
        </CardContent>
      </Card>

      {/* Recent Payments */}
      <Card>
        <CardHeader>
          <Div className="flex items-center justify-between">
            <H3>{t.recentPayments}</H3>
            {onViewAllPayments && payments.length > 0 && (
              <Button variant="ghost" size="sm" onClick={onViewAllPayments}>
                {t.viewAll}
                <Icon name="lucide:ArrowRight" className="w-4 h-4" />
              </Button>
            )}
          </Div>
        </CardHeader>
        <CardContent>
          {paymentsLoading ? (
            <Div className="space-y-3">
              <Skeleton className="h-12 w-full" />
              <Skeleton className="h-12 w-full" />
              <Skeleton className="h-12 w-full" />
            </Div>
          ) : payments.length === 0 ? (
            <Div className="text-center py-6">
              <Icon name="lucide:Receipt" className="w-10 h-10 text-muted-foreground/40 mx-auto mb-3" />
              <P className="text-muted-foreground text-sm">No payments yet</P>
            </Div>
          ) : (
            <PaymentHistory payments={payments.slice(0, recentPaymentsCount)} />
          )}
        </CardContent>
      </Card>
    </Div>
  )
}

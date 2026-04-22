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
import { useApplicationContext } from '../react/pay-provider.js'
import { formatCurrency } from '../core/format-currency.js'
import { PaymentHistory } from './PaymentHistory.js'
import { ManageSubscriptionButton } from './ManageSubscriptionButton.js'

export interface BillingDashboardTexts {
  title: string
  currentPlan: string
  freePlan: string
  nextBillingDate: string
  canceledNotice: string
  upgrade: string
  changePlan: string
  manageSubscription: string
  manageSubscriptionLoading: string
  manageSubscriptionError: string
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
  noPaymentsYet: string
  perMonth: string
  perYear: string
  /** Shown when the PayProvider failed to resolve the publishableKey (VULN-1 fix). */
  contextUnavailableTitle: string
  contextUnavailableDescription: string
}

const DEFAULT_TEXTS: BillingDashboardTexts = {
  title: 'Billing',
  currentPlan: 'Current plan',
  freePlan: 'Free',
  nextBillingDate: 'Next billing date',
  canceledNotice: 'Your subscription will end on',
  upgrade: 'Upgrade',
  changePlan: 'Change plan',
  manageSubscription: 'Manage subscription',
  manageSubscriptionLoading: 'Loading...',
  manageSubscriptionError: 'Failed to open billing portal',
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
  noPaymentsYet: 'No payments yet',
  perMonth: 'month',
  perYear: 'year',
  contextUnavailableTitle: 'Billing context unavailable',
  contextUnavailableDescription:
    'We could not resolve your billing application. Please refresh the page or contact support if the problem persists.',
}

export interface BillingDashboardProps {
  /**
   * @deprecated Use `applicationId` instead. Kept for backward compatibility.
   */
  appName?: string
  /** Ezauth Application id this dashboard is scoped to (preferred over `appName`). */
  applicationId?: string
  userId?: string
  /** Called when the user clicks "Upgrade" or "Change plan" */
  onUpgrade?: () => void
  /** Called when the user clicks "View all" on payment history */
  onViewAllPayments?: () => void
  /** URL to redirect to when the user leaves the Stripe portal (defaults to current page). */
  manageReturnUrl?: string
  /** Number of recent payments to show (default 5) */
  recentPaymentsCount?: number
  /** Customizable texts with English defaults */
  texts?: Partial<BillingDashboardTexts>
  className?: string
}

export function BillingDashboard({
  appName,
  applicationId,
  userId,
  onUpgrade,
  onViewAllPayments,
  manageReturnUrl,
  recentPaymentsCount = 5,
  texts: textsProp,
  className,
}: BillingDashboardProps) {
  const t = { ...DEFAULT_TEXTS, ...textsProp }

  if (appName && !applicationId && typeof window !== 'undefined') {
    // eslint-disable-next-line no-console -- deprecation warning for SDK consumers
    console.warn(
      '[pay-sdk] BillingDashboard `appName` prop is deprecated, use `applicationId` instead.'
    )
  }

  // Resolve effective applicationId:
  // - Explicit prop wins (cross-app view / superadmin)
  // - Otherwise fall back to the PayProvider context (resolved via publishableKey)
  // This guarantees each app's BillingDashboard is RBAC-scoped to its own
  // Application, preventing cross-app payment leaks.
  const { applicationId: ctxApplicationId, applicationResolutionStatus } = useApplicationContext()
  const effectiveApplicationId = applicationId ?? ctxApplicationId ?? undefined

  const subStatus = useSubscriptionStatus({
    userId: userId || '',
    applicationId: effectiveApplicationId,
    appName,
  })
  const { payments, isLoading: paymentsLoading } = usePaymentHistory({
    userId,
    applicationId: effectiveApplicationId,
    limit: recentPaymentsCount,
  })

  // VULN-1: when the publishableKey resolution failed, render an explicit
  // error state instead of silently showing cross-app payments.
  if (applicationResolutionStatus === 'failed' && applicationId === undefined) {
    return (
      <Div className={`space-y-6 ${className || ''}`}>
        <H2>{t.title}</H2>
        <Card>
          <CardContent className="py-10 text-center">
            <Icon
              name="lucide:AlertTriangle"
              className="w-10 h-10 text-destructive/60 mx-auto mb-3"
            />
            <H3 className="mb-2">{t.contextUnavailableTitle}</H3>
            <P className="text-muted-foreground text-sm">{t.contextUnavailableDescription}</P>
          </CardContent>
        </Card>
      </Div>
    )
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
            <Badge
              variant={
                subStatus.isActive ? (subStatus.isCanceling ? 'warning' : 'success') : 'secondary'
              }
            >
              {subStatus.isActive ? (subStatus.isCanceling ? t.canceled : t.active) : t.freePlan}
            </Badge>
          </Div>
        </CardHeader>
        <CardContent className="space-y-4">
          {subStatus.isActive && subStatus.subscription ? (
            <>
              {/* Plan name and price */}
              <Div className="flex items-baseline gap-2">
                <Span className="text-2xl font-bold">{subStatus.plan || t.freePlan}</Span>
                <Span className="text-muted-foreground">
                  {formatCurrency(subStatus.subscription.amount, subStatus.subscription.currency)}
                  {' / '}
                  {(subStatus.subscription.metadata?.interval as string) === 'year'
                    ? t.perYear
                    : t.perMonth}
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
                <ManageSubscriptionButton
                  returnUrl={manageReturnUrl}
                  variant="outline"
                  texts={{
                    label: t.manageSubscription,
                    loading: t.manageSubscriptionLoading,
                    error: t.manageSubscriptionError,
                  }}
                />
              </Div>
            </>
          ) : (
            /* No active subscription */
            <Div className="text-center py-6">
              <Icon
                name="lucide:CreditCard"
                className="w-10 h-10 text-muted-foreground/40 mx-auto mb-3"
              />
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
              <Icon
                name="lucide:Receipt"
                className="w-10 h-10 text-muted-foreground/40 mx-auto mb-3"
              />
              <P className="text-muted-foreground text-sm">{t.noPaymentsYet}</P>
            </Div>
          ) : (
            <PaymentHistory payments={payments.slice(0, recentPaymentsCount)} />
          )}
        </CardContent>
      </Card>
    </Div>
  )
}

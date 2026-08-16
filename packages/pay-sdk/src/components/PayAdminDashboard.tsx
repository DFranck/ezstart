'use client'

/**
 * PayAdminDashboard — canonical pay-sdk admin console.
 *
 * Single drop-in component that ships the entire ezpay admin surface as 5
 * internal tabs:
 *   1. Overview      — platform analytics (revenue, MRR, top apps, trend)
 *   2. Payments      — completed/failed/refunded/pending payments + refund
 *   3. Subscriptions — active subscriptions + MRR + cancel
 *   4. Plans         — subscription plan CRUD
 *   5. Promos        — promo code CRUD
 *
 * Auto-scoped server-side via JWT — superadmin sees all tenants, app-owner
 * sees their owned apps, regular user sees only their own records. The
 * dashboard accepts NO scoping props (no `scope`, `appName`, `applicationId`,
 * `showAppFilter`) — pass none, the API derives everything from the bearer.
 *
 * @example Standalone (uses the surrounding PayProvider)
 * ```tsx
 * <PayProvider publishableKey={process.env.NEXT_PUBLIC_EZPAY_KEY}>
 *   <PayAdminDashboard />
 * </PayProvider>
 * ```
 *
 * @example With i18n (next-intl)
 * ```tsx
 * const t = useTranslations('admin.pay')
 * <PayAdminDashboard
 *   texts={{
 *     tabOverview: t('tabs.overview'),
 *     tabPayments: t('tabs.payments'),
 *     overview: { title: t('overview.title') },
 *     payments: { totalRevenue: t('payments.totalRevenue') },
 *   }}
 * />
 * ```
 */
import { useMemo } from 'react'
import {
  Button,
  Div,
  Icon,
  Span,
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '@ezstart/ui/components'
import { toast } from '@ezstart/ui/utils'
import { usePayContext } from '../react/pay-provider.js'
import { DEFAULT_OVERVIEW_TEXTS, PayOverviewSection } from './admin/_internal/PayOverviewSection.js'
import { DEFAULT_PAYMENTS_TEXTS, PayPaymentsSection } from './admin/_internal/PayPaymentsSection.js'
import {
  DEFAULT_SUBSCRIPTIONS_TEXTS,
  PaySubscriptionsSection,
} from './admin/_internal/PaySubscriptionsSection.js'
import { DEFAULT_PLANS_TEXTS, PayPlansSection } from './admin/_internal/PayPlansSection.js'
import { DEFAULT_PROMOS_TEXTS, PayPromosSection } from './admin/_internal/PayPromosSection.js'
import type {
  PayOverviewSectionTexts,
  PayPaymentsSectionTexts,
  PayPlansSectionTexts,
  PayPromosSectionTexts,
  PaySubscriptionsSectionTexts,
} from './admin/_internal/types.js'

// ===== Public types =====

export interface PayAdminDashboardTexts {
  // Tabs
  tabOverview?: string
  tabPayments?: string
  tabSubscriptions?: string
  tabPlans?: string
  tabPromos?: string

  // Test mode bulk actions (top banner)
  testModeWarning?: string
  deleteAll?: string
  deleteAllConfirm?: string
  deleteAllSuccess?: string
  deleteAllError?: string

  // Per-section texts
  overview?: Partial<PayOverviewSectionTexts>
  payments?: Partial<PayPaymentsSectionTexts>
  subscriptions?: Partial<PaySubscriptionsSectionTexts>
  plans?: Partial<PayPlansSectionTexts>
  promos?: Partial<PayPromosSectionTexts>
}

export interface PayAdminDashboardProps {
  /**
   * When `true`, the dashboard filters all tabs to TEST-mode payments only
   * (Stripe test keys / sandbox transactions) and surfaces destructive bulk
   * actions (refund-all, cancel-all, delete-all). Use this in your dev/test
   * environment dashboards. Defaults to `undefined` (no liveMode filter).
   */
  testMode?: boolean
  className?: string
  texts?: PayAdminDashboardTexts
}

// ===== Defaults =====

const DEFAULT_TOP_TEXTS = {
  tabOverview: 'Overview',
  tabPayments: 'Payments',
  tabSubscriptions: 'Subscriptions',
  tabPlans: 'Plans',
  tabPromos: 'Promos',
  testModeWarning: 'Test Mode — Bulk actions available',
  deleteAll: 'Delete All Data',
  deleteAllConfirm:
    'DELETE ALL payment records from the database? This permanently removes all test data and cannot be undone.',
  deleteAllSuccess: 'records deleted',
  deleteAllError: 'Failed to delete',
} as const

// ===== Component =====

export function PayAdminDashboard({ testMode, className, texts }: PayAdminDashboardProps) {
  const { client, appSlug } = usePayContext()

  const overviewTexts = useMemo(
    () => ({ ...DEFAULT_OVERVIEW_TEXTS, ...texts?.overview }),
    [texts?.overview]
  )
  const paymentsTexts = useMemo(
    () => ({ ...DEFAULT_PAYMENTS_TEXTS, ...texts?.payments }),
    [texts?.payments]
  )
  const subscriptionsTexts = useMemo(
    () => ({ ...DEFAULT_SUBSCRIPTIONS_TEXTS, ...texts?.subscriptions }),
    [texts?.subscriptions]
  )
  const plansTexts = useMemo(() => ({ ...DEFAULT_PLANS_TEXTS, ...texts?.plans }), [texts?.plans])
  const promosTexts = useMemo(
    () => ({ ...DEFAULT_PROMOS_TEXTS, ...texts?.promos }),
    [texts?.promos]
  )

  const tabOverview = texts?.tabOverview ?? DEFAULT_TOP_TEXTS.tabOverview
  const tabPayments = texts?.tabPayments ?? DEFAULT_TOP_TEXTS.tabPayments
  const tabSubscriptions = texts?.tabSubscriptions ?? DEFAULT_TOP_TEXTS.tabSubscriptions
  const tabPlans = texts?.tabPlans ?? DEFAULT_TOP_TEXTS.tabPlans
  const tabPromos = texts?.tabPromos ?? DEFAULT_TOP_TEXTS.tabPromos
  const testModeWarning = texts?.testModeWarning ?? DEFAULT_TOP_TEXTS.testModeWarning
  const deleteAllLabel = texts?.deleteAll ?? DEFAULT_TOP_TEXTS.deleteAll
  const deleteAllConfirm = texts?.deleteAllConfirm ?? DEFAULT_TOP_TEXTS.deleteAllConfirm
  const deleteAllSuccess = texts?.deleteAllSuccess ?? DEFAULT_TOP_TEXTS.deleteAllSuccess
  const deleteAllError = texts?.deleteAllError ?? DEFAULT_TOP_TEXTS.deleteAllError

  return (
    <Div className={className}>
      {testMode && (
        <Div className="bg-warning/10 border border-warning/30 rounded-lg p-3 mb-4 flex items-center gap-2">
          <Icon name="lucide:AlertTriangle" className="w-4 h-4 text-warning shrink-0" />
          <Span className="text-sm font-medium text-warning flex-1">{testModeWarning}</Span>
          <Button
            variant="destructive"
            size="sm"
            onClick={async () => {
              if (typeof window !== 'undefined' && !window.confirm(deleteAllConfirm)) return
              try {
                const result = await client.cleanupPayments(appSlug || undefined)
                toast.success(`${result.deletedCount} ${deleteAllSuccess}`)
                if (typeof window !== 'undefined') window.location.reload()
              } catch {
                toast.error(deleteAllError)
              }
            }}
          >
            {deleteAllLabel}
          </Button>
        </Div>
      )}

      <Tabs defaultValue="overview">
        <TabsList>
          <TabsTrigger value="overview">{tabOverview}</TabsTrigger>
          <TabsTrigger value="payments">{tabPayments}</TabsTrigger>
          <TabsTrigger value="subscriptions">{tabSubscriptions}</TabsTrigger>
          <TabsTrigger value="plans">{tabPlans}</TabsTrigger>
          <TabsTrigger value="promos">{tabPromos}</TabsTrigger>
        </TabsList>

        <TabsContent value="overview">
          <PayOverviewSection texts={overviewTexts} />
        </TabsContent>

        <TabsContent value="payments">
          <PayPaymentsSection texts={paymentsTexts} testMode={testMode} />
        </TabsContent>

        <TabsContent value="subscriptions">
          <PaySubscriptionsSection texts={subscriptionsTexts} testMode={testMode} />
        </TabsContent>

        <TabsContent value="plans">
          <PayPlansSection texts={plansTexts} />
        </TabsContent>

        <TabsContent value="promos">
          <PayPromosSection texts={promosTexts} />
        </TabsContent>
      </Tabs>
    </Div>
  )
}

'use client'

import { useTranslations } from 'next-intl'
import { Card, Div, H1, Main, P } from '@ezstart/ui/components'
import { PayAdminDashboard } from '@ezstart/pay-sdk'
import { RequireAuth, RequireRole } from '@ezstart/auth-sdk'

export default function AdminPage() {
  const t = useTranslations('admin')

  return (
    <RequireAuth
      fallbackComponent={
        <Main className="container mx-auto py-12 px-4">
          <Div className="max-w-md mx-auto text-center">
            <Card className="p-8">
              <H1 className="text-2xl font-bold mb-4">{t('accessRequired')}</H1>
              <P className="text-muted-foreground">{t('accessRequiredDescription')}</P>
            </Card>
          </Div>
        </Main>
      }
    >
      <RequireRole
        roles={['superadmin', 'admin']}
        appName="ezpay"
        fallbackComponent={
          <Main className="container mx-auto py-12 px-4">
            <Div className="max-w-md mx-auto text-center">
              <Card className="p-8">
                <H1 className="text-2xl font-bold mb-4">{t('accessRequired')}</H1>
                <P className="text-muted-foreground">{t('accessRequiredDescription')}</P>
              </Card>
            </Div>
          </Main>
        }
      >
        <AdminContent />
      </RequireRole>
    </RequireAuth>
  )
}

function AdminContent() {
  const t = useTranslations('admin')

  return (
    <PayAdminDashboard
      appName=""
      showAppFilter
      testMode
      texts={{
        // Stats
        totalRevenue: t('stats.totalRevenue'),
        totalPayments: t('stats.totalPayments'),

        // Table headers
        dateHeader: t('table.date'),
        typeHeader: t('table.type'),
        userHeader: t('table.client'),
        amountHeader: t('table.amount'),
        statusHeader: t('table.status'),
        actionsHeader: t('table.actions'),

        // Filters
        allTypes: t('filters.allTypes'),
        allStatuses: t('filters.allStatuses'),
        searchPlaceholder: t('filters.searchEmail'),

        // Payment types
        donation: t('filters.donation'),
        purchase: t('filters.purchase'),
        subscription: t('filters.subscription'),
        invoice: t('filters.invoice'),

        // Payment statuses
        completed: t('filters.completed'),
        pending: t('filters.pending'),
        failed: t('filters.failed'),
        refunded: t('filters.refunded'),
        cancelled: t('filters.cancelled'),

        // Actions
        refund: t('table.refund'),
        refundTitle: t('table.refund'),
        refundDescription: t('table.refundConfirm'),
        refundSuccess: t('table.refundSuccess'),
        refundError: t('table.refundError'),
        cancelSubscription: t('table.cancelSubscription'),
        cancelSubscriptionTitle: t('table.cancelSubscription'),
        cancelSubscriptionDescription: t('table.cancelConfirm'),
        cancelSubscriptionSuccess: t('table.cancelSuccess'),
        cancelSubscriptionError: t('table.cancelError'),

        // Dialog common
        confirm: t('dialog.confirm'),
        cancel: t('dialog.cancel'),
        loading: t('dialog.loading'),
        retry: t('dialog.retry'),
        close: t('dialog.close'),

        // Empty states
        noPayments: t('table.noPayments'),
      }}
    />
  )
}

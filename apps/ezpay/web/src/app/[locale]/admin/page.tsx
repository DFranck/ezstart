'use client'

import { useTranslations } from 'next-intl'
import { useEffect, useState } from 'react'
import { Card, Div, H1, Main, P } from '@ezstart/ui/components'
import { PayAdminDashboard } from '@ezstart/pay-sdk'
import { hasAnyRole } from '@ezstart/rbac'

// ========================================
// Auth helpers
// ========================================

function getToken(): string | null {
  if (typeof window === 'undefined') return null
  try {
    const raw = localStorage.getItem('ezauth-storage')
    if (raw) {
      const parsed = JSON.parse(raw)
      return parsed?.state?.accessToken || null
    }
  } catch {}
  return null
}

function isAdmin(): boolean {
  if (typeof window === 'undefined') return false
  try {
    const raw = localStorage.getItem('ezauth-storage')
    if (raw) {
      const parsed = JSON.parse(raw)
      const user = parsed?.state?.user
      if (!user) return false
      return hasAnyRole(user, ['superadmin', 'admin'], 'ezpay')
    }
  } catch {}
  return false
}

// ========================================
// Component
// ========================================

export default function AdminPage() {
  const t = useTranslations('admin')

  // Auth state
  const [token, setToken] = useState<string | null>(null)
  const [authChecked, setAuthChecked] = useState(false)

  useEffect(() => {
    setToken(getToken())
    setAuthChecked(true)
  }, [])

  // ---- Auth guard ----
  if (!authChecked) return null
  if (!token || !isAdmin()) {
    return (
      <Main className="container mx-auto py-12 px-4">
        <Div className="max-w-md mx-auto text-center">
          <Card className="p-8">
            <H1 className="text-2xl font-bold mb-4">{t('accessRequired')}</H1>
            <P className="text-muted-foreground">{t('accessRequiredDescription')}</P>
          </Card>
        </Div>
      </Main>
    )
  }

  return (
    <PayAdminDashboard
      appName="ezpay"
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

// ========================================
// BACKUP: Original custom admin page (pre-migration)
// ========================================
// The original custom-built admin page has been replaced by
// <PayAdminDashboard> from @ezstart/pay-sdk.
//
// The original implementation included:
// - Custom stats cards (totalRevenue, totalPayments, donations, purchases)
// - Manual fetch() calls to API_URL/payments with Authorization header
// - Custom DataTable columns with Badge variants for status/type
// - Debounced search, type/status filters
// - ConfirmActionDialog for refund and cancel subscription
// - Manual client-side stats aggregation from fetched payments
//
// If you need to restore the old behavior, check git history for this file
// prior to the PayAdminDashboard migration commit.

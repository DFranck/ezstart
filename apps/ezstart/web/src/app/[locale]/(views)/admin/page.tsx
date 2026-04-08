'use client'

import { useMemo } from 'react'
import { AccessDenied, AuthAdminDashboard, LoginButton, RequireAuth } from '@ezstart/auth-sdk'
import { InsufficientPermissions, RequireRole } from '@ezstart/rbac'
import { PayAdminDashboard } from '@ezstart/pay-sdk'
import { AIAdminDashboard, AIProvider } from '@ezstart/ai-sdk/client'
import {
  Card,
  Div,
  Section,
  Spinner,
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '@ezstart/ui/components'
import { useTranslations } from 'next-intl'
import { MonitoringTab } from './components/monitoring-tab'

function AdminPanelContent() {
  const t = useTranslations()
  const tu = useTranslations('admin.users')
  const tr = useTranslations('admin.roles')
  const td = useTranslations('admin.dialog')
  const te = useTranslations('admin.editRoles')
  const tp = useTranslations('admin.ezpay')

  const authTexts = useMemo(
    () => ({
      totalUsers: tu('stats.totalUsers'),
      online: tu('stats.online'),
      superadmins: tu('stats.superadmins'),
      admins: tu('stats.admins'),
      withAppRoles: tu('stats.withAppRoles'),
      searchPlaceholder: tu('searchPlaceholder'),
      columnEmail: tu('columns.email'),
      columnUsername: tu('columns.username'),
      columnRoles: tu('columns.roles'),
      columnLastActive: tu('columns.lastActive'),
      columnCreatedAt: tu('columns.createdAt'),
      columnActions: tu('columns.actions'),
      edit: tu('edit'),
      delete: tu('delete'),
      noUsers: tu('noUsers'),
      onlineLabel: tu('online'),
      minutesAgo: tu('minutesAgo'),
      hoursAgo: tu('hoursAgo'),
      daysAgo: tu('daysAgo'),
      confirmDeleteTitle: tu('confirmDeleteTitle'),
      confirmDeleteDescription: tu('confirmDeleteDescription'),
      cancel: td('cancel'),
      confirm: td('confirm'),
      deleteError: tu('deleteError'),
      editRolesTitle: te('title'),
      editRolesSubtitle: te('subtitle'),
      globalRolesLabel: te('globalRoles'),
      appRolesLabel: te('appRoles'),
      noAppRoles: te('noAppRoles'),
      save: te('save'),
      editError: te('editError'),
      roleSuperadmin: tr('superadmin'),
      roleAdmin: tr('admin'),
      roleManager: tr('manager'),
      roleBetaTester: tr('beta-tester'),
      roleClient: tr('client'),
    }),
    [tu, tr, td, te]
  )

  const payTexts = useMemo(
    () => ({
      totalRevenue: tp('stats.totalRevenue'),
      totalPayments: tp('stats.totalPayments'),
      searchPlaceholder: tp('filters.searchEmail'),
      allTypes: tp('filters.allTypes'),
      allStatuses: tp('filters.allStatuses'),
      dateHeader: tp('table.date'),
      typeHeader: tp('table.type'),
      userHeader: tp('table.client'),
      amountHeader: tp('table.amount'),
      statusHeader: tp('table.status'),
      actionsHeader: tp('table.actions'),
      donation: tp('filters.donation'),
      purchase: tp('filters.purchase'),
      subscription: tp('filters.subscription'),
      invoice: tp('filters.invoice'),
      completed: tp('filters.completed'),
      pending: tp('filters.pending'),
      failed: tp('filters.failed'),
      refunded: tp('filters.refunded'),
      cancelled: tp('filters.cancelled'),
      refund: tp('table.refund'),
      refundDescription: tp('table.refundConfirm'),
      refundSuccess: tp('table.refundSuccess'),
      refundError: tp('table.refundError'),
      cancelSubscription: tp('table.cancelSubscription'),
      cancelSubscriptionDescription: tp('table.cancelConfirm'),
      cancelSubscriptionSuccess: tp('table.cancelSuccess'),
      cancelSubscriptionError: tp('table.cancelError'),
      noPayments: tp('table.noPayments'),
      confirm: td('confirm'),
      cancel: td('cancel'),
      loading: td('loading'),
      close: td('close'),
      retry: td('retry'),
    }),
    [tp, td]
  )

  return (
    <Div className="w-full max-w-7xl mx-auto px-4 my-10">
      <Tabs defaultValue="ezauth" className="w-full">
        <TabsList>
          <TabsTrigger value="ezauth">{t('admin.tabs.ezauth')}</TabsTrigger>
          <TabsTrigger value="ezpay">{t('admin.tabs.ezpay')}</TabsTrigger>
          <TabsTrigger value="monitoring">{t('admin.tabs.monitoring')}</TabsTrigger>
          <TabsTrigger value="ai">{t('admin.tabs.ai')}</TabsTrigger>
        </TabsList>

        <TabsContent value="ezauth" className="w-full">
          <AuthAdminDashboard appName="ezstart" texts={authTexts} />
        </TabsContent>

        <TabsContent value="ezpay" className="w-full">
          <PayAdminDashboard appName="ezstart" texts={payTexts} />
        </TabsContent>

        <TabsContent value="monitoring" className="w-full">
          <MonitoringTab />
        </TabsContent>

        <TabsContent value="ai" className="w-full">
          <AIProvider appName="">
            <AIAdminDashboard showAppFilter />
          </AIProvider>
        </TabsContent>
      </Tabs>
    </Div>
  )
}

export default function AdminPage() {
  const t = useTranslations()

  return (
    <RequireAuth
      loadingComponent={
        <Section size="full">
          <Spinner size="lg" />
        </Section>
      }
      fallbackComponent={
        <Section size="full">
          <Card variant={'ghost'}>
            <AccessDenied>
              <LoginButton>{t('auth.login')}</LoginButton>
            </AccessDenied>
          </Card>
        </Section>
      }
    >
      <RequireRole
        roles="superadmin"
        fallbackComponent={
          <Section size={'full'}>
            <Card variant={'ghost'}>
              <InsufficientPermissions requiredRoles="superadmin" />
            </Card>
          </Section>
        }
      >
        <AdminPanelContent />
      </RequireRole>
    </RequireAuth>
  )
}

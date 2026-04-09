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
  const ta = useTranslations('admin.ai')

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
      minutesAgo: tu.raw('minutesAgo'),
      hoursAgo: tu.raw('hoursAgo'),
      daysAgo: tu.raw('daysAgo'),
      confirmDeleteTitle: tu('confirmDeleteTitle'),
      confirmDeleteDescription: tu('confirmDeleteDescription'),
      cancel: td('cancel'),
      confirm: td('confirm'),
      deleteError: tu('deleteError'),
      editRolesTitle: te('title'),
      editRolesSubtitle: te.raw('subtitle'),
      globalRolesLabel: te('globalRoles'),
      appRolesLabel: te.raw('appRoles'),
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

  const aiTexts = useMemo(
    () => ({
      promptsTab: ta('tabs.prompts'),
      providersTab: ta('tabs.providers'),
      conversationsTab: ta('tabs.conversations'),
      createPrompt: ta('prompts.create'),
      editPrompt: ta('prompts.edit'),
      deletePrompt: ta('prompts.delete'),
      promptKey: ta('prompts.key'),
      promptName: ta('prompts.name'),
      promptContent: ta('prompts.content'),
      promptType: ta('prompts.type'),
      promptProvider: ta('prompts.provider'),
      promptStatus: ta('prompts.status'),
      promptActions: ta('prompts.actions'),
      promptDescription: ta('prompts.description'),
      totalPrompts: ta('prompts.totalPrompts'),
      activeCount: ta('prompts.activeCount'),
      defaultCount: ta('prompts.defaultCount'),
      defaultLabel: ta('prompts.defaultLabel'),
      promptUpdated: ta('prompts.updated'),
      promptCreated: ta('prompts.created'),
      promptDeleted: ta('prompts.deleted'),
      savePromptError: ta('prompts.saveError'),
      deletePromptError: ta('prompts.deleteError'),
      loadPromptsError: ta('prompts.loadError'),
      promptKeyPlaceholder: ta('prompts.keyPlaceholder'),
      promptNamePlaceholder: ta('prompts.namePlaceholder'),
      promptDescriptionPlaceholder: ta('prompts.descriptionPlaceholder'),
      promptContentPlaceholder: ta('prompts.contentPlaceholder'),
      providerName: ta('providers.name'),
      providerType: ta('providers.type'),
      providerModel: ta('providers.model'),
      providerCapabilities: ta('providers.capabilities'),
      providerStatus: ta('providers.status'),
      loadProvidersError: ta('providers.loadError'),
      totalProviders: ta('providers.totalProviders'),
      activeProviders: ta('providers.activeProviders'),
      inactiveProviders: ta('providers.inactiveProviders'),
      addProvider: ta('providers.addProvider'),
      editProvider: ta('providers.editProvider'),
      deleteProvider: ta('providers.deleteProvider'),
      providerIdLabel: ta('providers.providerIdLabel'),
      providerTypeLabel: ta('providers.providerTypeLabel'),
      priorityLabel: ta('providers.priorityLabel'),
      configLabel: ta('providers.configLabel'),
      modelOverride: ta('providers.modelOverride'),
      temperatureLabel: ta('providers.temperatureLabel'),
      maxTokensLabel: ta('providers.maxTokensLabel'),
      toggleEnabled: ta('providers.toggleEnabled'),
      toggleDisabled: ta('providers.toggleDisabled'),
      availableProviders: ta('providers.availableProviders'),
      appProviders: ta('providers.appProviders'),
      loadAppProvidersError: ta('providers.loadAppProvidersError'),
      providerCreated: ta('providers.providerCreated'),
      providerUpdated: ta('providers.providerUpdated'),
      providerDeleted: ta('providers.providerDeleted'),
      providerToggled: ta('providers.providerToggled'),
      saveProviderError: ta('providers.saveProviderError'),
      deleteProviderError: ta('providers.deleteProviderError'),
      toggleProviderError: ta('providers.toggleProviderError'),
      deleteProviderConfirm: ta('providers.deleteProviderConfirm'),
      promptProviders: ta('providers.promptProviders'),
      conversationTitle: ta('conversations.title'),
      conversationUser: ta('conversations.user'),
      conversationMessages: ta('conversations.messages'),
      conversationDate: ta('conversations.date'),
      conversationPreview: ta('conversations.preview'),
      totalConversations: ta('conversations.totalConversations'),
      loadConversationsError: ta('conversations.loadError'),
      previous: td('previous'),
      next: td('next'),
      allAppsPlaceholder: ta('allAppsPlaceholder'),
      noData: ta('noData'),
      loading: td('loading'),
      save: ta('save'),
      cancel: td('cancel'),
      confirm: td('confirm'),
      deleteConfirm: ta('prompts.deleteConfirm'),
      active: ta('active'),
      inactive: ta('inactive'),
    }),
    [ta, td]
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
          <AuthAdminDashboard texts={authTexts} />
        </TabsContent>

        <TabsContent value="ezpay" className="w-full">
          <PayAdminDashboard texts={payTexts} />
        </TabsContent>

        <TabsContent value="monitoring" className="w-full">
          <MonitoringTab />
        </TabsContent>

        <TabsContent value="ai" className="w-full">
          <AIProvider appName="ezstart">
            <AIAdminDashboard showAppFilter texts={aiTexts} />
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

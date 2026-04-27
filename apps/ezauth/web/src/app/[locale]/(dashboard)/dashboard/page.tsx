'use client'

import { useAuth, useMyApplications } from '@ezstart/auth-sdk'
import {
  ApplicationsList,
  DeleteAccountSection,
  EZAuthDashboard,
  type ApplicationsFlowTexts,
  type DeleteAccountSectionTexts,
  type EZAuthDashboardExtraSection,
  type EZAuthDashboardTexts,
} from '@ezstart/auth-sdk/components'
import {
  BillingDashboard,
  InvoiceHistorySection,
  ManageSubscriptionButton,
  type InvoiceHistorySectionTexts,
} from '@ezstart/pay-sdk/components'
import { Button, Card, CardContent, Div, Icon, P, Span, Spinner } from '@ezstart/ui/components'
import { useLocale, useTranslations } from 'next-intl'
import { useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import { Link } from '@/i18n/navigation'
import { EzauthScopeIndicator } from '@/components/ezauth-scope-indicator'

/**
 * Unified `/dashboard` — Stripe/Clerk style sidebar with progressive-disclosure
 * sections (Overview, Account, Applications, API Keys, Billing, Usage, Users,
 * Platform, Settings).
 *
 * The shell + built-in sections come from `<EZAuthDashboard />` in
 * `@ezstart/auth-sdk`. App-specific sections (like the Applications list that
 * needs our Next router for detail navigation) are injected via `slots`.
 */
export default function DashboardPage() {
  const t = useTranslations('dashboard')
  const tApps = useTranslations('developer.applications')
  const tAccount = useTranslations('account')
  const tAdminCta = useTranslations('dashboard.platformAdmin')
  const tOAuth = useTranslations('dashboard.oauthProviders')
  const tInvoices = useTranslations('dashboard.invoices')
  const tDeleteAccount = useTranslations('account.deleteAccount')
  const tAuditLog = useTranslations('dashboard.auditLog')
  const tAuditLogActions = useTranslations('dashboard.auditLog.actions')
  const locale = useLocale()
  const router = useRouter()

  const { user, isAuthenticated } = useAuth()

  // Guard hydration to avoid a redirect flash.
  const [mounted, setMounted] = useState(false)
  useEffect(() => setMounted(true), [])

  const { data: myApps } = useMyApplications(mounted && isAuthenticated)

  useEffect(() => {
    if (mounted && !isAuthenticated) {
      router.replace(`/${locale}/login`)
    }
  }, [mounted, isAuthenticated, router, locale])

  if (!mounted || !isAuthenticated || !user) {
    return (
      <Div className="flex flex-1 items-center justify-center min-h-[50vh]">
        <Spinner variant="primary" size="lg" />
      </Div>
    )
  }

  const isSuperadmin = user.globalRoles?.includes('superadmin') ?? false
  const hasOwnedApps = (myApps?.length ?? 0) > 0

  // Translated nav labels + core UI strings.
  const dashboardTexts: Partial<EZAuthDashboardTexts> = {
    navOverview: t('nav.overview'),
    navAccount: t('nav.account'),
    navApplications: t('nav.applications'),
    navApiKeys: t('nav.apiKeys'),
    navBilling: t('nav.billing'),
    navUsage: t('nav.usage'),
    navActivity: t('nav.activity'),
    navSettings: t('nav.settings'),
    brand: t('brand'),
    welcomeBack: t('welcomeBack'),
    memberSince: t('memberSince'),
    plan: t('plan'),
    planFree: t('planFree'),
    statsApps: t('stats.apps'),
    statsRoles: t('stats.roles'),
    statsApiKeys: t('stats.apiKeys'),
    billingTitle: t('billing.title'),
    billingDescription: t('billing.description'),
    comingSoon: t('billing.comingSoon'),
    usageTitle: t('usage.title'),
    usageDescription: t('usage.description'),
    usageComingSoon: t('usage.comingSoon'),
    settingsEmailVerification: t('settings.emailVerification'),
    settingsTwoFactor: t('settings.twoFactor'),
    settingsSessions: t('settings.sessions'),
    settingsConnectedAccounts: t('settings.connectedAccounts'),
    oauthProviders: {
      title: tOAuth('title'),
      description: tOAuth('description'),
      connected: tOAuth('connected'),
      notConnected: tOAuth('notConnected'),
      connect: tOAuth('connect'),
      disconnect: tOAuth('disconnect'),
      disconnecting: tOAuth('disconnecting'),
      comingSoon: tOAuth('comingSoon'),
      confirmDisconnectTitle: tOAuth('confirmDisconnectTitle'),
      confirmDisconnectDescription: tOAuth('confirmDisconnectDescription'),
      cancel: tOAuth('cancel'),
      disconnectSuccess: tOAuth('disconnectSuccess'),
      disconnectError: tOAuth('disconnectError'),
      cannotDisconnectLastMethod: tOAuth('cannotDisconnectLastMethod'),
      noProvidersAvailable: tOAuth('noProvidersAvailable'),
      loading: tOAuth('loading'),
    },
    auditLog: {
      title: tAuditLog('title'),
      description: tAuditLog('description'),
      retentionFree: tAuditLog('retentionFree'),
      retentionPro: tAuditLog('retentionPro'),
      empty: tAuditLog('empty'),
      loading: tAuditLog('loading'),
      error: tAuditLog('error'),
      retry: tAuditLog('retry'),
      filterLabel: tAuditLog('filterLabel'),
      filterAll: tAuditLog('filterAll'),
      filterLogin: tAuditLog('filterLogin'),
      filterSecurity: tAuditLog('filterSecurity'),
      filterApiKeys: tAuditLog('filterApiKeys'),
      filterProfile: tAuditLog('filterProfile'),
      columnDate: tAuditLog('columnDate'),
      columnAction: tAuditLog('columnAction'),
      columnDetails: tAuditLog('columnDetails'),
      columnStatus: tAuditLog('columnStatus'),
      statusOk: tAuditLog('statusOk'),
      actions: {
        login: tAuditLogActions('login'),
        logout: tAuditLogActions('logout'),
        password_change: tAuditLogActions('password_change'),
        email_change: tAuditLogActions('email_change'),
        oauth_link: tAuditLogActions('oauth_link'),
        oauth_unlink: tAuditLogActions('oauth_unlink'),
        '2fa_enabled': tAuditLogActions('2fa_enabled'),
        '2fa_disabled': tAuditLogActions('2fa_disabled'),
        session_revoked: tAuditLogActions('session_revoked'),
        api_key_created: tAuditLogActions('api_key_created'),
        api_key_revoked: tAuditLogActions('api_key_revoked'),
        profile_updated: tAuditLogActions('profile_updated'),
      },
    },
  }

  // Applications list texts (re-using the existing `developer.applications`
  // translations so we don't duplicate strings).
  const applicationsTexts: Partial<ApplicationsFlowTexts> = {
    list: {
      title: tApps('title'),
      description: tApps('description'),
      newApplication: tApps('newApplication'),
      loading: tApps('loading'),
      errorTitle: tApps('errorTitle'),
      errorDescription: tApps('errorDescription'),
      retry: tApps('retry'),
      emptyTitle: tApps('emptyTitle'),
      emptyDescription: tApps('emptyDescription'),
      emptyCta: tApps('emptyCta'),
      showArchived: tApps('showArchived'),
      showAll: tApps('showAll'),
    },
    card: {
      manage: tApps('card.manage'),
      archive: tApps('card.archive'),
      archiveTitle: tApps('card.archiveTitle'),
      archiveConfirm: tApps('card.archiveConfirm'),
      archiveConfirmCascade: tApps('card.archiveConfirmCascade'),
      archiveCancel: tApps('card.archiveCancel'),
      archiveSubmit: tApps('card.archiveSubmit'),
      archiveSuccess: tApps('card.archiveSuccess'),
      archiveFailed: tApps('card.archiveFailed'),
      statusActive: tApps('card.statusActive'),
      statusArchived: tApps('card.statusArchived'),
      createdLabel: tApps('card.createdLabel'),
      keysLabel: tApps('card.keysLabel'),
    },
    create: {
      title: tApps('create.title'),
      description: tApps('create.description'),
      nameLabel: tApps('create.nameLabel'),
      namePlaceholder: tApps('create.namePlaceholder'),
      slugLabel: tApps('create.slugLabel'),
      slugPlaceholder: tApps('create.slugPlaceholder'),
      slugHelp: tApps('create.slugHelp'),
      slugInvalid: tApps('create.slugInvalid'),
      slugTaken: tApps('create.slugTaken'),
      descriptionLabel: tApps('create.descriptionLabel'),
      descriptionPlaceholder: tApps('create.descriptionPlaceholder'),
      cancel: tApps('create.cancel'),
      submit: tApps('create.submit'),
      submitting: tApps('create.submitting'),
      createFailed: tApps('create.createFailed'),
    },
  }

  // Slot: the Applications list needs our router to push to the detail view.
  const applicationsSlot = (
    <Div className="space-y-6">
      <ApplicationsList
        locale={locale}
        texts={applicationsTexts}
        showSuperadminAllToggle={isSuperadmin}
        onSelectApplication={app => router.push(`/${locale}/developer/${app.id}`)}
      />
    </Div>
  )

  // Slot: Billing — shows the user's own EZAuth subscription (via pay-sdk) +
  // Manage button that opens the Stripe Customer Portal.
  //
  // The EZAuth PayProvider is intentionally mounted without a `publishableKey`
  // (ezauth keys can't resolve ezpay's `/api/keys/config`), so we pass the
  // Application id explicitly here to scope the dashboard to EZAuth plans.
  const invoicesTexts: Partial<InvoiceHistorySectionTexts> = {
    title: tInvoices('title'),
    description: tInvoices('description'),
    empty: tInvoices('empty'),
    emptyDescription: tInvoices('emptyDescription'),
    filterAll: tInvoices('filter.all'),
    filterPaid: tInvoices('filter.paid'),
    filterPending: tInvoices('filter.pending'),
    filterFailed: tInvoices('filter.failed'),
    download: tInvoices('download'),
    viewReceipt: tInvoices('viewReceipt'),
    loading: tInvoices('loading'),
    errorTitle: tInvoices('errorTitle'),
    errorDescription: tInvoices('errorDescription'),
    retry: tInvoices('retry'),
    contextUnavailableTitle: tInvoices('contextUnavailableTitle'),
    contextUnavailableDescription: tInvoices('contextUnavailableDescription'),
    columns: {
      date: tInvoices('columns.date'),
      description: tInvoices('columns.description'),
      amount: tInvoices('columns.amount'),
      status: tInvoices('columns.status'),
      actions: tInvoices('columns.actions'),
    },
    status: {
      paid: tInvoices('status.paid'),
      pending: tInvoices('status.pending'),
      failed: tInvoices('status.failed'),
      refunded: tInvoices('status.refunded'),
      cancelled: tInvoices('status.cancelled'),
    },
  }

  const billingSlot = (
    <Div className="space-y-6">
      <BillingDashboard applicationId={process.env.NEXT_PUBLIC_EZAUTH_APP_ID} userId={user._id} />
      <ManageSubscriptionButton />
      <InvoiceHistorySection
        applicationId={process.env.NEXT_PUBLIC_EZAUTH_APP_ID}
        userId={user._id}
        texts={invoicesTexts}
      />
    </Div>
  )

  // Fallback account label reuse for screen-reader-friendly descriptions.
  void tAccount

  // "Platform Admin" CTA — superadmin-only, rendered in the sidebar footer.
  // Echoes the Vercel / Stripe pattern: `/dashboard` is the user space, the
  // dedicated `/admin` route hosts the federated admin dashboard
  // (`<AuthAdminDashboard>` + future `<PayAdminDashboard>` / monitoring tabs).
  const platformAdminCta = isSuperadmin ? (
    <Card className="bg-muted/40 border-dashed">
      <CardContent className="p-3 space-y-2">
        <Div className="flex items-center gap-2">
          <Icon name="lucide:ShieldCheck" className="h-4 w-4 text-primary shrink-0" />
          <Span className="text-xs font-medium text-foreground">{tAdminCta('title')}</Span>
        </Div>
        <P className="text-xs text-muted-foreground leading-snug">{tAdminCta('description')}</P>
        <Button asChild variant="outline" size="sm" className="w-full">
          <Link href="/admin">
            <Icon name="lucide:ArrowRight" className="h-3.5 w-3.5 mr-1.5" />
            {tAdminCta('cta')}
          </Link>
        </Button>
      </CardContent>
    </Card>
  ) : null

  // "Danger zone" extra section — embeds the SDK's <DeleteAccountSection>.
  // Lives at the bottom of the sidebar so users have to actively navigate
  // there before they can delete their account (no accidental clicks from
  // the Account section).
  const deleteAccountTexts: Partial<DeleteAccountSectionTexts> = {
    title: tDeleteAccount('title'),
    description: tDeleteAccount('description'),
    triggerLabel: tDeleteAccount('triggerLabel'),
    confirmTitle: tDeleteAccount('confirmTitle'),
    confirmDescription: tDeleteAccount('confirmDescription'),
    emailLabel: tDeleteAccount('emailLabel'),
    emailPlaceholder: tDeleteAccount('emailPlaceholder'),
    passwordLabel: tDeleteAccount('passwordLabel'),
    passwordPlaceholder: tDeleteAccount('passwordPlaceholder'),
    cancel: tDeleteAccount('cancel'),
    confirm: tDeleteAccount('confirm'),
    successMessage: tDeleteAccount('successMessage'),
    errorMessage: tDeleteAccount('errorMessage'),
  }

  const dangerZoneSection: EZAuthDashboardExtraSection = {
    id: 'danger-zone',
    label: tDeleteAccount('navLabel'),
    icon: 'lucide:TriangleAlert',
    visibility: 'always',
    content: (
      <Div className="space-y-6 w-full max-w-2xl mx-auto">
        <DeleteAccountSection
          texts={deleteAccountTexts}
          onDeleted={() => {
            if (typeof window !== 'undefined') {
              window.location.href = `/${locale}/?accountDeleted=true`
            }
          }}
        />
      </Div>
    ),
  }

  return (
    <EZAuthDashboard
      appName="ezauth"
      locale={locale}
      apiKeysEnabled
      hasOwnedApps={hasOwnedApps}
      homeHref={`/${locale}`}
      texts={dashboardTexts}
      slots={{
        applications: applicationsSlot,
        billing: billingSlot,
      }}
      extraSections={[dangerZoneSection]}
      sidebarFooterExtra={platformAdminCta}
      topBarExtra={<EzauthScopeIndicator scope="user" />}
    />
  )
}

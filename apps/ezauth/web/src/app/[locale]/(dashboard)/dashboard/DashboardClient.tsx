'use client'

import { useMyApplications } from '@ezstart/auth-sdk'
import { useAuthGate } from '@/hooks/useAuthGate'
import {
  ApplicationsList,
  DeleteAccountSection,
  EmailChangeForm,
  EZAuthDashboard,
  type ApplicationsFlowTexts,
  type DeleteAccountSectionTexts,
  type EmailChangeFormTexts,
  type EZAuthDashboardExtraSection,
  type EZAuthDashboardTexts,
} from '@ezstart/auth-sdk/components'
import { useApplicationContext } from '@ezstart/pay-sdk'
import {
  BillingDashboard,
  InvoiceHistorySection,
  ManageSubscriptionButton,
  type InvoiceHistorySectionTexts,
} from '@ezstart/pay-sdk/components'
import { Button, Card, CardContent, Div, H3, Icon, P, Span, Spinner } from '@ezstart/ui/components'
import type { ApiKeyItem, Application, AuditLogEntry } from '@ezstart/auth-sdk'
import { useLocale, useTranslations } from 'next-intl'
import { useRouter } from 'next/navigation'
import { useCallback } from 'react'
import { Link } from '@/i18n/navigation'
import { EzauthScopeIndicator } from '@/components/ezauth-scope-indicator'

export interface DashboardClientProps {
  /**
   * SSR-prefetched API keys (from `getServerApiKeys()`). When undefined, the
   * SDK falls back to its client-side React Query fetch.
   */
  initialKeys?: ApiKeyItem[]
  /**
   * SSR-prefetched audit log entries (from `getServerAuditLog()`).
   */
  initialAuditEntries?: AuditLogEntry[]
  /**
   * SSR-prefetched user-owned applications (from `getServerApplications()`).
   * Used by the SDK's default applications slot — the ezauth dashboard
   * currently overrides this slot with a router-aware version, but the prop
   * is still forwarded for consistency.
   */
  initialApplications?: Application[]
}

/**
 * Client subtree for the unified `/dashboard`. Originally `'use client'`
 * wholesale; extracted from `page.tsx` so the page itself can be a Server
 * Component that pre-fetches dashboard data via `getServerApiKeys()`,
 * `getServerAuditLog()` and `getServerApplications()`.
 *
 * Stripe/Clerk-style sidebar with progressive-disclosure sections (Overview,
 * Account, Applications, API Keys, Billing, Usage, Users, Platform, Settings).
 *
 * The shell + built-in sections come from `<EZAuthDashboard />` in
 * `@ezstart/auth-sdk`. App-specific sections (like the Applications list that
 * needs our Next router for detail navigation) are injected via `slots`.
 */
export function DashboardClient({
  initialKeys,
  initialAuditEntries,
  initialApplications,
}: DashboardClientProps) {
  const t = useTranslations('dashboard')
  const tApps = useTranslations('developer.applications')
  const tAccount = useTranslations('account')
  const tAdminCta = useTranslations('dashboard.platformAdmin')
  const tOAuth = useTranslations('dashboard.oauthProviders')
  const tInvoices = useTranslations('dashboard.invoices')
  const tDeleteAccount = useTranslations('account.deleteAccount')
  const tEmailChange = useTranslations('emailChange')
  const tAuditLog = useTranslations('dashboard.auditLog')
  const tAuditLogActions = useTranslations('dashboard.auditLog.actions')
  const tUserSettings = useTranslations('dashboard.userSettings')
  const tEmailVerif = useTranslations('dashboard.emailVerificationCard')
  const tTwoFactor = useTranslations('dashboard.twoFactorCard')
  const tSessions = useTranslations('dashboard.sessionsCard')
  const tDeveloper = useTranslations('developer')
  const tBilling = useTranslations('dashboard.billingDashboard')
  const tPayments = useTranslations('dashboard.paymentHistory')
  const locale = useLocale()
  const router = useRouter()

  // SSR initialUser bootstrap: useAuth() returns the correct user on the very
  // first paint when the user is signed in (no mount guard needed). When the
  // user is anonymous, redirect client-side; the spinner below covers the
  // brief render before navigation completes.
  //
  // Gate redirect on `isAuthReady` so the cross-origin staging race condition
  // (SSR returns null cookie → client persist hydrates from localStorage
  // async) does NOT bounce an authenticated user to /login before hydration
  // completes. Cf. .claude/rules/nextjs.md §1.1 + standard-saas.md §2.1.
  const handleRedirect = useCallback(() => {
    router.replace(`/${locale}/login`)
  }, [router, locale])
  const { user, isAuthenticated, isAuthReady } = useAuthGate({ onRedirect: handleRedirect })
  // Phase A1 ENV-DIET (2026-05-05) — `applicationId` is auto-resolved by the
  // pay-sdk PayProvider from `NEXT_PUBLIC_EZPAY_KEY` via ezpay's
  // `/keys/config.applicationId`. No more `NEXT_PUBLIC_EZAUTH_APP_ID` env
  // var needed in the consumer's `.env.local`. The PayProvider for ezauth's
  // own dashboard sits in `components/providers.tsx` (PayBridge).
  const { applicationId: ezauthApplicationId } = useApplicationContext()

  const { data: myApps } = useMyApplications(isAuthenticated)

  if (!isAuthReady || !isAuthenticated || !user) {
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
    navApplications: t('nav.developer'),
    navBilling: t('nav.billing'),
    navUsage: t('nav.usage'),
    navActivity: t('nav.activity'),
    navSettings: t('nav.settings'),
    brand: t('brand'),
    welcomeBack: t('welcomeBack'),
    memberSince: t('memberSince'),
    labelEmail: t('labelEmail'),
    labelUsername: t('labelUsername'),
    plan: t('plan'),
    planFree: t('planFree'),
    platformBadge: t('platformBadge'),
    adminBadge: t('adminBadge'),
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
    // Account (Profile) section — renders ProfileBlock (avatar / name /
    // email + verification / connected accounts / member-since / delete)
    profileSectionTitle: t('profile.sectionTitle'),
    profileEditButton: t('profile.editButton'),
    profileFirstNameLabel: t('profile.firstNameLabel'),
    profileLastNameLabel: t('profile.lastNameLabel'),
    profileSaveButton: t('profile.saveButton'),
    profileCancelButton: t('profile.cancelButton'),
    profileSaveSuccess: t('profile.saveSuccess'),
    profileSaveError: t('profile.saveError'),
    profileEmailSection: t('profile.emailSection'),
    profileEmailPrimary: t('profile.emailPrimary'),
    profileEmailVerified: t('profile.emailVerified'),
    profileEmailUnverified: t('profile.emailUnverified'),
    profileResendVerification: t('profile.resendVerification'),
    profileVerificationSent: t('profile.verificationSent'),
    profileVerificationError: t('profile.verificationError'),
    profileConnectedAccountsSection: t('profile.connectedAccountsSection'),
    profileConnectedGoogle: t('profile.connectedGoogle'),
    profileConnectedNone: t('profile.connectedNone'),
    profileMemberSinceLabel: t('profile.memberSinceLabel'),
    deleteAccount: {
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
    },
    settings: {
      personalInfo: tUserSettings('personalInfo'),
      email: tUserSettings('email'),
      username: tUserSettings('username'),
      fullName: tUserSettings('fullName'),
      memberSince: tUserSettings('memberSince'),
      lastActive: tUserSettings('lastActive'),
      connectedAccounts: tUserSettings('connectedAccounts'),
      roles: tUserSettings('roles'),
      noRoles: tUserSettings('noRoles'),
      editProfile: tUserSettings('editProfile'),
      notConnected: tUserSettings('notConnected'),
      justNow: tUserSettings('justNow'),
      minutesAgo: tUserSettings.raw('minutesAgo') as string,
      hoursAgo: tUserSettings.raw('hoursAgo') as string,
      daysAgo: tUserSettings.raw('daysAgo') as string,
      dateLocale: locale,
    },
    emailVerification: {
      verified: tEmailVerif('verified'),
      notVerified: tEmailVerif('notVerified'),
      verifiedDescription: tEmailVerif('verifiedDescription'),
      notVerifiedDescription: tEmailVerif('notVerifiedDescription'),
      resend: tEmailVerif('resend'),
      resending: tEmailVerif('resending'),
      sent: tEmailVerif('sent'),
      sentDescription: tEmailVerif('sentDescription'),
      fallbackError: tEmailVerif('fallbackError'),
    },
    twoFactor: {
      enabled: tTwoFactor('enabled'),
      disabled: tTwoFactor('disabled'),
      enableDescription: tTwoFactor('enableDescription'),
      disableDescription: tTwoFactor('disableDescription'),
      enableButton: tTwoFactor('enableButton'),
      disableButton: tTwoFactor('disableButton'),
      setupTitle: tTwoFactor('setupTitle'),
      setupDescription: tTwoFactor('setupDescription'),
      scanQR: tTwoFactor('scanQR'),
      manualEntry: tTwoFactor('manualEntry'),
      enterCode: tTwoFactor('enterCode'),
      codePlaceholder: tTwoFactor('codePlaceholder'),
      verify: tTwoFactor('verify'),
      verifying: tTwoFactor('verifying'),
      cancel: tTwoFactor('cancel'),
      backupTitle: tTwoFactor('backupTitle'),
      backupDescription: tTwoFactor('backupDescription'),
      copyBackup: tTwoFactor('copyBackup'),
      downloadBackup: tTwoFactor('downloadBackup'),
      confirmBackup: tTwoFactor('confirmBackup'),
      done: tTwoFactor('done'),
      disableTitle: tTwoFactor('disableTitle'),
      disableConfirm: tTwoFactor('disableConfirm'),
      fallbackError: tTwoFactor('fallbackError'),
      invalidCode: tTwoFactor('invalidCode'),
    },
    developerPortal: {
      title: tDeveloper('title'),
      description: tDeveloper('description'),
      createKey: tDeveloper('createKey'),
      noKeys: tDeveloper('noKeys'),
      retry: tDeveloper('retry'),
      fetchFailed: tDeveloper('errors.fetchFailed'),
      createFailed: tDeveloper('errors.createFailed'),
      revokeFailed: tDeveloper('errors.revokeFailed'),
      rotateFailed: tDeveloper('errors.rotateFailed'),
      revokeTitle: tDeveloper('revoke.title'),
      revokeConfirm: tDeveloper('revoke.confirm'),
      revokeSubmit: tDeveloper('revoke.submit'),
      revokeSuccess: tDeveloper('revoke.success'),
      rotateSuccess: tDeveloper('rotate.success'),
      cancel: tOAuth('cancel'),
      table: {
        name: tDeveloper('table.name'),
        keyPrefix: tDeveloper('table.keyPrefix'),
        status: tDeveloper('table.status'),
        created: tDeveloper('table.created'),
        lastUsed: tDeveloper('table.lastUsed'),
        actions: tDeveloper('table.actions'),
        never: tDeveloper('table.never'),
        usage: tDeveloper('table.usage'),
        statusActive: tDeveloper('status.active'),
        statusRevoked: tDeveloper('status.revoked'),
        rotate: tDeveloper('rotate.submit'),
        revoke: tDeveloper('revoke.submit'),
        unlimited: tDeveloper('usage.unlimited'),
        paginationPrevious: tDeveloper('table.paginationPrevious'),
        paginationNext: tDeveloper('table.paginationNext'),
        paginationRows: tDeveloper.raw('table.paginationRows') as string,
        paginationPageOf: tDeveloper.raw('table.paginationPageOf') as string,
      },
      create: {
        title: tDeveloper('create.title'),
        nameLabel: tDeveloper('create.nameLabel'),
        namePlaceholder: tDeveloper('create.namePlaceholder'),
        appScope: tDeveloper('create.appScope'),
        appScopeAll: tDeveloper('create.appScopeAll'),
        keyType: tDeveloper('create.keyType'),
        keyTypePublishable: tDeveloper('create.keyTypePublishable'),
        keyTypeSecret: tDeveloper('create.keyTypeSecret'),
        keyEnv: tDeveloper('create.keyEnv'),
        keyEnvLive: tDeveloper('create.keyEnvLive'),
        keyEnvTest: tDeveloper('create.keyEnvTest'),
        keyScope: tDeveloper('create.keyScope'),
        keyScopeUser: tDeveloper('create.keyScopeUser'),
        keyScopeReadonly: tDeveloper('create.keyScopeReadonly'),
        keyScopeAdmin: tDeveloper('create.keyScopeAdmin'),
        keyScopeAdminWarning: tDeveloper('create.keyScopeAdminWarning'),
        expiry: tDeveloper('create.expiry'),
        expiryNever: tDeveloper('create.expiryNever'),
        expiry30d: tDeveloper('create.expiry30d'),
        expiry90d: tDeveloper('create.expiry90d'),
        expiry1y: tDeveloper('create.expiry1y'),
        submit: tDeveloper('create.submit'),
        submitting: tDeveloper('create.submitting'),
      },
      created: {
        title: tDeveloper('created.title'),
        warning: tDeveloper('created.warning'),
        copied: tDeveloper('created.copied'),
        copyKey: tDeveloper('created.copyKey'),
        done: tDeveloper('created.done'),
      },
      usage: {
        detailsTitle: tDeveloper.raw('usage.detailsTitle') as string,
        detailsDescription: tDeveloper('usage.detailsDescription'),
        close: tDeveloper('usage.close'),
        fetchError: tDeveloper('usage.fetchError'),
        quotaTitle: tDeveloper('usage.quotaTitle'),
        quotaLabel: tDeveloper.raw('usage.quotaLabel') as string,
        remaining: tDeveloper.raw('usage.remaining') as string,
        topEndpoints: tDeveloper('usage.topEndpoints'),
        dailyBreakdown: tDeveloper('usage.dailyBreakdown'),
        noUsage: tDeveloper('usage.noUsage'),
        unlimited: tDeveloper('usage.unlimited'),
      },
    },
    sessions: {
      title: tSessions('title'),
      description: tSessions('description'),
      current: tSessions('current'),
      revoke: tSessions('revoke'),
      revokeAll: tSessions('revokeAll'),
      revoking: tSessions('revoking'),
      noSessions: tSessions('noSessions'),
      browser: tSessions('browser'),
      ip: tSessions('ip'),
      createdAt: tSessions('createdAt'),
      expiresAt: tSessions('expiresAt'),
      confirmRevoke: tSessions('confirmRevoke'),
      fallbackError: tSessions('fallbackError'),
      revokedSuccess: tSessions('revokedSuccess'),
      revokedAllSuccess: tSessions('revokedAllSuccess'),
      unknownDevice: tSessions('unknownDevice'),
      justNow: tSessions('justNow'),
      minutesAgo: tSessions.raw('minutesAgo') as string,
      hoursAgo: tSessions.raw('hoursAgo') as string,
      daysAgo: tSessions.raw('daysAgo') as string,
      deviceOnSeparator: tSessions('deviceOnSeparator'),
      dateLocale: locale,
    },
    oauthProviders: {
      title: tOAuth('title'),
      description: tOAuth('description'),
      connected: tOAuth('connected'),
      notConnected: tOAuth('notConnected'),
      connect: tOAuth('connect'),
      disconnect: tOAuth('disconnect'),
      disconnecting: tOAuth('disconnecting'),
      comingSoon: tOAuth('comingSoon'),
      // SDK does its own `{provider}` substitution via String.replace —
      // pass the raw template (with literal `{provider}` preserved) instead
      // of letting next-intl interpolate, which would error on the missing
      // param and surface FORMATTING_ERROR in the console.
      confirmDisconnectTitle: tOAuth.raw('confirmDisconnectTitle') as string,
      confirmDisconnectDescription: tOAuth.raw('confirmDisconnectDescription') as string,
      cancel: tOAuth('cancel'),
      disconnectSuccess: tOAuth.raw('disconnectSuccess') as string,
      disconnectError: tOAuth.raw('disconnectError') as string,
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
        email_change_requested: tAuditLogActions('email_change_requested'),
        email_change_completed: tAuditLogActions('email_change_completed'),
        magic_link_requested: tAuditLogActions('magic_link_requested'),
        magic_link_login: tAuditLogActions('magic_link_login'),
        oauth_link: tAuditLogActions('oauth_link'),
        oauth_unlink: tAuditLogActions('oauth_unlink'),
        '2fa_enabled': tAuditLogActions('2fa_enabled'),
        '2fa_disabled': tAuditLogActions('2fa_disabled'),
        '2fa_login_success': tAuditLogActions('2fa_login_success'),
        '2fa_login_failed': tAuditLogActions('2fa_login_failed'),
        backup_code_used: tAuditLogActions('backup_code_used'),
        account_locked_brute_force: tAuditLogActions('account_locked_brute_force'),
        two_factor_locked_brute_force: tAuditLogActions('two_factor_locked_brute_force'),
        session_revoked: tAuditLogActions('session_revoked'),
        api_key_created: tAuditLogActions('api_key_created'),
        api_key_revoked: tAuditLogActions('api_key_revoked'),
        profile_updated: tAuditLogActions('profile_updated'),
      },
      paginationPrevious: tAuditLog('paginationPrevious'),
      paginationNext: tAuditLog('paginationNext'),
      paginationRows: tAuditLog.raw('paginationRows') as string,
      paginationPageOf: tAuditLog.raw('paginationPageOf') as string,
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

  // Derive `keyCount` per Application from the SSR-prefetched API keys so each
  // app card shows a "N keys" badge without an extra round-trip. Only counts
  // keys whose `applicationId` matches an Application owned by the user.
  const keyCounts: Record<string, number> = {}
  if (initialKeys) {
    for (const key of initialKeys) {
      if (key.applicationId) {
        keyCounts[key.applicationId] = (keyCounts[key.applicationId] ?? 0) + 1
      }
    }
  }

  // Slot: the Applications list needs our router to push to the detail view.
  // The list also gets the SSR-prefetched apps + per-app key counts so the
  // first paint already shows the cards with their key tally.
  const applicationsSlot = (
    <Div className="space-y-6">
      <ApplicationsList
        locale={locale}
        texts={applicationsTexts}
        showSuperadminAllToggle={isSuperadmin}
        onSelectApplication={app => router.push(`/${locale}/developer/${app.id}`)}
        initialApplications={initialApplications}
        keyCounts={keyCounts}
      />
    </Div>
  )

  // Slot: Billing — shows the user's own EZAuth subscription (via pay-sdk) +
  // Manage button that opens the Stripe Customer Portal.
  //
  // Phase A1 ENV-DIET (2026-05-05) — `applicationId` now comes from
  // `useApplicationContext()`. The EZAuth PayBridge mounts pay-sdk with
  // `NEXT_PUBLIC_EZPAY_KEY`, which auto-resolves the Application id via
  // ezpay's `/api/keys/config`. The previous `process.env.NEXT_PUBLIC_EZAUTH_APP_ID`
  // env var is no longer required.
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

  const billingDashboardTexts = {
    title: tBilling('title'),
    currentPlan: tBilling('currentPlan'),
    freePlan: tBilling('freePlan'),
    nextBillingDate: tBilling('nextBillingDate'),
    canceledNotice: tBilling('canceledNotice'),
    upgrade: tBilling('upgrade'),
    changePlan: tBilling('changePlan'),
    manageSubscription: tBilling('manageSubscription'),
    manageSubscriptionLoading: tBilling('manageSubscriptionLoading'),
    manageSubscriptionError: tBilling('manageSubscriptionError'),
    recentPayments: tBilling('recentPayments'),
    viewAll: tBilling('viewAll'),
    noSubscription: tBilling('noSubscription'),
    noSubscriptionDescription: tBilling('noSubscriptionDescription'),
    choosePlan: tBilling('choosePlan'),
    loading: tBilling('loading'),
    paymentMethod: tBilling('paymentMethod'),
    endingIn: tBilling('endingIn'),
    features: tBilling('features'),
    active: tBilling('active'),
    canceled: tBilling('canceled'),
    noPaymentsYet: tBilling('noPaymentsYet'),
    perMonth: tBilling('perMonth'),
    perYear: tBilling('perYear'),
    contextUnavailableTitle: tBilling('contextUnavailableTitle'),
    contextUnavailableDescription: tBilling('contextUnavailableDescription'),
  }

  const paymentHistoryTexts = {
    emptyMessage: tPayments('emptyMessage'),
    dateHeader: tPayments('dateHeader'),
    productHeader: tPayments('productHeader'),
    typeHeader: tPayments('typeHeader'),
    amountHeader: tPayments('amountHeader'),
    statusHeader: tPayments('statusHeader'),
    appHeader: tPayments('appHeader'),
    status: {
      completed: tPayments('statusCompleted'),
      pending: tPayments('statusPending'),
      failed: tPayments('statusFailed'),
      refunded: tPayments('statusRefunded'),
      cancelled: tPayments('statusCancelled'),
    },
    type: {
      donation: tPayments('typeDonation'),
      purchase: tPayments('typePurchase'),
      subscription: tPayments('typeSubscription'),
      invoice: tPayments('typeInvoice'),
      testimonial: tPayments('typeTestimonial'),
    },
    dateLocale: locale,
    paginationPrevious: tPayments('paginationPrevious'),
    paginationNext: tPayments('paginationNext'),
    paginationRows: tPayments.raw('paginationRows') as string,
    paginationPageOf: tPayments.raw('paginationPageOf') as string,
  }

  const billingSlot = (
    <Div className="space-y-6">
      <BillingDashboard
        applicationId={ezauthApplicationId ?? undefined}
        userId={user._id}
        locale={locale}
        texts={billingDashboardTexts}
        paymentHistoryTexts={paymentHistoryTexts}
      />
      <ManageSubscriptionButton
        texts={{
          label: tBilling('manageSubscription'),
          loading: tBilling('manageSubscriptionLoading'),
          error: tBilling('manageSubscriptionError'),
        }}
      />
      <InvoiceHistorySection
        applicationId={ezauthApplicationId ?? undefined}
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

  // Email change extra section — sits next to Account/Settings in the
  // sidebar. Sends a verification link to the new address; clicking the
  // link consumes the request and updates the user record.
  const emailChangeTexts: Partial<EmailChangeFormTexts> = {
    title: tEmailChange('title'),
    description: tEmailChange('description'),
    currentEmailLabel: tEmailChange('currentEmailLabel'),
    newEmailLabel: tEmailChange('newEmailLabel'),
    newEmailPlaceholder: tEmailChange('newEmailPlaceholder'),
    currentPasswordLabel: tEmailChange('currentPasswordLabel'),
    currentPasswordPlaceholder: tEmailChange('currentPasswordPlaceholder'),
    currentPasswordHelp: tEmailChange('currentPasswordHelp'),
    submitButton: tEmailChange('submitButton'),
    submittingButton: tEmailChange('submittingButton'),
    required: tEmailChange('required'),
    invalidEmail: tEmailChange('invalidEmail'),
    successTitle: tEmailChange('successTitle'),
    // Pass `{email}` literal so next-intl substitutes our placeholder verbatim
    // — the SDK component then runs its own .replace('{email}', submittedEmail).
    // Without this, next-intl throws FORMATTING_ERROR on every render.
    successMessage: tEmailChange('successMessage', { email: '{email}' }),
    resetButton: tEmailChange('resetButton'),
    errorGeneric: tEmailChange('errorGeneric'),
    errorSameEmail: tEmailChange('errorSameEmail'),
    errorTaken: tEmailChange('errorTaken'),
    errorInvalidPassword: tEmailChange('errorInvalidPassword'),
    networkError: tEmailChange('networkError'),
  }

  const emailChangeSection: EZAuthDashboardExtraSection = {
    id: 'email-change',
    label: tEmailChange('title'),
    icon: 'lucide:Mail',
    visibility: 'always',
    content: (
      <Div className="space-y-6 w-full max-w-2xl mx-auto">
        <Card>
          <CardContent className="p-6">
            <H3 className="text-sm font-medium text-foreground mb-1">{tEmailChange('title')}</H3>
            <P className="text-sm text-muted-foreground mb-4">{tEmailChange('description')}</P>
            <EmailChangeForm texts={emailChangeTexts} appName="ezauth" locale={locale} />
          </CardContent>
        </Card>
      </Div>
    ),
  }

  return (
    <EZAuthDashboard
      appName="ezauth"
      locale={locale}
      hasOwnedApps={hasOwnedApps}
      homeHref={`/${locale}`}
      texts={dashboardTexts}
      slots={{
        applications: applicationsSlot,
        billing: billingSlot,
      }}
      extraSections={[emailChangeSection, dangerZoneSection]}
      sidebarFooterExtra={platformAdminCta}
      topBarExtra={<EzauthScopeIndicator scope="user" />}
      initialAuditEntries={initialAuditEntries}
      initialApplications={initialApplications}
    />
  )
}

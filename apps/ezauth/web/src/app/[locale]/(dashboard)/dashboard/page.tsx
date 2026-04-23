'use client'

import { useAuth, useMyApplications } from '@ezstart/auth-sdk'
import {
  ApplicationsList,
  EZAuthDashboard,
  type ApplicationsFlowTexts,
  type EZAuthDashboardTexts,
} from '@ezstart/auth-sdk/components'
import { BillingDashboard, ManageSubscriptionButton } from '@ezstart/pay-sdk/components'
import { Div, Spinner } from '@ezstart/ui/components'
import { useLocale, useTranslations } from 'next-intl'
import { useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'

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
  const tAdminUsers = useTranslations('admin.users')
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
    navSettings: t('nav.settings'),
    navUsers: t('nav.users'),
    navPlatform: t('nav.platform'),
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
    admin: {
      searchPlaceholder: tAdminUsers('searchPlaceholder'),
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
  const billingSlot = (
    <Div className="space-y-6">
      <BillingDashboard applicationId={process.env.NEXT_PUBLIC_EZAUTH_APP_ID} userId={user._id} />
      <ManageSubscriptionButton />
    </Div>
  )

  // Fallback account label reuse for screen-reader-friendly descriptions.
  void tAccount

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
    />
  )
}

'use client'

import { useEffect, useState } from 'react'
import { useLocale, useTranslations } from 'next-intl'
import { useRouter } from 'next/navigation'
import { useAuth, useMyApplications } from '@ezstart/auth-sdk'
import {
  ApplicationsList,
  EZAuthDashboard,
  type ApplicationsFlowTexts,
  type EZAuthDashboardExtraSection,
  type EZAuthDashboardTexts,
} from '@ezstart/auth-sdk/components'
import {
  BillingDashboard,
  ManageSubscriptionButton,
  PayAdminDashboard,
} from '@ezstart/pay-sdk/components'
import { Div, H2, P, Spinner } from '@ezstart/ui/components'
import { PlansSection } from '../developer/components/plans-section'

/**
 * Unified EZPay `/dashboard` — mirrors the ezauth pattern (P8).
 *
 * Sidebar sections progressively revealed by RBAC:
 *   Overview | Account | Applications | API Keys | Billing | Usage |
 *   Plans (extra) | Users (admin+) | Platform (superadmin) | Settings
 *
 * Stripe Connect is intentionally NOT a root-dashboard tab — each Connect
 * account is scoped to an Application, so its management lives under
 * `/developer/applications/<id>/connect` (the dashboard row for each app
 * exposes a "Manage Connect" CTA).
 *
 * Billing slot surfaces:
 *   - user's own EZPay subscription (`BillingDashboard`)
 *   - aggregated owned-apps / platform revenue via `<PayAdminDashboard>`
 *     (single mount, auto-scoped server-side via JWT — superadmin sees all
 *     tenants, owner sees their owned apps).
 */
export default function EZPayDashboardPage() {
  const t = useTranslations('dashboard')
  const tBilling = useTranslations('billing')
  const tTabs = useTranslations('developer.tabs')
  const tApps = useTranslations('developer.applications')
  const locale = useLocale()
  const router = useRouter()
  const { user, isAuthenticated, login } = useAuth()

  const [mounted, setMounted] = useState(false)
  useEffect(() => setMounted(true), [])

  const { data: myApps } = useMyApplications(mounted && isAuthenticated)

  useEffect(() => {
    if (mounted && !isAuthenticated) {
      // Redirect to EZAuth login (ezpay has no local /login route — auth lives on ezauth)
      login()
    }
  }, [mounted, isAuthenticated, login])

  if (!mounted || !isAuthenticated || !user) {
    return (
      <Div className="flex flex-1 items-center justify-center min-h-[50vh]">
        <Spinner variant="primary" size="lg" />
      </Div>
    )
  }

  const isSuperadmin = user.globalRoles?.includes('superadmin') ?? false
  const hasOwnedApps = (myApps?.length ?? 0) > 0

  const dashboardTexts: Partial<EZAuthDashboardTexts> = {
    navOverview: t('nav.overview'),
    navAccount: t('nav.account'),
    navApplications: t('nav.applications'),
    navApiKeys: t('nav.apiKeys'),
    navBilling: t('nav.billing'),
    navUsage: t('nav.usage'),
    navSettings: t('nav.settings'),
    brand: t('brand'),
    welcomeBack: t('welcomeBack'),
    memberSince: t('memberSince'),
    plan: t('plan'),
    planFree: t('planFree'),
    billingTitle: t('billing.title'),
    billingDescription: t('billing.description'),
    comingSoon: t('billing.comingSoon'),
    usageTitle: t('usage.title'),
    usageDescription: t('usage.description'),
    usageComingSoon: t('usage.comingSoon'),
    settingsEmailVerification: t('settings.emailVerification'),
    settingsTwoFactor: t('settings.twoFactor'),
    settingsSessions: t('settings.sessions'),
  }

  // Applications slot — list the user's Applications. Wired to our Next router
  // so clicking "Manage" navigates to the per-app detail page where both
  // EZAuth and EZPay keys for that tenant are displayed side by side.
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

  const applicationsSlot = (
    <Div className="space-y-6">
      <ApplicationsList
        locale={locale}
        texts={applicationsTexts}
        showSuperadminAllToggle={isSuperadmin}
        onSelectApplication={app => router.push(`/${locale}/developer/applications/${app.id}`)}
      />
    </Div>
  )

  // Billing slot — EZPay-specific BillingDashboard + "my apps revenue" + "platform overview".
  const billingSlot = (
    <Div className="space-y-12">
      {/* Section 1 — My subscription */}
      <Div className="space-y-4">
        <Div className="space-y-1">
          <H2 className="text-xl font-semibold">{tBilling('mySubscription.title')}</H2>
          <P className="text-sm text-muted-foreground">{tBilling('mySubscription.subtitle')}</P>
        </Div>
        {/* applicationId is resolved from PayProvider context (publishableKey → /api/keys/config). */}
        <BillingDashboard userId={user._id} />
        <ManageSubscriptionButton />
      </Div>

      {/*
        Section 2 — Aggregated revenue (auto-scoped server-side via JWT).
        - superadmin sees ALL tenants ("Platform overview" framing)
        - app-owner sees their owned apps ("My apps revenue" framing)
        - regular user sees nothing meaningful → mount skipped via gate below
        Mount is gated to avoid an empty admin dashboard for end-users with
        no apps and no superadmin role.
      */}
      {(isSuperadmin || hasOwnedApps) && (
        <Div className="space-y-4">
          <Div className="space-y-1">
            <H2 className="text-xl font-semibold">
              {isSuperadmin ? tBilling('platform.title') : tBilling('myAppsRevenue.title')}
            </H2>
            <P className="text-sm text-muted-foreground">
              {isSuperadmin ? tBilling('platform.subtitle') : tBilling('myAppsRevenue.subtitle')}
            </P>
          </Div>
          <PayAdminDashboard />
        </Div>
      )}
    </Div>
  )

  // NOTE: Stripe Connect is intentionally NOT a root-dashboard tab anymore —
  // each Connect account is scoped to a specific Application, so managing it
  // lives under `/developer/applications/<id>/connect`. The root dashboard
  // would need an `applicationId` it doesn't have, which is what caused the
  // previous 400 "Invalid onboard data" bug.

  const plansSlot = (
    <Div className="space-y-6">
      <PlansSection currentFeePercent={5} />
    </Div>
  )

  const extraSections: EZAuthDashboardExtraSection[] = [
    {
      id: 'plans',
      label: tTabs('plans'),
      icon: 'lucide:ListChecks',
      content: plansSlot,
    },
  ]

  return (
    <EZAuthDashboard
      appName="ezpay"
      locale={locale}
      apiKeysEnabled
      hasOwnedApps={hasOwnedApps}
      homeHref={`/${locale}`}
      texts={dashboardTexts}
      slots={{
        applications: applicationsSlot,
        billing: billingSlot,
      }}
      extraSections={extraSections}
    />
  )
}

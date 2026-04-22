'use client'

import { useEffect, useState } from 'react'
import { useLocale, useTranslations } from 'next-intl'
import { useRouter } from 'next/navigation'
import { useAuth, useMyApplications } from '@ezstart/auth-sdk'
import {
  EZAuthDashboard,
  type EZAuthDashboardExtraSection,
  type EZAuthDashboardTexts,
} from '@ezstart/auth-sdk/components'
import {
  BillingDashboard,
  DeveloperConnectDashboard,
  ManageSubscriptionButton,
  PayAdminDashboard,
  type DeveloperConnectDashboardTexts,
} from '@ezstart/pay-sdk/components'
import { Div, H2, P, Spinner } from '@ezstart/ui/components'
import { toast } from 'sonner'
import { PlansSection } from '../developer/components/plans-section'

/**
 * Unified EZPay `/dashboard` — mirrors the ezauth pattern (P8).
 *
 * Sidebar sections progressively revealed by RBAC:
 *   Overview | Account | Applications | API Keys | Billing | Usage |
 *   Stripe Connect (extra) | Plans (extra) | Users (admin+) | Platform (superadmin)
 *   | Settings
 *
 * Billing slot surfaces:
 *   - user's own EZPay subscription (`BillingDashboard`)
 *   - aggregated `my apps revenue` for owners (PayAdminDashboard scope=myApps)
 */
export default function EZPayDashboardPage() {
  const t = useTranslations('dashboard')
  const tBilling = useTranslations('billing')
  const tDev = useTranslations('developer')
  const tTabs = useTranslations('developer.tabs')
  const tConnect = useTranslations('developer.connect')
  const tFees = useTranslations('developer.fees')
  const tAdmin = useTranslations('admin')
  const locale = useLocale()
  const router = useRouter()
  const { user, isAuthenticated } = useAuth()

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
      searchPlaceholder: tAdmin('filters.searchEmail'),
    },
  }

  // Billing slot — EZPay-specific BillingDashboard + "my apps revenue" + "platform overview".
  const billingSlot = (
    <Div className="space-y-12">
      {/* Section 1 — My subscription */}
      <Div className="space-y-4">
        <Div className="space-y-1">
          <H2 className="text-xl font-semibold">{tBilling('mySubscription.title')}</H2>
          <P className="text-sm text-muted-foreground">{tBilling('mySubscription.subtitle')}</P>
        </Div>
        <BillingDashboard userId={user._id} appName="ezpay" />
        <ManageSubscriptionButton />
      </Div>

      {/* Section 2 — My apps revenue */}
      {hasOwnedApps && (
        <Div className="space-y-4">
          <Div className="space-y-1">
            <H2 className="text-xl font-semibold">{tBilling('myAppsRevenue.title')}</H2>
            <P className="text-sm text-muted-foreground">{tBilling('myAppsRevenue.subtitle')}</P>
          </Div>
          <PayAdminDashboard scope="myApps" showAppFilter />
        </Div>
      )}

      {/* Section 3 — Platform overview (superadmin) */}
      {isSuperadmin && (
        <Div className="space-y-4">
          <Div className="space-y-1">
            <H2 className="text-xl font-semibold">{tBilling('platform.title')}</H2>
            <P className="text-sm text-muted-foreground">{tBilling('platform.subtitle')}</P>
          </Div>
          <PayAdminDashboard scope="all" showAppFilter />
        </Div>
      )}
    </Div>
  )

  // Stripe Connect slot (extra section).
  const connectDashboardTexts: DeveloperConnectDashboardTexts = {
    connectStatus: {
      title: tConnect('title'),
      businessName: tConnect('businessName'),
      accountType: tConnect('accountType'),
      accountTypeStandard: tConnect('accountTypeStandard'),
      accountTypeExpress: tConnect('accountTypeExpress'),
      chargesEnabled: tConnect('chargesEnabled'),
      payoutsEnabled: tConnect('payoutsEnabled'),
      connectedSince: tConnect('connectedSince'),
      yes: tConnect('yes'),
      no: tConnect('no'),
      statusPending: tConnect('statusPending'),
      statusActive: tConnect('statusActive'),
      statusRestricted: tConnect('statusRestricted'),
      statusDisabled: tConnect('statusDisabled'),
      dashboardButton: tConnect('dashboard.button'),
      dashboardLoading: tConnect('dashboard.loading'),
      disconnectButton: tConnect('disconnect.button'),
    },
    onboardForm: {
      title: tConnect('notConnected'),
      description: tConnect('notConnectedDescription'),
      emailLabel: tConnect('onboard.email'),
      emailPlaceholder: tConnect('onboard.emailPlaceholder'),
      businessNameLabel: tConnect('onboard.businessName'),
      businessNamePlaceholder: tConnect('onboard.businessNamePlaceholder'),
      accountTypeLabel: tConnect('onboard.accountType'),
      standard: tConnect('onboard.standard'),
      express: tConnect('onboard.express'),
      submit: tConnect('onboard.submit'),
      submitting: tConnect('onboard.submitting'),
    },
    feeSummary: {
      title: tFees('title'),
      thisMonth: tFees('thisMonth'),
      totalFees: tFees('totalFees'),
      averageFee: tFees('averageFee'),
      transactions: tFees('transactions'),
    },
    disconnectTitle: tConnect('disconnect.title'),
    disconnectDescription: tConnect('disconnect.description'),
    disconnectCancel: tConnect('disconnect.cancel'),
    disconnectConfirm: tConnect('disconnect.confirm'),
    error: tDev('error'),
  }

  const stripeConnectSlot = (
    <Div className="space-y-6">
      <DeveloperConnectDashboard
        applicationId=""
        texts={connectDashboardTexts}
        onError={msg => toast.error(msg)}
        onDisconnect={() => toast.success(tConnect('disconnect.button'))}
      />
    </Div>
  )

  const plansSlot = (
    <Div className="space-y-6">
      <PlansSection currentFeePercent={5} />
    </Div>
  )

  const extraSections: EZAuthDashboardExtraSection[] = [
    {
      id: 'stripe-connect',
      label: tTabs('stripeConnect'),
      icon: 'lucide:Plug',
      content: stripeConnectSlot,
    },
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
      texts={dashboardTexts}
      slots={{
        billing: billingSlot,
      }}
      extraSections={extraSections}
    />
  )
}

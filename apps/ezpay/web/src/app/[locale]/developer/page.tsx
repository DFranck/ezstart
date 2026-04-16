'use client'

import { useTranslations } from 'next-intl'
import { toast } from 'sonner'
import { Button, Div, H1, Main, P, Skeleton } from '@ezstart/ui/components'
import { useAuth } from '@ezstart/auth-sdk'
import Link from 'next/link'
import {
  DeveloperConnectDashboard,
  type DeveloperConnectDashboardTexts,
} from '@ezstart/pay-sdk/components'
import { PlansSection } from './components/plans-section'
import { AuthHeader } from '../auth-header'

export default function DeveloperPage() {
  const t = useTranslations('developer')
  const tc = useTranslations('developer.connect')
  const tf = useTranslations('developer.fees')
  const { isAuthenticated } = useAuth()

  // Build texts object from i18n
  const dashboardTexts: DeveloperConnectDashboardTexts = {
    connectStatus: {
      title: tc('title'),
      businessName: tc('businessName'),
      accountType: tc('accountType'),
      accountTypeStandard: tc('accountTypeStandard'),
      accountTypeExpress: tc('accountTypeExpress'),
      chargesEnabled: tc('chargesEnabled'),
      payoutsEnabled: tc('payoutsEnabled'),
      connectedSince: tc('connectedSince'),
      yes: tc('yes'),
      no: tc('no'),
      statusPending: tc('statusPending'),
      statusActive: tc('statusActive'),
      statusRestricted: tc('statusRestricted'),
      statusDisabled: tc('statusDisabled'),
      dashboardButton: tc('dashboard.button'),
      dashboardLoading: tc('dashboard.loading'),
      disconnectButton: tc('disconnect.button'),
    },
    onboardForm: {
      title: tc('notConnected'),
      description: tc('notConnectedDescription'),
      emailLabel: tc('onboard.email'),
      emailPlaceholder: tc('onboard.emailPlaceholder'),
      businessNameLabel: tc('onboard.businessName'),
      businessNamePlaceholder: tc('onboard.businessNamePlaceholder'),
      accountTypeLabel: tc('onboard.accountType'),
      standard: tc('onboard.standard'),
      express: tc('onboard.express'),
      submit: tc('onboard.submit'),
      submitting: tc('onboard.submitting'),
    },
    feeSummary: {
      title: tf('title'),
      thisMonth: tf('thisMonth'),
      totalFees: tf('totalFees'),
      averageFee: tf('averageFee'),
      transactions: tf('transactions'),
    },
    disconnectTitle: tc('disconnect.title'),
    disconnectDescription: tc('disconnect.description'),
    disconnectCancel: tc('disconnect.cancel'),
    disconnectConfirm: tc('disconnect.confirm'),
    error: t('error'),
  }

  // Auth guard
  if (!isAuthenticated) {
    return (
      <Main className="container mx-auto py-12 px-4">
        <AuthHeader />
        <Div className="max-w-md mx-auto text-center">
          <Div className="p-8">
            <H1 className="text-2xl font-bold mb-4">{t('loginRequired')}</H1>
            <P className="text-muted-foreground">{t('loginRequiredDescription')}</P>
          </Div>
        </Div>
      </Main>
    )
  }

  return (
    <Main className="container mx-auto py-12 px-4">
      <AuthHeader />

      <Div className="max-w-4xl mx-auto space-y-8">
        {/* Header */}
        <Div className="flex items-center justify-between">
          <Div>
            <H1 className="text-3xl font-bold">{t('title')}</H1>
            <P variant="description" className="mt-1">
              {t('subtitle')}
            </P>
          </Div>
          <Button asChild variant="outline" size="sm">
            <Link href="/">&larr;</Link>
          </Button>
        </Div>

        {/* Connect dashboard from SDK */}
        <DeveloperConnectDashboard
          texts={dashboardTexts}
          onError={(msg) => toast.error(msg)}
          onDisconnect={() => toast.success(tc('disconnect.button'))}
        />

        {/* Plans section (always visible) */}
        <PlansSection currentFeePercent={5} />
      </Div>
    </Main>
  )
}

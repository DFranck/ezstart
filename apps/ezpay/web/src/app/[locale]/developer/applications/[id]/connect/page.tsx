'use client'

import { useAuth } from '@ezstart/auth-sdk'
import {
  DeveloperConnectDashboard,
  type DeveloperConnectDashboardTexts,
} from '@ezstart/pay-sdk/components'
import { BackButton, Div, Spinner } from '@ezstart/ui/components'
import { useLocale, useTranslations } from 'next-intl'
import { useParams, useRouter, useSearchParams } from 'next/navigation'
import { useEffect, useRef, useState } from 'react'
import { toast } from 'sonner'

/**
 * Per-application Stripe Connect management page.
 *
 * Renders the pay-sdk {@link DeveloperConnectDashboard} scoped to the
 * application id from the route params so the onboard call and status lookup
 * know which Application to persist / read against.
 *
 * Stripe's post-onboarding redirect lands here with `?status=complete` (account
 * fully active) or `?status=refresh` (user returned but KYC still in progress).
 * We surface that to the user as a one-shot toast.
 */
export default function ApplicationConnectPage() {
  const t = useTranslations('developer.connect')
  const tDev = useTranslations('developer')
  const tFees = useTranslations('developer.fees')
  const locale = useLocale()
  const params = useParams()
  const searchParams = useSearchParams()
  const router = useRouter()
  const { isAuthenticated, login } = useAuth()

  const [mounted, setMounted] = useState(false)
  useEffect(() => setMounted(true), [])

  useEffect(() => {
    if (mounted && !isAuthenticated) {
      // Redirect to EZAuth login (ezpay has no local /login route — auth lives on ezauth)
      login()
    }
  }, [mounted, isAuthenticated, login])

  const applicationId = typeof params?.id === 'string' ? params.id : ''

  // One-shot toast on Stripe callback landing. Tracked with a ref so it does
  // not re-fire on re-render / strict-mode double-mount.
  const status = searchParams.get('status')
  const toastedRef = useRef(false)
  useEffect(() => {
    if (!mounted || toastedRef.current) return
    if (status === 'complete') {
      toastedRef.current = true
      toast.success(t('callback.complete'))
    } else if (status === 'refresh') {
      toastedRef.current = true
      toast.message(t('callback.refresh'))
    }
  }, [mounted, status, t])

  if (!mounted || !isAuthenticated) {
    return (
      <Div className="flex flex-1 items-center justify-center min-h-[50vh]">
        <Spinner variant="primary" size="lg" />
      </Div>
    )
  }

  const texts: DeveloperConnectDashboardTexts = {
    connectStatus: {
      title: t('title'),
      businessName: t('businessName'),
      accountType: t('accountType'),
      accountTypeStandard: t('accountTypeStandard'),
      accountTypeExpress: t('accountTypeExpress'),
      chargesEnabled: t('chargesEnabled'),
      payoutsEnabled: t('payoutsEnabled'),
      connectedSince: t('connectedSince'),
      yes: t('yes'),
      no: t('no'),
      statusPending: t('statusPending'),
      statusActive: t('statusActive'),
      statusRestricted: t('statusRestricted'),
      statusDisabled: t('statusDisabled'),
      dashboardButton: t('dashboard.button'),
      dashboardLoading: t('dashboard.loading'),
      disconnectButton: t('disconnect.button'),
    },
    onboardForm: {
      title: t('notConnected'),
      description: t('notConnectedDescription'),
      emailLabel: t('onboard.email'),
      emailPlaceholder: t('onboard.emailPlaceholder'),
      businessNameLabel: t('onboard.businessName'),
      businessNamePlaceholder: t('onboard.businessNamePlaceholder'),
      accountTypeLabel: t('onboard.accountType'),
      standard: t('onboard.standard'),
      express: t('onboard.express'),
      submit: t('onboard.submit'),
      submitting: t('onboard.submitting'),
    },
    feeSummary: {
      title: tFees('title'),
      thisMonth: tFees('thisMonth'),
      totalFees: tFees('totalFees'),
      averageFee: tFees('averageFee'),
      transactions: tFees('transactions'),
    },
    disconnectTitle: t('disconnect.title'),
    disconnectDescription: t('disconnect.description'),
    disconnectCancel: t('disconnect.cancel'),
    disconnectConfirm: t('disconnect.confirm'),
    error: tDev('error'),
  }

  return (
    <Div className="container mx-auto max-w-6xl px-4 py-8 space-y-6">
      <BackButton
        onClick={() => router.push(`/${locale}/developer/applications/${applicationId}`)}
      />
      <DeveloperConnectDashboard
        applicationId={applicationId}
        locale={locale}
        texts={texts}
        onError={msg => toast.error(msg)}
        onDisconnect={() => toast.success(t('disconnect.success'))}
      />
    </Div>
  )
}

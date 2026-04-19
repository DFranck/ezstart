'use client'

import { useAuth } from '@ezstart/auth-sdk'
import { EZAuthDashboard } from '@ezstart/auth-sdk/components'
import { Div, Spinner } from '@ezstart/ui/components'
import { useTranslations, useLocale } from 'next-intl'
import { useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import type { EZAuthDashboardTexts } from '@ezstart/auth-sdk/components'

export default function DeveloperPage() {
  const t = useTranslations('developer')
  const locale = useLocale()
  const { user, isAuthenticated } = useAuth()
  const router = useRouter()

  // Wait for initial mount + store hydration
  const [mounted, setMounted] = useState(false)
  useEffect(() => setMounted(true), [])

  // Redirect to login if not authenticated (after hydration)
  useEffect(() => {
    if (mounted && !isAuthenticated) {
      router.replace('/login')
    }
  }, [mounted, isAuthenticated, router])

  if (!mounted || !isAuthenticated || !user) {
    return (
      <Div className="flex flex-1 items-center justify-center min-h-[50vh]">
        <Spinner variant="primary" size="lg" />
      </Div>
    )
  }

  const texts: Partial<EZAuthDashboardTexts> = {
    navOverview: t('nav.overview', { defaultValue: 'Overview' }),
    navApiKeys: t('nav.apiKeys'),
    navBilling: t('nav.billing'),
    navSettings: t('nav.settings', { defaultValue: 'Settings' }),
    developerPortal: {
      title: t('title'),
      description: t('description'),
      createKey: t('createKey'),
      noKeys: t('noKeys'),
      retry: t('retry'),
      fetchFailed: t('errors.fetchFailed'),
      createFailed: t('errors.createFailed'),
      revokeFailed: t('errors.revokeFailed'),
      rotateFailed: t('errors.rotateFailed'),
      revokeTitle: t('revoke.title'),
      revokeConfirm: t('revoke.confirm'),
      revokeSubmit: t('revoke.submit'),
      revokeSuccess: t('revoke.success'),
      rotateSuccess: t('rotate.success'),
      cancel: t('created.done'),
      table: {
        name: t('table.name'),
        keyPrefix: t('table.keyPrefix'),
        status: t('table.status'),
        created: t('table.created'),
        lastUsed: t('table.lastUsed'),
        actions: t('table.actions'),
        never: t('table.never'),
        usage: t('table.usage'),
        statusActive: t('status.active'),
        statusRevoked: t('status.revoked'),
        rotate: t('rotate.submit'),
        revoke: t('revoke.submit'),
        unlimited: t('usage.unlimited'),
      },
      create: {
        title: t('create.title'),
        nameLabel: t('create.nameLabel'),
        namePlaceholder: t('create.namePlaceholder'),
        appScope: t('create.appScope'),
        appScopeAll: t('create.appScopeAll'),
        keyScope: t('create.keyScope', { defaultValue: 'Key Type' }),
        keyScopeTest: t('create.keyScopeTest', { defaultValue: 'Test — sandbox, rate limited' }),
        keyScopeLive: t('create.keyScopeLive', { defaultValue: 'Live — production, full access' }),
        keyScopeAdmin: t('create.keyScopeAdmin', { defaultValue: 'Admin — superadmin, all apps' }),
        expiry: t('create.expiry'),
        expiryNever: t('create.expiryNever'),
        expiry30d: t('create.expiry30d'),
        expiry90d: t('create.expiry90d'),
        expiry1y: t('create.expiry1y'),
        submit: t('create.submit'),
        submitting: t('create.submitting'),
      },
      created: {
        title: t('created.title'),
        warning: t('created.warning'),
        copied: t('created.copied'),
        copyKey: t('created.copyKey'),
        done: t('created.done'),
      },
      usage: {
        detailsTitle: t('usage.detailsTitle', { name: '{name}' }),
        detailsDescription: t('usage.detailsDescription'),
        close: t('usage.close'),
        fetchError: t('usage.fetchError'),
        quotaTitle: t('usage.quotaTitle'),
        quotaLabel: t('usage.quotaLabel', { used: '{used}', limit: '{limit}' }),
        remaining: t('usage.remaining', { count: '{count}' }),
        topEndpoints: t('usage.topEndpoints'),
        dailyBreakdown: t('usage.dailyBreakdown'),
        noUsage: t('usage.noUsage'),
        unlimited: t('usage.unlimited'),
      },
    },
    billingTitle: t('billing.title'),
    billingDescription: t('billing.description'),
    currentPlan: t('billing.currentPlan'),
    unlimited: t('billing.unlimited'),
    choosePlan: t('billing.choosePlan'),
    popular: t('billing.popular'),
    month: t('billing.month'),
    requestsPerMonth: t('billing.requestsPerMonth'),
    apiKeys: t('billing.apiKeys'),
    currentLabel: t('billing.currentLabel'),
    upgrade: t('billing.upgrade'),
    downgrade: t('billing.downgrade'),
    comingSoon: t('billing.comingSoon'),
    featureCommunitySupport: t('billing.features.communitySupport'),
    featureEmailSupport: t('billing.features.emailSupport'),
    featurePriorityRateLimit: t('billing.features.priorityRateLimit'),
    featureDedicatedSupport: t('billing.features.dedicatedSupport'),
    featureSla: t('billing.features.sla'),
  }

  return <EZAuthDashboard locale={locale} texts={texts} />
}

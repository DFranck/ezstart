'use client'

import { useEffect, useState } from 'react'
import { useLocale, useTranslations } from 'next-intl'
import { useRouter } from 'next/navigation'
import { useAuth, useMyApplications } from '@ezstart/auth-sdk'
import { Card, Div, H1, H2, P, Section } from '@ezstart/ui/components'
import { BillingDashboard, PayAdminDashboard } from '@ezstart/pay-sdk/components'

/**
 * Unified billing page — three RBAC-scoped sections in one place:
 *
 * 1. **My subscription** (always visible when signed-in): the user's own
 *    EZPay subscription + payment history + "Manage subscription" button.
 * 2. **My apps revenue** (owners of >= 1 Application): the aggregated
 *    PayAdminDashboard scoped to `myApps`. Shows payments collected across
 *    Applications the user owns in ezauth.
 * 3. **Platform overview** (superadmin only): the full platform-wide
 *    PayAdminDashboard scoped to `all`. No app filter applied beyond what
 *    the admin picks in the dashboard itself.
 *
 * Pattern mirrors ezauth `/developer` — a single page that surfaces only
 * the sections the caller has rights to, instead of scattered `/billing`,
 * `/admin`, `/owner` routes.
 */
export default function BillingPage() {
  const t = useTranslations('billing')
  const locale = useLocale()
  const router = useRouter()

  const { user, isAuthenticated } = useAuth()

  // Wait for auth store hydration before rendering to avoid redirect flash.
  const [mounted, setMounted] = useState(false)
  useEffect(() => setMounted(true), [])

  // Applications owned by the current user — enables the "my apps revenue" section.
  const { data: myApps } = useMyApplications(mounted && isAuthenticated)

  useEffect(() => {
    if (mounted && !isAuthenticated) {
      router.replace(`/${locale}/login`)
    }
  }, [mounted, isAuthenticated, router, locale])

  if (!mounted || !isAuthenticated || !user) {
    return (
      <Section className="container mx-auto py-12 px-4">
        <Div className="max-w-5xl mx-auto space-y-6">
          <Card className="p-8">
            <P className="text-muted-foreground">{t('mySubscription.title')}</P>
          </Card>
        </Div>
      </Section>
    )
  }

  const isSuperadmin = user.globalRoles?.includes('superadmin') ?? false
  const hasOwnedApps = (myApps?.length ?? 0) > 0

  return (
    <Section className="container mx-auto py-12 px-4">
      <Div className="max-w-6xl mx-auto space-y-16">
        {/* Page header */}
        <Div>
          <H1 className="text-3xl font-bold">{t('title')}</H1>
          <P variant="description" className="mt-1">
            {t('subtitle')}
          </P>
        </Div>

        {/* Section 1 — My subscription (always visible) */}
        <Section>
          <Div className="mb-6">
            <H2 className="text-2xl font-semibold">{t('mySubscription.title')}</H2>
            <P variant="description" className="mt-1">
              {t('mySubscription.subtitle')}
            </P>
          </Div>
          <BillingDashboard userId={user._id} appName="ezpay" />
        </Section>

        {/* Section 2 — My apps revenue (owner of >= 1 Application) */}
        {hasOwnedApps && (
          <Section>
            <Div className="mb-6">
              <H2 className="text-2xl font-semibold">{t('myAppsRevenue.title')}</H2>
              <P variant="description" className="mt-1">
                {t('myAppsRevenue.subtitle')}
              </P>
            </Div>
            <PayAdminDashboard scope="myApps" showAppFilter />
          </Section>
        )}

        {/* Section 3 — Platform overview (superadmin only) */}
        {isSuperadmin && (
          <Section>
            <Div className="mb-6">
              <H2 className="text-2xl font-semibold">{t('platform.title')}</H2>
              <P variant="description" className="mt-1">
                {t('platform.subtitle')}
              </P>
            </Div>
            <PayAdminDashboard scope="all" showAppFilter />
          </Section>
        )}
      </Div>
    </Section>
  )
}

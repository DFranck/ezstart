'use client'

import { useEffect, useState } from 'react'
import { useLocale, useTranslations } from 'next-intl'
import { useRouter } from 'next/navigation'
import { useAuth, useMyApplications } from '@ezstart/auth-sdk'
import {
  AuthAdminDashboard,
  UserDashboard,
  type AuthAdminDashboardTexts,
  type UserDashboardTexts,
} from '@ezstart/auth-sdk/components'
import { Div, H1, H2, Main, P, Section, Spinner } from '@ezstart/ui/components'

/**
 * Unified `/account` page — RBAC-scoped sections that progressively reveal as
 * the signed-in user gains ownership / platform-wide roles.
 *
 * - Section 1 (always): the current user's own profile (UserDashboard).
 * - Section 2 (owner of ≥1 Application): users registered to those apps.
 * - Section 3 (superadmin only): platform-wide user list.
 */
export default function AccountPage() {
  const t = useTranslations('account')
  const adminT = useTranslations('admin.users')
  const locale = useLocale()
  const router = useRouter()

  const { user, isAuthenticated } = useAuth()

  // Wait for auth store hydration before rendering to avoid redirect flash.
  const [mounted, setMounted] = useState(false)
  useEffect(() => setMounted(true), [])

  // Applications owned by the current user — enables the "my apps users" section.
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

  // SDK i18n bridges — the SDK components are i18n-agnostic, so we forward
  // translated strings via `texts` props.
  const userDashboardTexts: Partial<UserDashboardTexts> = {
    title: t('myProfile.title'),
  }

  const adminDashboardTexts: Partial<AuthAdminDashboardTexts> = {
    searchPlaceholder: adminT('searchPlaceholder'),
  }

  return (
    <Main className="container mx-auto max-w-6xl px-4 py-8 space-y-12">
      {/* Section 1 — always shown */}
      <Section className="space-y-4">
        <Div className="space-y-1">
          <H1 size="h2">{t('myProfile.title')}</H1>
          <P className="text-muted-foreground">{t('myProfile.subtitle')}</P>
        </Div>
        <UserDashboard appName="ezauth" texts={userDashboardTexts} />
      </Section>

      {/* Section 2 — users of my owned applications */}
      {hasOwnedApps && (
        <Section className="space-y-4">
          <Div className="space-y-1">
            <H2 size="h3">{t('myAppsUsers.title')}</H2>
            <P className="text-muted-foreground">{t('myAppsUsers.subtitle')}</P>
          </Div>
          <AuthAdminDashboard scope="myApps" appName="*" texts={adminDashboardTexts} />
        </Section>
      )}

      {/* Section 3 — platform-wide (superadmin only) */}
      {isSuperadmin && (
        <Section className="space-y-4">
          <Div className="space-y-1">
            <H2 size="h3">{t('platform.title')}</H2>
            <P className="text-muted-foreground">{t('platform.subtitle')}</P>
          </Div>
          <AuthAdminDashboard scope="all" appName="*" texts={adminDashboardTexts} />
        </Section>
      )}
    </Main>
  )
}

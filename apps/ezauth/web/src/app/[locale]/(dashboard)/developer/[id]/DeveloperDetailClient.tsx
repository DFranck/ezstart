'use client'

import { useAuth } from '@ezstart/auth-sdk'
import { ApplicationDetailView } from '@ezstart/auth-sdk/components'
import type { ApplicationDetailViewTexts, DeveloperPortalTexts } from '@ezstart/auth-sdk/components'
import type { ApiKeyItem, Application } from '@ezstart/auth-sdk'
import { Div, Spinner } from '@ezstart/ui/components'
import { useLocale, useTranslations } from 'next-intl'
import { useRouter } from 'next/navigation'
import { useEffect } from 'react'

export interface DeveloperDetailClientProps {
  /** Application id from the dynamic route segment. */
  applicationId: string
  /**
   * SSR-prefetched Application document (from `getServerApplication()`).
   * When provided, React Query is seeded so the detail tabs render on the
   * very first paint with no skeleton flash.
   */
  initialApplication?: Application
  /**
   * SSR-prefetched API keys (from `getServerApiKeys()`). Forwarded to the
   * embedded `<DeveloperPortal>` so the keys table is also SSR-bootstrapped
   * on the API Keys tab.
   */
  initialKeys?: ApiKeyItem[]
}

/**
 * Client subtree for `/developer/[id]`. Originally `'use client'` wholesale;
 * extracted from `page.tsx` so the page itself is a Server Component that
 * pre-fetches the Application + the user's API keys via the SSR helpers.
 */
export function DeveloperDetailClient({
  applicationId,
  initialApplication,
  initialKeys,
}: DeveloperDetailClientProps) {
  const t = useTranslations('developer.applications.detail')
  const tDeveloper = useTranslations('developer')
  const tOAuth = useTranslations('dashboard.oauthProviders')
  const locale = useLocale()
  const router = useRouter()
  const { user, isAuthenticated } = useAuth()

  // SSR initialUser bootstrap: useAuth() is correct on first paint when signed
  // in. When anonymous, redirect client-side; the spinner below covers the
  // brief render before navigation completes.
  useEffect(() => {
    if (!isAuthenticated) {
      router.replace(`/${locale}/login`)
    }
  }, [isAuthenticated, router, locale])

  if (!isAuthenticated || !user) {
    return (
      <Div className="flex flex-1 items-center justify-center min-h-[50vh]">
        <Spinner variant="primary" size="lg" />
      </Div>
    )
  }

  const isSuperadmin = user.globalRoles?.includes('superadmin') ?? false

  const texts: Partial<ApplicationDetailViewTexts> = {
    back: t('back'),
    tabKeys: t('tabKeys'),
    tabSettings: t('tabSettings'),
    tabTheme: t('tabTheme'),
    loading: t('loading'),
    errorTitle: t('errorTitle'),
    errorDescription: t('errorDescription'),
    retry: t('retry'),
    settingsTitle: t('settingsTitle'),
    settingsDescription: t('settingsDescription'),
    settingsSlugLabel: t('settingsSlugLabel'),
    settingsSlugHelp: t('settingsSlugHelp'),
    settingsNameLabel: t('settingsNameLabel'),
    settingsDescriptionLabel: t('settingsDescriptionLabel'),
    settingsSave: t('settingsSave'),
    settingsSaving: t('settingsSaving'),
    settingsSaveSuccess: t('settingsSaveSuccess'),
    settingsSaveFailed: t('settingsSaveFailed'),
    archiveSectionTitle: t('archiveSectionTitle'),
    archiveSectionDescription: t('archiveSectionDescription'),
    archiveButton: t('archiveButton'),
    archiveConfirmTitle: t('archiveConfirmTitle'),
    archiveConfirmDescription: t('archiveConfirmDescription'),
    archiveConfirmCascade: t('archiveConfirmCascade'),
    archiveCancel: t('archiveCancel'),
    archiveSubmit: t('archiveSubmit'),
    archiveSuccess: t('archiveSuccess'),
    archiveFailed: t('archiveFailed'),
    themeTitle: t('themeTitle'),
    themeDescription: t('themeDescription'),
    themeEnableLabel: t('themeEnableLabel'),
    themeEnableHelp: t('themeEnableHelp'),
    themeProLockedLabel: t('themeProLockedLabel'),
    themePrimaryLabel: t('themePrimaryLabel'),
    themeLogoLabel: t('themeLogoLabel'),
    themeLogoPlaceholder: t('themeLogoPlaceholder'),
    themeReset: t('themeReset'),
    themeSave: t('themeSave'),
    themeSaving: t('themeSaving'),
    themeSaveSuccess: t('themeSaveSuccess'),
    themeSaveFailed: t('themeSaveFailed'),
    themePreviewTitle: t('themePreviewTitle'),
    themePreviewSubtitle: t('themePreviewSubtitle'),
    themePreviewSignInCta: t('themePreviewSignInCta'),
  }

  const developerPortalTexts: Partial<DeveloperPortalTexts> = {
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
  }

  return (
    <Div className="container mx-auto max-w-6xl px-4 py-8">
      <ApplicationDetailView
        applicationId={applicationId}
        locale={locale}
        texts={texts}
        developerPortalTexts={developerPortalTexts}
        showAdminScope={isSuperadmin}
        onBack={() => router.push(`/${locale}/dashboard?section=applications`)}
        onArchived={() => router.push(`/${locale}/dashboard?section=applications`)}
        initialApplication={initialApplication}
        initialKeys={initialKeys}
      />
    </Div>
  )
}

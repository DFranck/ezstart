'use client'

import { useAuth } from '@ezstart/auth-sdk'
import { ApplicationDetailView } from '@ezstart/auth-sdk/components'
import type { ApplicationDetailViewTexts } from '@ezstart/auth-sdk/components'
import { Div, Spinner } from '@ezstart/ui/components'
import { useLocale, useTranslations } from 'next-intl'
import { useParams, useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'

export default function ApplicationDetailPage() {
  const t = useTranslations('developer.applications.detail')
  const locale = useLocale()
  const params = useParams()
  const router = useRouter()
  const { user, isAuthenticated } = useAuth()

  // Wait for initial mount + store hydration
  const [mounted, setMounted] = useState(false)
  useEffect(() => setMounted(true), [])

  // Redirect to login if not authenticated (after hydration)
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

  const applicationId = typeof params?.id === 'string' ? params.id : ''

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

  return (
    <Div className="container mx-auto max-w-6xl px-4 py-8">
      <ApplicationDetailView
        applicationId={applicationId}
        locale={locale}
        texts={texts}
        showAdminScope={isSuperadmin}
        onBack={() => router.push(`/${locale}/dashboard?section=applications`)}
        onArchived={() => router.push(`/${locale}/dashboard?section=applications`)}
      />
    </Div>
  )
}

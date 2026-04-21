'use client'

import { useAuth } from '@ezstart/auth-sdk'
import { ApplicationsList } from '@ezstart/auth-sdk/components'
import type { ApplicationsFlowTexts } from '@ezstart/auth-sdk/components'
import { Div, Spinner } from '@ezstart/ui/components'
import { useLocale, useTranslations } from 'next-intl'
import { useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'

export default function DeveloperPage() {
  const t = useTranslations('developer.applications')
  const locale = useLocale()
  const { user, isAuthenticated } = useAuth()
  const router = useRouter()

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

  const isSuperadmin = user.globalRoles?.includes('superadmin') ?? false

  const texts: Partial<ApplicationsFlowTexts> = {
    list: {
      title: t('title'),
      description: t('description'),
      newApplication: t('newApplication'),
      loading: t('loading'),
      errorTitle: t('errorTitle'),
      errorDescription: t('errorDescription'),
      retry: t('retry'),
      emptyTitle: t('emptyTitle'),
      emptyDescription: t('emptyDescription'),
      emptyCta: t('emptyCta'),
      showArchived: t('showArchived'),
      showAll: t('showAll'),
    },
    card: {
      manage: t('card.manage'),
      archive: t('card.archive'),
      archiveTitle: t('card.archiveTitle'),
      archiveConfirm: t('card.archiveConfirm'),
      archiveConfirmCascade: t('card.archiveConfirmCascade'),
      archiveCancel: t('card.archiveCancel'),
      archiveSubmit: t('card.archiveSubmit'),
      archiveSuccess: t('card.archiveSuccess'),
      archiveFailed: t('card.archiveFailed'),
      statusActive: t('card.statusActive'),
      statusArchived: t('card.statusArchived'),
      createdLabel: t('card.createdLabel'),
      keysLabel: t('card.keysLabel'),
    },
    create: {
      title: t('create.title'),
      description: t('create.description'),
      nameLabel: t('create.nameLabel'),
      namePlaceholder: t('create.namePlaceholder'),
      slugLabel: t('create.slugLabel'),
      slugPlaceholder: t('create.slugPlaceholder'),
      slugHelp: t('create.slugHelp'),
      slugInvalid: t('create.slugInvalid'),
      slugTaken: t('create.slugTaken'),
      descriptionLabel: t('create.descriptionLabel'),
      descriptionPlaceholder: t('create.descriptionPlaceholder'),
      cancel: t('create.cancel'),
      submit: t('create.submit'),
      submitting: t('create.submitting'),
      createFailed: t('create.createFailed'),
    },
  }

  return (
    <Div className="container mx-auto max-w-6xl px-4 py-8">
      <ApplicationsList
        locale={locale}
        texts={texts}
        showSuperadminAllToggle={isSuperadmin}
        onSelectApplication={app => router.push(`/${locale}/developer/${app.id}`)}
      />
    </Div>
  )
}

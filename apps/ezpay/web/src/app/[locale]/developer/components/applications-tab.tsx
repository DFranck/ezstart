'use client'

import { ApplicationsList } from '@ezstart/auth-sdk/components'
import type { ApplicationsFlowTexts } from '@ezstart/auth-sdk/components'
import { useAuth } from '@ezstart/auth-sdk'
import { Div } from '@ezstart/ui/components'
import { useLocale, useTranslations } from 'next-intl'
import { useRouter } from 'next/navigation'

/**
 * EZPay developer portal — "Applications" tab.
 *
 * Wraps the auth-sdk {@link ApplicationsList} with next-intl texts and routes
 * "Manage" clicks to the per-application detail page so the user can see
 * both EZAuth and EZPay keys scoped to that app.
 */
export function ApplicationsTab() {
  const t = useTranslations('developer.applications')
  const locale = useLocale()
  const router = useRouter()
  const { user } = useAuth()

  const isSuperadmin = user?.globalRoles?.includes('superadmin') ?? false

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
    <Div>
      <ApplicationsList
        locale={locale}
        texts={texts}
        showSuperadminAllToggle={isSuperadmin}
        onSelectApplication={app => router.push(`/${locale}/developer/applications/${app.id}`)}
      />
    </Div>
  )
}

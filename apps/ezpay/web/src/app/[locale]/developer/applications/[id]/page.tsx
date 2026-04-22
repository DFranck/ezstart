'use client'

import { useAuth } from '@ezstart/auth-sdk'
import { ApplicationDetailView } from '@ezstart/auth-sdk/components'
import type { ApplicationDetailViewTexts } from '@ezstart/auth-sdk/components'
import { PayDeveloperPortal, type PayDeveloperPortalTexts } from '@ezstart/pay-sdk/components'
import {
  Button,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  Div,
  H2,
  P,
  Spinner,
} from '@ezstart/ui/components'
import Link from 'next/link'
import { useLocale, useTranslations } from 'next-intl'
import { useParams, useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'

/**
 * Per-application detail page inside the EZPay developer portal.
 *
 * Renders the auth-sdk {@link ApplicationDetailView} (rename/archive +
 * EZAuth keys) and the pay-sdk {@link PayDeveloperPortal} scoped to the
 * same `applicationId` so the user sees both services' keys for this
 * tenant side by side.
 */
export default function ApplicationDetailPage() {
  const t = useTranslations('developer.applications.detail')
  const tp = useTranslations('developer.payKeys')
  const tpm = useTranslations('developer.plansManager')
  const tc = useTranslations('developer.connect')
  const locale = useLocale()
  const params = useParams()
  const router = useRouter()
  const { user, isAuthenticated } = useAuth()

  const [mounted, setMounted] = useState(false)
  useEffect(() => setMounted(true), [])

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

  const detailTexts: Partial<ApplicationDetailViewTexts> = {
    back: t('back'),
    tabKeys: t('tabKeys'),
    tabSettings: t('tabSettings'),
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
  }

  const payTexts: Partial<PayDeveloperPortalTexts> = {
    title: tp('title'),
    description: tp('subtitle'),
    createKey: tp('createKey'),
    noKeys: tp('noKeys'),
    retry: tp('retry'),
    fetchFailed: tp('errors.fetchFailed'),
    createFailed: tp('errors.createFailed'),
    revokeFailed: tp('errors.revokeFailed'),
    rotateFailed: tp('errors.rotateFailed'),
    revokeTitle: tp('revoke.title'),
    revokeConfirm: tp('revoke.confirm'),
    revokeSubmit: tp('revoke.submit'),
    revokeSuccess: tp('revoke.success'),
    rotateSuccess: tp('rotate.success'),
    cancel: tp('cancel'),
    selectApplicationNotice: tp('selectApplicationNotice'),
    table: {
      name: tp('table.name'),
      keyPrefix: tp('table.keyPrefix'),
      status: tp('table.status'),
      created: tp('table.created'),
      lastUsed: tp('table.lastUsed'),
      actions: tp('table.actions'),
      never: tp('table.never'),
      usage: tp('table.usage'),
      statusActive: tp('status.active'),
      statusRevoked: tp('status.revoked'),
      rotate: tp('rotate.action'),
      revoke: tp('revoke.action'),
    },
    create: {
      title: tp('create.title'),
      nameLabel: tp('create.nameLabel'),
      namePlaceholder: tp('create.namePlaceholder'),
      appScope: tp('create.appScope'),
      keyType: tp('create.keyType'),
      keyTypePublishable: tp('create.keyTypePublishable'),
      keyTypeSecret: tp('create.keyTypeSecret'),
      keyEnv: tp('create.keyEnv'),
      keyEnvLive: tp('create.keyEnvLive'),
      keyEnvTest: tp('create.keyEnvTest'),
      keyScope: tp('create.keyScope'),
      keyScopeUser: tp('create.keyScopeUser'),
      keyScopeReadonly: tp('create.keyScopeReadonly'),
      keyScopeAdmin: tp('create.keyScopeAdmin'),
      keyScopeAdminWarning: tp('create.keyScopeAdminWarning'),
      expiry: tp('create.expiry'),
      expiryNever: tp('create.expiryNever'),
      expiry30d: tp('create.expiry30d'),
      expiry90d: tp('create.expiry90d'),
      expiry1y: tp('create.expiry1y'),
      submit: tp('create.submit'),
      submitting: tp('create.submitting'),
    },
    created: {
      title: tp('created.title'),
      warning: tp('created.warning'),
      copied: tp('created.copied'),
      copyKey: tp('created.copyKey'),
      done: tp('created.done'),
    },
  }

  return (
    <Div className="container mx-auto max-w-6xl px-4 py-8 space-y-10">
      <ApplicationDetailView
        applicationId={applicationId}
        locale={locale}
        texts={detailTexts}
        showAdminScope={isSuperadmin}
        onBack={() => router.push(`/${locale}/dashboard?section=applications`)}
        onArchived={() => router.push(`/${locale}/dashboard?section=applications`)}
      />

      <Div className="border-t" />

      <Div className="space-y-2">
        <H2 className="text-xl font-semibold">{tp('title')}</H2>
        <P variant="description">{tp('subtitle')}</P>
      </Div>

      <PayDeveloperPortal
        applicationId={applicationId}
        enabled={isAuthenticated}
        locale={locale}
        texts={payTexts}
        showSuperadminScope={isSuperadmin}
      />

      <Div className="border-t" />

      <Card>
        <CardHeader className="pb-4">
          <Div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
            <Div className="space-y-1">
              <CardTitle className="text-xl md:text-2xl font-bold">{tc('title')}</CardTitle>
              <CardDescription>{tc('notConnectedDescription')}</CardDescription>
            </Div>
            <Button asChild>
              <Link href={`/${locale}/developer/applications/${applicationId}/connect`}>
                {tc('manageButton')}
              </Link>
            </Button>
          </Div>
        </CardHeader>
        <CardContent>
          <P className="text-muted-foreground text-sm">{tc('notConnectedDescription')}</P>
        </CardContent>
      </Card>

      <Div className="border-t" />

      <Card>
        <CardHeader className="pb-4">
          <Div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
            <Div className="space-y-1">
              <CardTitle className="text-xl md:text-2xl font-bold">{tpm('title')}</CardTitle>
              <CardDescription>{tpm('subtitle')}</CardDescription>
            </Div>
            <Button asChild>
              <Link href={`/${locale}/developer/applications/${applicationId}/plans`}>
                {tpm('createButton')}
              </Link>
            </Button>
          </Div>
        </CardHeader>
        <CardContent>
          <P className="text-muted-foreground text-sm">{tpm('subtitle')}</P>
        </CardContent>
      </Card>
    </Div>
  )
}

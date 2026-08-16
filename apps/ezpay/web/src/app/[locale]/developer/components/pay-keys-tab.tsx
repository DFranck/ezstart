'use client'

import { useAuth, useMyApplications } from '@ezstart/auth-sdk'
import { PayDeveloperPortal } from '@ezstart/pay-sdk/components'
import type { PayDeveloperPortalTexts } from '@ezstart/pay-sdk/components'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  Div,
  Label,
  P,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Skeleton,
  Span,
} from '@ezstart/ui/components'
import { useLocale, useTranslations } from 'next-intl'
import { useMemo, useState } from 'react'

/**
 * EZPay developer portal — "API Keys" tab.
 *
 * Lets the user pick one of their Applications (shared tenant across
 * EZAuth + EZPay) and renders the pay-sdk {@link PayDeveloperPortal}
 * scoped to that `applicationId`. All user-facing strings come from
 * next-intl.
 */
export function PayKeysTab() {
  const t = useTranslations('developer.payKeys')
  const locale = useLocale()
  const { user, isAuthenticated } = useAuth()

  const isSuperadmin = user?.globalRoles?.includes('superadmin') ?? false

  const { data: applications = [], isLoading } = useMyApplications(isAuthenticated, {
    includeArchived: false,
  })

  const activeApplications = useMemo(
    () => applications.filter(app => app.status === 'active'),
    [applications]
  )

  const [selectedId, setSelectedId] = useState<string>('')

  const selectedApp = useMemo(
    () => activeApplications.find(app => app.id === selectedId),
    [activeApplications, selectedId]
  )

  const texts: Partial<PayDeveloperPortalTexts> = {
    title: t('title'),
    description: t('subtitle'),
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
    cancel: t('cancel'),
    selectApplicationNotice: t('selectApplicationNotice'),
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
      rotate: t('rotate.action'),
      revoke: t('revoke.action'),
    },
    create: {
      title: t('create.title'),
      nameLabel: t('create.nameLabel'),
      namePlaceholder: t('create.namePlaceholder'),
      appScope: t('create.appScope'),
      keyType: t('create.keyType'),
      keyTypePublishable: t('create.keyTypePublishable'),
      keyTypeSecret: t('create.keyTypeSecret'),
      keyEnv: t('create.keyEnv'),
      keyEnvLive: t('create.keyEnvLive'),
      keyEnvTest: t('create.keyEnvTest'),
      keyScope: t('create.keyScope'),
      keyScopeUser: t('create.keyScopeUser'),
      keyScopeReadonly: t('create.keyScopeReadonly'),
      keyScopeAdmin: t('create.keyScopeAdmin'),
      keyScopeAdminWarning: t('create.keyScopeAdminWarning'),
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
  }

  return (
    <Div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>{t('selectApplicationLabel')}</CardTitle>
          <CardDescription>{t('selectApplicationDescription')}</CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <Skeleton className="h-10 w-full max-w-sm" />
          ) : activeApplications.length === 0 ? (
            <P variant="description">{t('noApplications')}</P>
          ) : (
            <Div className="max-w-sm space-y-2">
              <Label htmlFor="pay-keys-app-select">{t('applicationLabel')}</Label>
              <Select value={selectedId} onValueChange={setSelectedId}>
                <SelectTrigger id="pay-keys-app-select">
                  <SelectValue placeholder={t('selectPlaceholder')} />
                </SelectTrigger>
                <SelectContent>
                  {activeApplications.map(app => (
                    <SelectItem key={app.id} value={app.id}>
                      <Span>
                        {app.name} <Span className="text-muted-foreground">({app.slug})</Span>
                      </Span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Div>
          )}
        </CardContent>
      </Card>

      {selectedApp ? (
        <PayDeveloperPortal
          applicationId={selectedApp.id}
          enabled={isAuthenticated}
          locale={locale}
          texts={texts}
          showSuperadminScope={isSuperadmin}
        />
      ) : null}
    </Div>
  )
}

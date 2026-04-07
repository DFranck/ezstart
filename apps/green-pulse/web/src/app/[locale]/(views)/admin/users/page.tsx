'use client'

import { AuthAdminDashboard } from '@ezstart/auth-sdk'
import { H1, P } from '@ezstart/ui/components'
import { useTranslations } from 'next-intl'

export default function AdminUsersPage() {
  const t = useTranslations('admin')

  return (
    <>
      <H1 className="mb-2">{t('users.title')}</H1>
      <P className="text-muted-foreground mb-6">{t('users.description')}</P>
      <AuthAdminDashboard appName="green-pulse" />
    </>
  )
}

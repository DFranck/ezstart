'use client'

import { useEffect, useMemo } from 'react'
import { useTranslations, useLocale } from 'next-intl'
import { Card, Div, H1, Main, P, Spinner } from '@ezstart/ui/components'
import { AuthAdminDashboard, useAuth } from '@ezstart/auth-sdk'
import { RequireRole } from '@ezstart/rbac'

// ========================================
// Access Denied Fallback
// ========================================

function AccessDenied() {
  const t = useTranslations('admin')

  return (
    <Main className="container mx-auto py-12 px-4">
      <Div className="max-w-md mx-auto text-center">
        <Card className="p-8">
          <H1 className="text-2xl font-bold mb-4">{t('accessDenied')}</H1>
          <P className="text-muted-foreground">{t('accessDeniedDescription')}</P>
        </Card>
      </Div>
    </Main>
  )
}

// ========================================
// Auth Guard — redirect to login if not authenticated
// ========================================

function AuthGuard({ children }: { children: React.ReactNode }) {
  const { user, isAuthenticated } = useAuth()
  const locale = useLocale()

  useEffect(() => {
    if (!isAuthenticated && !user) {
      const loginUrl = `/${locale}/login?redirect_uri=${encodeURIComponent(window.location.origin + `/${locale}/auth/callback`)}&app=ezauth`
      window.location.href = loginUrl
    }
  }, [isAuthenticated, user, locale])

  if (!isAuthenticated || !user) {
    return (
      <Main className="container mx-auto py-12 px-4">
        <Div className="flex items-center justify-center min-h-[50vh]">
          <Spinner variant="primary" size="lg" />
        </Div>
      </Main>
    )
  }

  return <>{children}</>
}

// ========================================
// Admin Page
// ========================================

export default function AdminPage() {
  const t = useTranslations('admin')
  const tu = useTranslations('admin.users')
  const tr = useTranslations('admin.roles')
  const td = useTranslations('admin.dialog')
  const te = useTranslations('admin.editRoles')
  const tp = useTranslations('admin.pagination')

  const authTexts = useMemo(
    () => ({
      searchPlaceholder: tu('searchPlaceholder'),
      columnEmail: tu('columns.email'),
      columnUsername: tu('columns.username'),
      columnRoles: tu('columns.roles'),
      columnCreatedAt: tu('columns.createdAt'),
      columnActions: tu('columns.actions'),
      edit: tu('edit'),
      delete: tu('delete'),
      noUsers: tu('noUsers'),
      confirmDeleteTitle: tu('confirmDeleteTitle'),
      confirmDeleteDescription: tu('confirmDeleteDescription'),
      cancel: td('cancel'),
      confirm: td('confirm'),
      deleteError: tu('deleteError'),
      deleteSuccess: tu('deleteSuccess'),
      editRolesTitle: te('title'),
      editRolesSubtitle: te.raw('subtitle') as string,
      globalRolesLabel: te('globalRoles'),
      appRolesLabel: te.raw('appRoles') as string,
      noAppRoles: te('noAppRoles'),
      save: te('save'),
      editError: te('editError'),
      editSuccess: te('editSuccess'),
      roleSuperadmin: tr('superadmin'),
      roleAdmin: tr('admin'),
      roleManager: tr('manager'),
      roleBetaTester: tr('beta-tester'),
      roleClient: tr('client'),
      previous: tp('previous'),
      next: tp('next'),
    }),
    [tu, tr, td, te, tp]
  )

  return (
    <AuthGuard>
      <RequireRole
        roles={['superadmin', 'admin']}
        appName="ezauth"
        fallbackComponent={<AccessDenied />}
      >
        <Main className="container mx-auto py-8 px-4 min-h-screen">
          {/* Header */}
          <Div className="mb-8">
            <H1 className="text-3xl font-bold">{t('title')}</H1>
          </Div>

          <AuthAdminDashboard texts={authTexts} />
        </Main>
      </RequireRole>
    </AuthGuard>
  )
}

'use client'

import { RequireAuth, RequireRole } from '@ezstart/auth-sdk'
import { AuthAdminDashboard, type AuthAdminDashboardTexts } from '@ezstart/auth-sdk/components'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  Div,
  H1,
  P,
  Span,
  Spinner,
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '@ezstart/ui/components'
import { useTranslations } from 'next-intl'

/**
 * `/admin` — EZAuth's self-owned admin entry point.
 *
 * Per `standard-architecture.md` Tier 3 federated pattern: ezstart is the
 * platform hub that aggregates AdminDashboards from each SaaS via SDK
 * components. ezauth, as a Tier 1 SaaS service, also exposes its OWN admin
 * dashboard scoped to its own users (people who registered to the EZAuth
 * Application). This is the dogfood entry point — `<AuthAdminDashboard>`
 * embedded here is the SAME component ezstart will embed (in tabs alongside
 * `<PayAdminDashboard>` etc.), proving the SDK is consumer-ready.
 *
 * Tabs are scaffolded for future federated sections (Pay, Monitoring) inside
 * ezauth's own scope. Currently only the Users tab is wired.
 */
export default function AdminPage() {
  const t = useTranslations('admin')
  const tDash = useTranslations('admin.dashboard')

  // Texts forwarded to the SDK's `<AuthAdminDashboard>` so the table is
  // fully translated. The SDK ships English defaults; we override here.
  const adminDashboardTexts: Partial<AuthAdminDashboardTexts> = {
    totalUsers: tDash('totalUsers'),
    online: tDash('online'),
    superadmins: tDash('superadmins'),
    admins: tDash('admins'),
    withAppRoles: tDash('withAppRoles'),
    searchPlaceholder: t('users.searchPlaceholder'),
    columnEmail: t('users.columns.email'),
    columnUsername: t('users.columns.username'),
    columnRoles: t('users.columns.roles'),
    columnLastActive: tDash('online'),
    columnCreatedAt: t('users.columns.createdAt'),
    columnApps: 'Apps',
    columnActions: t('users.columns.actions'),
    edit: tDash('edit'),
    delete: tDash('delete'),
    noUsers: tDash('noUsers'),
    onlineLabel: tDash('onlineLabel'),
    // SDK does its own `{count}` substitution via String.replace — pass the
    // raw template (with literal `{count}` preserved) instead of letting
    // next-intl interpolate, which would error on the missing param and
    // surface the raw key (e.g. "admin.dashboard.daysAgo") in the UI.
    minutesAgo: tDash.raw('minutesAgo') as string,
    hoursAgo: tDash.raw('hoursAgo') as string,
    daysAgo: tDash.raw('daysAgo') as string,
    confirmDeleteTitle: t('users.confirmDeleteTitle'),
    confirmDeleteDescription: t('users.confirmDeleteDescription'),
    cancel: t('editRoles.cancel'),
    confirm: t('dialog.confirm'),
    deleteError: t('users.deleteError'),
    deleteSuccess: t('users.deleteSuccess'),
    editRolesTitle: t('editRoles.title'),
    // SDK does its own `{email}` / `{app}` substitution via String.replace
    // — pass the raw template, not next-intl's interpolated output (which
    // would error and surface the raw key).
    editRolesSubtitle: t.raw('editRoles.subtitle') as string,
    globalRolesLabel: t('editRoles.globalRoles'),
    appRolesLabel: t.raw('editRoles.appRoles') as string,
    noAppRoles: t('editRoles.noAppRoles'),
    save: tDash('save'),
    editError: t('editRoles.editError'),
    editSuccess: t('editRoles.editSuccess'),
    roleSuperadmin: t('roles.superadmin'),
    roleAdmin: t('roles.admin'),
    roleManager: t('roles.manager'),
    roleBetaTester: t('roles.beta-tester'),
    roleClient: t('roles.client'),
    previous: tDash('previous'),
    next: tDash('next'),
    allApps: tDash('allApps'),
    filterByApp: tDash('filterByApp'),
  }

  return (
    <RequireAuth
      loadingComponent={
        <Div className="flex flex-1 items-center justify-center min-h-[50vh]">
          <Spinner variant="primary" size="lg" text={t('loading')} />
        </Div>
      }
    >
      <RequireRole
        roles="superadmin"
        fallbackComponent={
          <Div className="flex flex-1 items-center justify-center min-h-[50vh] px-4">
            <Card className="max-w-md w-full">
              <CardHeader>
                <CardTitle>
                  <Span className="text-destructive">{t('accessDenied')}</Span>
                </CardTitle>
                <CardDescription>{t('accessDeniedDescription')}</CardDescription>
              </CardHeader>
            </Card>
          </Div>
        }
      >
        <Div className="container mx-auto py-8 px-4 space-y-6">
          <Div className="space-y-1">
            <H1 size="h2">{t('title')}</H1>
            <P className="text-muted-foreground">{t('subtitle')}</P>
          </Div>

          {/*
            Federated tabs scaffold — currently only `users` (auth-sdk).
            Future tabs (`payments` via pay-sdk, `monitoring` via ezstart hub)
            mount the same way: drop in their `<XxxAdminDashboard>` SDK
            component scoped to ezauth's own application.
          */}
          <Tabs defaultValue="users" className="space-y-4">
            <TabsList>
              <TabsTrigger value="users">{t('tabs.users')}</TabsTrigger>
            </TabsList>
            <TabsContent value="users" className="space-y-4">
              <Card>
                <CardContent className="p-4 sm:p-6">
                  {/*
                    Scope `'all'` requires globalRoles `superadmin` server-side
                    — already enforced by `<RequireRole>` above. The SDK
                    forwards `?scope=all` to the API.
                  */}
                  <AuthAdminDashboard appName="ezauth" scope="all" texts={adminDashboardTexts} />
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </Div>
      </RequireRole>
    </RequireAuth>
  )
}

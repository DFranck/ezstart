'use client'

import { RequireAuth, RequireRole } from '@ezstart/auth-sdk'
import {
  AdminApplicationsDashboard,
  type AdminApplicationsTexts,
  AdminFeatureFlagsSection,
  type AdminFeatureFlagsSectionTexts,
  AdminMaintenanceModeSection,
  type AdminMaintenanceModeSectionTexts,
  AuthAdminDashboard,
  type AuthAdminDashboardTexts,
  RequireAuthLoader,
} from '@ezstart/auth-sdk/components'
import { PayAdminDashboard } from '@ezstart/pay-sdk/components'
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
  const tApps = useTranslations('admin.applications')
  const tFlags = useTranslations('admin.featureFlags')
  const tMaint = useTranslations('admin.maintenanceMode')

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

  // Texts forwarded to the SDK's `<AdminApplicationsDashboard>` so the
  // cross-tenant Applications table is fully translated.
  const adminApplicationsTexts: Partial<AdminApplicationsTexts> = {
    title: tApps('title'),
    subtitle: tApps('subtitle'),
    totalApplications: tApps('totalApplications'),
    activeApplications: tApps('activeApplications'),
    archivedApplications: tApps('archivedApplications'),
    platformOwned: tApps('platformOwned'),
    themedApplications: tApps('themedApplications'),
    searchPlaceholder: tApps('searchPlaceholder'),
    statusAll: tApps('statusAll'),
    statusActive: tApps('statusActive'),
    statusArchived: tApps('statusArchived'),
    columnSlug: tApps('columns.slug'),
    columnName: tApps('columns.name'),
    columnOwner: tApps('columns.owner'),
    columnStatus: tApps('columns.status'),
    columnTheme: tApps('columns.theme'),
    columnPlatform: tApps('columns.platform'),
    columnCreatedAt: tApps('columns.createdAt'),
    columnActions: tApps('columns.actions'),
    badgeActive: tApps('badges.active'),
    badgeArchived: tApps('badges.archived'),
    badgePlatform: tApps('badges.platform'),
    badgeThemed: tApps('badges.themed'),
    badgeThemeDisabled: tApps('badges.themeDisabled'),
    edit: tApps('edit'),
    archive: tApps('archive'),
    unarchive: tApps('unarchive'),
    noApplications: tApps('noApplications'),
    createApplication: tApps('createApplication'),
    editTitle: tApps('editTitle'),
    editDescription: tApps('editDescription'),
    editNameLabel: tApps('editNameLabel'),
    editDescriptionLabel: tApps('editDescriptionLabel'),
    editSlugLabel: tApps('editSlugLabel'),
    editSlugHelp: tApps('editSlugHelp'),
    cancel: t('editRoles.cancel'),
    save: tApps('save'),
    saving: tApps('saving'),
    editError: tApps('editError'),
    editSuccess: tApps('editSuccess'),
    confirmArchiveTitle: tApps('confirmArchiveTitle'),
    confirmArchiveDescription: tApps('confirmArchiveDescription'),
    confirmArchiveCascade: tApps('confirmArchiveCascade'),
    confirm: t('dialog.confirm'),
    archiveError: tApps('archiveError'),
    archiveSuccess: tApps('archiveSuccess'),
    previous: tDash('previous'),
    next: tDash('next'),
  }

  const featureFlagsTexts: Partial<AdminFeatureFlagsSectionTexts> = {
    title: tFlags('title'),
    description: tFlags('description'),
    enabled: tFlags('enabled'),
    disabled: tFlags('disabled'),
    columnKey: tFlags('columnKey'),
    columnDescription: tFlags('columnDescription'),
    columnScope: tFlags('columnScope'),
    columnStatus: tFlags('columnStatus'),
    columnUpdatedAt: tFlags('columnUpdatedAt'),
    columnActions: tFlags('columnActions'),
    scopeGlobal: tFlags('scopeGlobal'),
    scopeApp: tFlags('scopeApp'),
    empty: tFlags('empty'),
    loading: tFlags('loading'),
    toggleSuccess: tFlags('toggleSuccess'),
    toggleError: tFlags('toggleError'),
    refresh: tFlags('refresh'),
  }

  const maintenanceTexts: Partial<AdminMaintenanceModeSectionTexts> = {
    title: tMaint('title'),
    description: tMaint('description'),
    enable: tMaint('enable'),
    disable: tMaint('disable'),
    enabledBadge: tMaint('enabledBadge'),
    disabledBadge: tMaint('disabledBadge'),
    message: tMaint('message'),
    messagePlaceholder: tMaint('messagePlaceholder'),
    scheduledEnd: tMaint('scheduledEnd'),
    scheduledEndHelp: tMaint('scheduledEndHelp'),
    startedAt: tMaint('startedAt'),
    saveButton: tMaint('saveButton'),
    enableButton: tMaint('enableButton'),
    disableButton: tMaint('disableButton'),
    saving: tMaint('saving'),
    saveSuccess: tMaint('saveSuccess'),
    saveError: tMaint('saveError'),
    loading: tMaint('loading'),
    notSet: tMaint('notSet'),
  }

  return (
    <RequireAuth loadingComponent={<RequireAuthLoader text={t('loading')} />}>
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
              <TabsTrigger value="applications">{t('tabs.applications')}</TabsTrigger>
              <TabsTrigger value="plans">{t('tabs.plans')}</TabsTrigger>
              <TabsTrigger value="settings">{t('tabs.settings')}</TabsTrigger>
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
            <TabsContent value="applications" className="space-y-4">
              <Card>
                <CardContent className="p-4 sm:p-6">
                  {/*
                    Cross-tenant Applications CRUD. Underlying hook calls
                    `GET /api/applications?all=true` which is rejected for any
                    non-superadmin caller. RBAC already enforced by
                    `<RequireRole>` above.
                  */}
                  <AdminApplicationsDashboard texts={adminApplicationsTexts} />
                </CardContent>
              </Card>
            </TabsContent>
            <TabsContent value="plans" className="space-y-4">
              <Card>
                <CardContent className="p-4 sm:p-6">
                  {/*
                    Federated pattern (cf. standard-architecture.md §1 Tier 3):
                    the same SDK component a third-party consumer would embed
                    is mounted here. `scope="all"` requires globalRoles
                    `superadmin` server-side — already enforced by
                    <RequireRole> above. The SDK forwards `?scope=all` to the
                    EZPay API.

                    Cross-origin auth is wired via the existing <PayProvider>
                    in `components/providers.tsx` (apiUrl =
                    NEXT_PUBLIC_EZPAY_API_URL, getToken =
                    useAuthStore.getState().accessToken). `showAppFilter`
                    surfaces the per-application dropdown so the superadmin
                    can scope the platform-wide payments view to one tenant.
                  */}
                  <PayAdminDashboard scope="all" showAppFilter />
                </CardContent>
              </Card>
            </TabsContent>
            <TabsContent value="settings" className="space-y-4">
              {/*
                Platform-wide infra toggles (Tier 3 cross-cutting concerns
                hosted on Tier 1 ezauth for now — superadmin-only). The two
                sections come from the auth-sdk and use the same federated
                pattern: a future Tier 3 hub embedding this admin will get
                them for free.
              */}
              <AdminMaintenanceModeSection texts={maintenanceTexts} />
              <AdminFeatureFlagsSection texts={featureFlagsTexts} />
            </TabsContent>
          </Tabs>
        </Div>
      </RequireRole>
    </RequireAuth>
  )
}

'use client'

import { RequireAuth, RequireRole } from '@ezstart/auth-sdk'
import {
  AuthAdminDashboard,
  type AuthAdminDashboardTexts,
  RequireAuthLoader,
  UserMenuV2,
} from '@ezstart/auth-sdk/components'
import {
  Card,
  CardDescription,
  CardHeader,
  CardTitle,
  DashboardContent,
  DashboardHeader,
  DashboardLayout,
  DashboardMain,
  DashboardSidebar,
  Div,
  H2,
  Icon,
  SidebarFooter,
  SidebarHeader,
  SidebarLink,
  SidebarNav,
  SidebarToggle,
  Span,
} from '@ezstart/ui/components'
import { useTheme } from '@ezstart/ui/theme'
import { useLocale, useTranslations } from 'next-intl'
import { useMemo, useState } from 'react'
import { Link, useRouter, usePathname } from '@/i18n/navigation'
import { EzauthScopeIndicator } from '@/components/ezauth-scope-indicator'

const ADMIN_SECTIONS = ['overview', 'users', 'applications', 'settings'] as const
type AdminSection = (typeof ADMIN_SECTIONS)[number]

const SECTION_ICONS: Record<AdminSection, string> = {
  overview: 'lucide:LayoutDashboard',
  users: 'lucide:Users',
  applications: 'lucide:LayoutGrid',
  settings: 'lucide:Settings',
}

const LANGUAGES = [
  { code: 'en', label: 'EN' },
  { code: 'fr', label: 'FR' },
  { code: 'vi', label: 'VI' },
]

/**
 * `/admin` — EZAuth's self-owned admin entry point.
 *
 * Per `standard-architecture.md` Tier 3 federated pattern: ezstart is the
 * platform hub that aggregates AdminDashboards from each SaaS via SDK
 * components. ezauth, as a Tier 1 SaaS service, also exposes its OWN admin
 * dashboard scoped to its own tenant Application. This is the dogfood entry
 * point — `<AuthAdminDashboard>` embedded here is the SAME component ezstart
 * embeds (in tabs alongside `<PayAdminDashboard>` etc.), proving the SDK is
 * consumer-ready.
 *
 * Chrome: shares the same `<DashboardLayout>` shell as `/dashboard` (Stripe /
 * Clerk / Vercel pattern). Sidebar nav drives the active admin section, and
 * the SDK's internal `<TabsList>` is hidden via CSS — `?_data-slot=tabs-list`
 * — so consumers see a single source of truth (sidebar). The `key` prop on
 * `<AuthAdminDashboard>` forces a remount when the section changes (the SDK
 * exposes `defaultTab` but not a controlled `value`).
 *
 * Auto-scoping: the SDK derives the scope server-side from the JWT
 * (superadmin sees all tenants, app-admin sees their owned apps).
 *
 * The Plans tab is intentionally NOT mounted here — plans are a pay concern
 * accessible via the ezstart hub's EZPay tab (federated pattern).
 */
export default function AdminPage() {
  const t = useTranslations('admin')
  const tDash = useTranslations('admin.dashboard')
  const tApps = useTranslations('admin.applications')
  const tFlags = useTranslations('admin.featureFlags')
  const tMenu = useTranslations('layout.userMenuV2')
  const tAccount = useTranslations('layout.accountModalV2')
  const tMaint = useTranslations('admin.maintenanceMode')
  const tOverview = useTranslations('admin.overview')
  const tLayout = useTranslations('layout')
  const locale = useLocale()
  const router = useRouter()
  const pathname = usePathname()
  const { theme, setTheme } = useTheme()

  const [activeSection, setActiveSection] = useState<AdminSection>('overview')

  // Single nested texts object matching the SDK's `AuthAdminDashboardTexts`
  // shape. Keys grouped per-tab — the SDK does its own merge with English
  // defaults. `texts.users.minutesAgo|hoursAgo|daysAgo|editRolesSubtitle|
  // appRolesLabel` use `{count}`/`{email}`/`{app}` placeholders the SDK
  // substitutes via `String.replace` — we forward the raw template (via
  // `t.raw`) rather than letting next-intl interpolate (which would error
  // on missing params and surface the raw key).
  const adminTexts: Partial<AuthAdminDashboardTexts> = useMemo(
    () => ({
      tabOverview: t('tabs.overview'),
      tabUsers: t('tabs.users'),
      tabApplications: t('tabs.applications'),
      tabSettings: t('tabs.settings'),
      overview: {
        title: tOverview('title'),
        subtitle: tOverview('subtitle'),
        totalUsers: tOverview('totalUsers'),
        newUsersThisMonth: tOverview('newUsersThisMonth'),
        activeUsersLast30Days: tOverview('activeUsersLast30Days'),
        activeUsersHint: tOverview('activeUsersHint'),
        verifiedUsers: tOverview('verifiedUsers'),
        twoFactorEnabled: tOverview('twoFactorEnabled'),
        totalApplications: tOverview('totalApplications'),
        totalApiKeys: tOverview('totalApiKeys'),
        signupTrendTitle: tOverview('signupTrendTitle'),
        signupTrendDescription: tOverview('signupTrendDescription'),
        signupTrendEmpty: tOverview('signupTrendEmpty'),
        signupSeriesLabel: tOverview('signupSeriesLabel'),
        signupAxisLabel: tOverview('signupAxisLabel'),
        topAppsTitle: tOverview('topAppsTitle'),
        topAppsDescription: tOverview('topAppsDescription'),
        topAppsEmpty: tOverview('topAppsEmpty'),
        topAppsAppColumn: tOverview('topAppsAppColumn'),
        topAppsUsersColumn: tOverview('topAppsUsersColumn'),
        loadError: tOverview('loadError'),
        retry: t('dialog.retry'),
      },
      users: {
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
        columnApps: t('users.columns.apps'),
        columnActions: t('users.columns.actions'),
        edit: tDash('edit'),
        delete: tDash('delete'),
        noUsers: tDash('noUsers'),
        onlineLabel: tDash('onlineLabel'),
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
        rows: tDash.raw('rows') as string,
        pageOf: tDash.raw('pageOf') as string,
      },
      applications: {
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
        rows: tDash.raw('rows') as string,
        pageOf: tDash.raw('pageOf') as string,
      },
      settings: {
        featureFlags: {
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
        },
        maintenance: {
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
        },
      },
    }),
    [t, tDash, tApps, tFlags, tMaint, tOverview]
  )

  const handleLocaleChange = (newLocale: string) => {
    const newPathname = pathname.replace(`/${locale}`, `/${newLocale}`)
    router.push(newPathname)
  }

  return (
    <RequireAuth loadingComponent={<RequireAuthLoader text={t('loading')} />}>
      <RequireRole
        roles={['superadmin', 'admin']}
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
        <DashboardLayout>
          <DashboardSidebar>
            <SidebarHeader>
              <Link
                href="/dashboard"
                className="flex items-center gap-2 text-foreground hover:text-primary transition-colors"
              >
                <Icon name="lucide:Shield" className="h-5 w-5 text-primary shrink-0" />
                <Span className="font-semibold">{t('title')}</Span>
              </Link>
            </SidebarHeader>

            <SidebarNav>
              {ADMIN_SECTIONS.map(section => (
                <SidebarLink
                  key={section}
                  href="#"
                  active={activeSection === section}
                  icon={
                    <Icon name={SECTION_ICONS[section] as 'lucide:Users'} className="h-4 w-4" />
                  }
                  onClick={e => {
                    e.preventDefault()
                    setActiveSection(section)
                  }}
                >
                  {t(`tabs.${section}`)}
                </SidebarLink>
              ))}
            </SidebarNav>

            <SidebarFooter>
              <UserMenuV2
                variant="extended"
                side="top"
                avatarSize="sm"
                texts={{
                  signIn: tLayout('navSignIn'),
                  manageAccount: tMenu('manageAccount'),
                  signOut: tMenu('signOut'),
                  signingOut: tMenu('signingOut'),
                  signOutSuccess: tMenu('signOutSuccess'),
                  signOutError: tMenu('signOutError'),
                  signOutAllDevices: tMenu('signOutAllDevices'),
                  signOutAllSuccess: tMenu('signOutAllSuccess'),
                  signOutAllError: tMenu('signOutAllError'),
                  emailVerified: tMenu('emailVerified'),
                  emailUnverified: tMenu('emailUnverified'),
                  resendVerification: tMenu('resendVerification'),
                  verificationSent: tMenu('verificationSent'),
                  verifyError: tMenu('verifyError'),
                  themeLabel: tMenu('themeLabel'),
                  themeLight: tMenu('themeLight'),
                  themeDark: tMenu('themeDark'),
                  themeSystem: tMenu('themeSystem'),
                  notifications: tMenu('notifications'),
                  notificationsBadgeLabel: tMenu('notificationsBadgeLabel'),
                  helpAndResources: tMenu('helpAndResources'),
                  helpCenter: tMenu('helpCenter'),
                  keyboardShortcuts: tMenu('keyboardShortcuts'),
                  keyboardShortcutsHint: tMenu('keyboardShortcutsHint'),
                  status: tMenu('status'),
                  changelog: tMenu('changelog'),
                  managePlan: tMenu('managePlan'),
                }}
                accountModalTexts={{
                  title: tAccount('title'),
                  needHelp: tAccount('needHelp'),
                  toggleNavigation: tAccount('toggleNavigation'),
                  profileTab: tAccount('profileTab'),
                  settingsTab: tAccount('settingsTab'),
                  updateProfile: tAccount('updateProfile'),
                  emailSection: tAccount('emailSection'),
                  primary: tAccount('primary'),
                  connectedAccounts: tAccount('connectedAccounts'),
                  connectAccount: tAccount('connectAccount'),
                  themeSection: tAccount('themeSection'),
                  themeLight: tAccount('themeLight'),
                  themeDark: tAccount('themeDark'),
                  themeSystem: tAccount('themeSystem'),
                  languageSection: tAccount('languageSection'),
                  memberSince: tAccount('memberSince'),
                  firstName: tAccount('firstName'),
                  lastName: tAccount('lastName'),
                  save: tAccount('save'),
                  cancel: tAccount('cancel'),
                  profileUpdated: tAccount('profileUpdated'),
                  changeAvatar: tAccount('changeAvatar'),
                  cropAvatar: tAccount('cropAvatar'),
                  passwordSection: tAccount('passwordSection'),
                  currentPassword: tAccount('currentPassword'),
                  newPassword: tAccount('newPassword'),
                  changePassword: tAccount('changePassword'),
                  createPassword: tAccount('createPassword'),
                  passwordChanged: tAccount('passwordChanged'),
                  securitySection: tAccount('securitySection'),
                  manageSecurity: tAccount('manageSecurity'),
                  emailVerified: tAccount('emailVerified'),
                  emailUnverified: tAccount('emailUnverified'),
                  resendVerification: tAccount('resendVerification'),
                  verificationSent: tAccount('verificationSent'),
                  verifyError: tAccount('verifyError'),
                  dateLocale: locale,
                }}
                theme={theme ? { theme, setTheme } : undefined}
                languages={LANGUAGES}
                currentLocale={locale}
                onLocaleChange={handleLocaleChange}
                planLabel="Free"
                helpHref={`/${locale}/docs`}
                statusHref={`/${locale}/status`}
                changelogHref={`/${locale}/changelog`}
              />
            </SidebarFooter>
          </DashboardSidebar>

          <DashboardMain>
            <DashboardHeader>
              <SidebarToggle mode="mobile" />
              <H2 className="text-lg font-semibold text-foreground">
                {t(`tabs.${activeSection}`)}
              </H2>
              <Span className="ml-auto inline-flex items-center gap-2">
                <EzauthScopeIndicator scope="admin" />
              </Span>
            </DashboardHeader>

            <DashboardContent>
              {/*
               * `<AuthAdminDashboard>` is the consolidated SDK component with
               * 4 internal tabs. The sidebar nav drives `activeSection`; we
               * remount the component via `key` and pass `defaultTab` so the
               * right tab opens. The internal `<TabsList>` is hidden via the
               * `[&_[data-slot=tabs-list]]:hidden` arbitrary selector — only
               * the sidebar nav surfaces section navigation (single source
               * of truth, Stripe / Clerk pattern).
               */}
              <Div className="[&_[data-slot=tabs-list]]:hidden">
                <AuthAdminDashboard
                  key={activeSection}
                  defaultTab={activeSection}
                  texts={adminTexts}
                />
              </Div>
            </DashboardContent>
          </DashboardMain>
        </DashboardLayout>
      </RequireRole>
    </RequireAuth>
  )
}

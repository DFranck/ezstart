'use client'

import type { ReactNode } from 'react'
import { useEffect, useMemo, useState } from 'react'
import { useSearchParams } from 'next/navigation'
import {
  Badge,
  Card,
  CardContent,
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
  H3,
  Icon,
  P,
  SidebarFooter,
  SidebarHeader,
  SidebarLink,
  SidebarNav,
  SidebarToggle,
  Skeleton,
  Span,
} from '@ezstart/ui/components'
import { useAuth } from '../react/hooks.js'
import { UserMenu } from './UserMenu.js'
import { UserSettings } from './UserSettings.js'
import { TwoFactorSettings } from './TwoFactorSettings.js'
import { EmailVerificationStatus } from './EmailVerificationStatus.js'
import { SessionsManager } from './SessionsManager.js'
import { DeveloperPortal } from './developer/index.js'
import { AuthAdminDashboard } from './AuthAdminDashboard.js'
import type { AuthAdminDashboardTexts } from './AuthAdminDashboard.js'
import type { UserSettingsTexts } from './UserSettings.js'
import type { TwoFactorSettingsTexts } from './TwoFactorSettings.js'
import type { EmailVerificationStatusTexts } from './EmailVerificationStatus.js'
import type { SessionsManagerTexts } from './SessionsManager.js'
import type { DeveloperPortalTexts } from './developer/types.js'

// ─── Types ───────────────────────────────────────────────────────────────────

/**
 * Canonical section identifiers for the unified dashboard. Mirrors the
 * Stripe / Clerk sidebar pattern: progressive disclosure based on RBAC.
 */
export type EZAuthDashboardSection =
  | 'overview'
  | 'account'
  | 'applications'
  | 'api-keys'
  | 'billing'
  | 'usage'
  | 'settings'
  | 'users'
  | 'platform'

/**
 * Visibility rules for each section.
 * - `always`: every authenticated user sees it
 * - `ownsApps`: only when the user owns at least one Application
 * - `admin`: admin OR superadmin
 * - `superadmin`: superadmin only
 */
type SectionVisibility = 'always' | 'ownsApps' | 'admin' | 'superadmin'

export interface EZAuthDashboardTexts {
  /** Sidebar nav labels (keys mirror the section ids) */
  navOverview: string
  navAccount: string
  navApplications: string
  navApiKeys: string
  navBilling: string
  navUsage: string
  navSettings: string
  navUsers: string
  navPlatform: string
  /** Sidebar brand */
  brand: string
  /** Overview section */
  welcomeBack: string
  memberSince: string
  plan: string
  planFree: string
  statsApiKeys: string
  statsApps: string
  statsRoles: string
  /** Billing section defaults */
  billingTitle: string
  billingDescription: string
  comingSoon: string
  /** Usage section defaults */
  usageTitle: string
  usageDescription: string
  usageComingSoon: string
  /** Sign out */
  signOut: string
  /** Settings sub-section titles */
  settingsEmailVerification: string
  settingsTwoFactor: string
  settingsSessions: string
  /** Nested component overrides */
  settings: Partial<UserSettingsTexts>
  emailVerification: Partial<EmailVerificationStatusTexts>
  twoFactor: Partial<TwoFactorSettingsTexts>
  sessions: Partial<SessionsManagerTexts>
  developerPortal: Partial<DeveloperPortalTexts>
  admin: Partial<AuthAdminDashboardTexts>
}

/**
 * Slot overrides. Consumer apps can inject app-specific content for sections
 * that need routing / app-scoped SDK components (e.g. `ApplicationsList`,
 * `BillingDashboard`, `UserDashboard`).
 *
 * If a slot is omitted the section falls back to the built-in content (or a
 * "coming soon" placeholder for pure app-specific sections like `platform`).
 */
export interface EZAuthDashboardSlots {
  overview?: ReactNode
  account?: ReactNode
  applications?: ReactNode
  apiKeys?: ReactNode
  billing?: ReactNode
  usage?: ReactNode
  settings?: ReactNode
  users?: ReactNode
  platform?: ReactNode
}

/**
 * Extra section injected at a specific position. Lets consumer apps (e.g.
 * ezpay) add product-specific sidebar entries like "Stripe Connect" or
 * "Plans" without forking the dashboard.
 */
export interface EZAuthDashboardExtraSection {
  /** Unique id (used in `?section=` and as React key). Must not collide with the canonical ids. */
  id: string
  /** Sidebar label (already translated). */
  label: string
  /** Lucide icon name (e.g. `'lucide:Plug'`). */
  icon: string
  /** Content rendered when the section is active. */
  content: ReactNode
  /** Visibility rule. Defaults to `'always'`. */
  visibility?: SectionVisibility
}

export interface EZAuthDashboardProps {
  /** Default active section when no `?section=` is present. Defaults to `'overview'`. */
  defaultSection?: EZAuthDashboardSection
  /** App name for role display and API key scoping. */
  appName?: string
  /** Whether DeveloperPortal should fetch data (when using the default slot). */
  apiKeysEnabled?: boolean
  /** Whether the current user owns at least one Application (gates sections). */
  hasOwnedApps?: boolean
  /** Locale for date formatting. */
  locale?: string
  /** All user-facing strings. Falls back to English defaults. */
  texts?: Partial<EZAuthDashboardTexts>
  /** Slot overrides for app-specific content. */
  slots?: EZAuthDashboardSlots
  /** Additional className on root wrapper. */
  className?: string
  /** Explicit list of sections to render. When omitted, all sections visible
   * under the RBAC rules are shown. Use this to hide/reorder tabs. */
  sections?: EZAuthDashboardSection[]
  /** Extra app-specific sections added after the canonical ones but before
   * the admin (`users`/`platform`) sections. */
  extraSections?: EZAuthDashboardExtraSection[]
}

// ─── Defaults ────────────────────────────────────────────────────────────────

const DEFAULT_TEXTS: EZAuthDashboardTexts = {
  navOverview: 'Overview',
  navAccount: 'Account',
  navApplications: 'Applications',
  navApiKeys: 'API Keys',
  navBilling: 'Billing',
  navUsage: 'Usage',
  navSettings: 'Settings',
  navUsers: 'Users',
  navPlatform: 'Platform',
  brand: 'Dashboard',
  welcomeBack: 'Welcome back',
  memberSince: 'Member since',
  plan: 'Plan',
  planFree: 'Free',
  statsApiKeys: 'API Keys',
  statsApps: 'Apps',
  statsRoles: 'Roles',
  billingTitle: 'Billing & Plans',
  billingDescription: 'Manage your subscription plan and usage limits',
  comingSoon: 'Pricing coming soon',
  usageTitle: 'Usage & Analytics',
  usageDescription: 'Personal usage statistics across your apps',
  usageComingSoon: 'Usage analytics coming soon',
  signOut: 'Sign Out',
  settingsEmailVerification: 'Email Verification',
  settingsTwoFactor: 'Two-Factor Authentication',
  settingsSessions: 'Active Sessions',
  settings: {},
  emailVerification: {},
  twoFactor: {},
  sessions: {},
  developerPortal: {},
  admin: {},
}

// Default section order when `sections` prop is not provided.
const DEFAULT_SECTION_ORDER: EZAuthDashboardSection[] = [
  'overview',
  'account',
  'applications',
  'api-keys',
  'billing',
  'usage',
  'users',
  'platform',
  'settings',
]

const SECTION_VISIBILITY: Record<EZAuthDashboardSection, SectionVisibility> = {
  overview: 'always',
  account: 'always',
  applications: 'always',
  'api-keys': 'always',
  billing: 'always',
  usage: 'always',
  settings: 'always',
  users: 'admin',
  platform: 'superadmin',
}

const SECTION_ICONS: Record<EZAuthDashboardSection, string> = {
  overview: 'lucide:LayoutDashboard',
  account: 'lucide:User',
  applications: 'lucide:AppWindow',
  'api-keys': 'lucide:Key',
  billing: 'lucide:CreditCard',
  usage: 'lucide:BarChart3',
  settings: 'lucide:Settings',
  users: 'lucide:Users',
  platform: 'lucide:ShieldCheck',
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function formatDate(dateStr: string | undefined | null): string {
  if (!dateStr) return '-'
  try {
    return new Date(dateStr).toLocaleDateString(undefined, {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    })
  } catch {
    return '-'
  }
}

function getDisplayName(user: { firstName?: string; lastName?: string; username: string }): string {
  if (user.firstName) return user.firstName
  return user.username
}

function isSuperadmin(user: { globalRoles?: string[] }): boolean {
  return user.globalRoles?.includes('superadmin') ?? false
}

function isAdminOrSuperadmin(user: { globalRoles?: string[] }): boolean {
  return isSuperadmin(user) || (user.globalRoles?.includes('admin') ?? false)
}

function navLabelFor(section: EZAuthDashboardSection, texts: EZAuthDashboardTexts): string {
  switch (section) {
    case 'overview':
      return texts.navOverview
    case 'account':
      return texts.navAccount
    case 'applications':
      return texts.navApplications
    case 'api-keys':
      return texts.navApiKeys
    case 'billing':
      return texts.navBilling
    case 'usage':
      return texts.navUsage
    case 'settings':
      return texts.navSettings
    case 'users':
      return texts.navUsers
    case 'platform':
      return texts.navPlatform
  }
}

// ─── Component ───────────────────────────────────────────────────────────────

export function EZAuthDashboard({
  defaultSection = 'overview',
  appName,
  apiKeysEnabled = true,
  hasOwnedApps = false,
  locale = 'en',
  texts: textOverrides,
  slots,
  className,
  sections: sectionsProp,
  extraSections,
}: EZAuthDashboardProps) {
  const { user, isAuthenticated } = useAuth()
  const texts = { ...DEFAULT_TEXTS, ...textOverrides }
  const searchParams = useSearchParams()
  const [mounted, setMounted] = useState(false)
  useEffect(() => setMounted(true), [])

  const extras = extraSections ?? []
  const extraIds = extras.map(e => e.id)
  const allKnownIds: string[] = [...DEFAULT_SECTION_ORDER, ...extraIds]

  // Compute the initial section from `?section=...` query (deeplink) when
  // available, otherwise fall back to `defaultSection`.
  const querySection = searchParams?.get('section') ?? null
  const initialSection: string = useMemo(() => {
    if (querySection && allKnownIds.includes(querySection)) {
      return querySection
    }
    return defaultSection
  }, [querySection, defaultSection, allKnownIds.join(',')])

  const [activeSection, setActiveSection] = useState<string>(initialSection)

  // When the query-string changes (e.g. router.replace from a nav link),
  // follow it.
  useEffect(() => {
    if (querySection && allKnownIds.includes(querySection)) {
      setActiveSection(querySection)
    }
    // Intentionally not re-running on allKnownIds change (we hash via join).
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [querySection])

  if (!mounted) {
    return <DashboardSkeleton />
  }

  if (!isAuthenticated || !user) {
    return null
  }

  const isAdmin = isAdminOrSuperadmin(user)
  const isSuper = isSuperadmin(user)

  const shouldShow = (vis: SectionVisibility): boolean => {
    switch (vis) {
      case 'always':
        return true
      case 'ownsApps':
        return hasOwnedApps
      case 'admin':
        return isAdmin
      case 'superadmin':
        return isSuper
    }
  }

  // Visibility filter — drops canonical sections the current user can't see.
  const canonicalSections = (sectionsProp ?? DEFAULT_SECTION_ORDER).filter(section =>
    shouldShow(SECTION_VISIBILITY[section])
  )

  // Filter extra sections by their visibility.
  const visibleExtras = extras.filter(e => shouldShow(e.visibility ?? 'always'))

  // Build nav items. Canonical non-admin sections first, then extras, then
  // admin sections (`users`/`platform`).
  const canonicalNonAdmin = canonicalSections.filter(s => s !== 'users' && s !== 'platform')
  const canonicalAdmin = canonicalSections.filter(s => s === 'users' || s === 'platform')

  const navItems: { id: string; label: string; icon: string }[] = [
    ...canonicalNonAdmin.map(section => ({
      id: section,
      label: navLabelFor(section, texts),
      icon: SECTION_ICONS[section],
    })),
    ...visibleExtras.map(e => ({ id: e.id, label: e.label, icon: e.icon })),
    ...canonicalAdmin.map(section => ({
      id: section,
      label: navLabelFor(section, texts),
      icon: SECTION_ICONS[section],
    })),
  ]

  // If the currently-active section is no longer visible (RBAC flip or custom
  // `sections` list), fall back to the first visible section.
  const visibleIds = navItems.map(n => n.id)
  const effectiveSection: string = visibleIds.includes(activeSection)
    ? activeSection
    : (visibleIds[0] ?? 'overview')

  const activeExtra = visibleExtras.find(e => e.id === effectiveSection)
  const isCanonical = DEFAULT_SECTION_ORDER.includes(effectiveSection as EZAuthDashboardSection)

  return (
    <DashboardLayout className={className}>
      {/* Sidebar */}
      <DashboardSidebar>
        <SidebarHeader>
          <a
            href="/"
            className="flex items-center gap-2 text-foreground hover:text-primary transition-colors"
          >
            <Icon name="lucide:Code" className="h-5 w-5 text-primary shrink-0" />
            <Span className="font-semibold">{texts.brand}</Span>
          </a>
        </SidebarHeader>

        <SidebarNav>
          {navItems.map(item => (
            <SidebarLink
              key={item.id}
              href="#"
              active={effectiveSection === item.id}
              icon={<Icon name={item.icon as 'lucide:Key'} className="h-4 w-4" />}
              onClick={e => {
                e.preventDefault()
                setActiveSection(item.id)
              }}
            >
              {item.label}
            </SidebarLink>
          ))}
        </SidebarNav>

        <SidebarFooter>
          <UserMenu variant="extended" side="top" avatarSize="sm" />
        </SidebarFooter>
      </DashboardSidebar>

      {/* Main content */}
      <DashboardMain>
        <DashboardHeader>
          <SidebarToggle mode="mobile" />
          <H2 className="text-lg font-semibold text-foreground">
            {navItems.find(n => n.id === effectiveSection)?.label}
          </H2>
        </DashboardHeader>

        <DashboardContent>
          {activeExtra ? (
            activeExtra.content
          ) : isCanonical ? (
            <SectionRenderer
              section={effectiveSection as EZAuthDashboardSection}
              user={user}
              appName={appName}
              apiKeysEnabled={apiKeysEnabled}
              locale={locale}
              texts={texts}
              slots={slots}
              isAdmin={isAdmin}
              isSuper={isSuper}
            />
          ) : null}
        </DashboardContent>
      </DashboardMain>
    </DashboardLayout>
  )
}

// ─── Section renderer ────────────────────────────────────────────────────────

interface SectionRendererProps {
  section: EZAuthDashboardSection
  user: {
    email: string
    username: string
    firstName?: string
    lastName?: string
    avatar?: string
    apps?: string[]
    globalRoles?: string[]
    appRoles?: Record<string, string[]>
    createdAt: string
  }
  appName?: string
  apiKeysEnabled: boolean
  locale: string
  texts: EZAuthDashboardTexts
  slots?: EZAuthDashboardSlots
  isAdmin: boolean
  isSuper: boolean
}

function SectionRenderer({
  section,
  user,
  appName,
  apiKeysEnabled,
  locale,
  texts,
  slots,
  isAdmin,
  isSuper,
}: SectionRendererProps) {
  switch (section) {
    case 'overview':
      return slots?.overview ?? <OverviewSection user={user} texts={texts} />

    case 'account':
      return slots?.account ?? <SettingsSection appName={appName} texts={texts} />

    case 'applications':
      return (
        slots?.applications ?? (
          <PlaceholderSection
            icon="lucide:AppWindow"
            title={texts.navApplications}
            description="Configure this section by passing `slots.applications` from your app."
          />
        )
      )

    case 'api-keys':
      return (
        slots?.apiKeys ?? (
          <DeveloperPortal
            enabled={apiKeysEnabled}
            locale={locale}
            texts={texts.developerPortal}
            showAdminScope={isSuper}
            appOptions={user.apps ?? []}
          />
        )
      )

    case 'billing':
      return slots?.billing ?? <BillingSection texts={texts} isAdmin={isAdmin} />

    case 'usage':
      return slots?.usage ?? <UsageSection texts={texts} />

    case 'settings':
      return slots?.settings ?? <SettingsSection appName={appName} texts={texts} />

    case 'users':
      return (
        slots?.users ?? (
          <AuthAdminDashboard scope={isSuper ? 'all' : 'myApps'} appName="*" texts={texts.admin} />
        )
      )

    case 'platform':
      return slots?.platform ?? <AuthAdminDashboard scope="all" appName="*" texts={texts.admin} />
  }
}

// ─── Settings / Account Section ──────────────────────────────────────────────

function SettingsSection({ appName, texts }: { appName?: string; texts: EZAuthDashboardTexts }) {
  return (
    <Div className="space-y-6 w-full max-w-lg mx-auto">
      {/* Avatar + Personal Information + Roles + Connected Accounts */}
      <UserSettings appName={appName} texts={texts.settings} />

      {/* Email Verification */}
      <Card>
        <CardHeader>
          <H3 className="text-sm font-medium text-foreground">{texts.settingsEmailVerification}</H3>
        </CardHeader>
        <CardContent>
          <EmailVerificationStatus texts={texts.emailVerification} />
        </CardContent>
      </Card>

      {/* Two-Factor Authentication */}
      <Card>
        <CardHeader>
          <H3 className="text-sm font-medium text-foreground">{texts.settingsTwoFactor}</H3>
        </CardHeader>
        <CardContent>
          <TwoFactorSettings texts={texts.twoFactor} />
        </CardContent>
      </Card>

      {/* Active Sessions */}
      <Card>
        <CardHeader>
          <H3 className="text-sm font-medium text-foreground">{texts.settingsSessions}</H3>
        </CardHeader>
        <CardContent>
          <SessionsManager texts={texts.sessions} />
        </CardContent>
      </Card>
    </Div>
  )
}

// ─── Overview Section ────────────────────────────────────────────────────────

function OverviewSection({
  user,
  texts,
}: {
  user: {
    email: string
    username: string
    firstName?: string
    lastName?: string
    avatar?: string
    apps?: string[]
    globalRoles?: string[]
    appRoles?: Record<string, string[]>
    createdAt: string
  }
  texts: EZAuthDashboardTexts
}) {
  const apps = user.apps ?? []
  const globalRoles = user.globalRoles ?? []
  const appRoleEntries = Object.entries(user.appRoles ?? {})

  return (
    <Div className="space-y-6">
      {/* Welcome header */}
      <Div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <Div>
          <H2 className="text-xl font-semibold text-foreground md:text-2xl">
            {texts.welcomeBack}, {getDisplayName(user)}
          </H2>
          <P className="text-sm text-muted-foreground">
            {texts.memberSince} {formatDate(user.createdAt)}
          </P>
        </Div>
        <Badge variant="outline" size="sm">
          {texts.plan}: {texts.planFree}
        </Badge>
      </Div>

      {/* Apps */}
      <Card>
        <CardContent className="flex items-center gap-4 p-4 md:p-6">
          <Div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10">
            <Icon name="lucide:Layout" className="h-5 w-5 text-primary" />
          </Div>
          <Div className="min-w-0">
            <P className="text-sm text-muted-foreground mb-1">{texts.statsApps}</P>
            <Div className="flex flex-wrap gap-1.5">
              {apps.length > 0 ? (
                apps.map(app => (
                  <Badge key={app} variant="secondary" size="sm">
                    {app}
                  </Badge>
                ))
              ) : (
                <Span className="text-sm text-muted-foreground">-</Span>
              )}
            </Div>
          </Div>
        </CardContent>
      </Card>

      {/* Roles */}
      <Card>
        <CardContent className="flex items-center gap-4 p-4 md:p-6">
          <Div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10">
            <Icon name="lucide:Shield" className="h-5 w-5 text-primary" />
          </Div>
          <Div className="min-w-0">
            <P className="text-sm text-muted-foreground mb-1">{texts.statsRoles}</P>
            <Div className="flex flex-wrap gap-1.5">
              {globalRoles.length > 0 || appRoleEntries.length > 0 ? (
                <>
                  {globalRoles.map(role => (
                    <Badge
                      key={role}
                      variant={role === 'superadmin' ? 'destructive' : 'primary'}
                      size="sm"
                    >
                      {role}
                    </Badge>
                  ))}
                  {appRoleEntries.map(([app, roles]) =>
                    roles.map(role => (
                      <Badge key={`${app}-${role}`} variant="outline" size="sm">
                        {app}:{role}
                      </Badge>
                    ))
                  )}
                </>
              ) : (
                <Span className="text-sm text-muted-foreground">-</Span>
              )}
            </Div>
          </Div>
        </CardContent>
      </Card>

      {/* User info card */}
      <Card>
        <CardHeader>
          <H3 className="text-sm font-medium text-foreground">{texts.navOverview}</H3>
        </CardHeader>
        <CardContent className="space-y-3">
          <InfoRow icon="lucide:Mail" label="Email" value={user.email} />
          <InfoRow icon="lucide:AtSign" label="Username" value={user.username} />
          <InfoRow
            icon="lucide:Calendar"
            label={texts.memberSince}
            value={formatDate(user.createdAt)}
          />
        </CardContent>
      </Card>
    </Div>
  )
}

// ─── Billing Section ─────────────────────────────────────────────────────────

function BillingSection({ texts, isAdmin }: { texts: EZAuthDashboardTexts; isAdmin: boolean }) {
  return (
    <Div className="space-y-6">
      <Card>
        <CardHeader className="pb-4">
          <CardTitle className="text-xl font-bold">{texts.billingTitle}</CardTitle>
          <CardDescription>{texts.billingDescription}</CardDescription>
        </CardHeader>

        <CardContent>
          <Div className="flex flex-col items-center gap-3 py-8 text-center">
            <Icon name="lucide:CreditCard" className="h-12 w-12 text-muted-foreground/50" />
            <P className="text-muted-foreground">{texts.comingSoon}</P>
            {isAdmin && (
              <P className="text-sm text-muted-foreground/70">Connect EZPay to configure plans</P>
            )}
          </Div>
        </CardContent>
      </Card>
    </Div>
  )
}

// ─── Usage Section ───────────────────────────────────────────────────────────

function UsageSection({ texts }: { texts: EZAuthDashboardTexts }) {
  return (
    <Div className="space-y-6">
      <Card>
        <CardHeader className="pb-4">
          <CardTitle className="text-xl font-bold">{texts.usageTitle}</CardTitle>
          <CardDescription>{texts.usageDescription}</CardDescription>
        </CardHeader>
        <CardContent>
          <Div className="flex flex-col items-center gap-3 py-8 text-center">
            <Icon name="lucide:BarChart3" className="h-12 w-12 text-muted-foreground/50" />
            <P className="text-muted-foreground">{texts.usageComingSoon}</P>
          </Div>
        </CardContent>
      </Card>
    </Div>
  )
}

// ─── Placeholder Section ─────────────────────────────────────────────────────

function PlaceholderSection({
  icon,
  title,
  description,
}: {
  icon: string
  title: string
  description: string
}) {
  return (
    <Div className="space-y-6">
      <Card>
        <CardHeader className="pb-4">
          <CardTitle className="text-xl font-bold">{title}</CardTitle>
        </CardHeader>
        <CardContent>
          <Div className="flex flex-col items-center gap-3 py-8 text-center">
            <Icon
              name={icon as 'lucide:AppWindow'}
              className="h-12 w-12 text-muted-foreground/50"
            />
            <P className="text-muted-foreground">{description}</P>
          </Div>
        </CardContent>
      </Card>
    </Div>
  )
}

// ─── Sub-components ──────────────────────────────────────────────────────────

function InfoRow({ icon, label, value }: { icon: string; label: string; value: string }) {
  return (
    <Div className="flex items-center gap-3">
      <Icon name={icon as 'lucide:Mail'} className="h-4 w-4 shrink-0 text-muted-foreground" />
      <Div className="flex-1 min-w-0">
        <P className="text-xs text-muted-foreground">{label}</P>
        <Span className="text-sm text-foreground truncate">{value}</Span>
      </Div>
    </Div>
  )
}

function DashboardSkeleton() {
  return (
    <DashboardLayout>
      <DashboardSidebar>
        <SidebarHeader>
          <Skeleton className="h-5 w-5" />
          <Skeleton className="h-5 w-24" />
        </SidebarHeader>
        <Div className="px-2 py-4 space-y-2">
          <Skeleton className="h-8 w-full" />
          <Skeleton className="h-8 w-full" />
          <Skeleton className="h-8 w-full" />
          <Skeleton className="h-8 w-full" />
        </Div>
      </DashboardSidebar>
      <DashboardMain>
        <DashboardHeader>
          <Skeleton className="h-6 w-32" />
        </DashboardHeader>
        <DashboardContent>
          <Div className="space-y-4">
            <Skeleton className="h-8 w-64" />
            <Div className="grid gap-4 sm:grid-cols-2">
              <Skeleton className="h-24 w-full" />
              <Skeleton className="h-24 w-full" />
            </Div>
          </Div>
        </DashboardContent>
      </DashboardMain>
    </DashboardLayout>
  )
}

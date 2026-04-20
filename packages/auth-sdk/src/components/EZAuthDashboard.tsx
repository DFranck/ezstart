'use client'

import { useEffect, useState } from 'react'
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
  Button,
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

export interface EZAuthDashboardTexts {
  /** Sidebar nav labels */
  navOverview: string
  navApiKeys: string
  navBilling: string
  navSettings: string
  navAdmin: string
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
  /** Billing section */
  billingTitle: string
  billingDescription: string
  comingSoon: string
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

export interface EZAuthDashboardProps {
  /** Default active section. Defaults to `'overview'`. */
  defaultSection?: 'overview' | 'api-keys' | 'billing' | 'settings' | 'admin'
  /** App name for role display and API key scoping. */
  appName?: string
  /** Whether DeveloperPortal should fetch data. */
  apiKeysEnabled?: boolean
  /** Locale for date formatting. */
  locale?: string
  /** All user-facing strings. Falls back to English defaults. */
  texts?: Partial<EZAuthDashboardTexts>
  /** Additional className on root wrapper. */
  className?: string
}

// ─── Defaults ────────────────────────────────────────────────────────────────

const DEFAULT_TEXTS: EZAuthDashboardTexts = {
  navOverview: 'Overview',
  navApiKeys: 'API Keys',
  navBilling: 'Billing',
  navSettings: 'Settings',
  navAdmin: 'Admin',
  brand: 'Developer',
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

type Section = 'overview' | 'api-keys' | 'billing' | 'settings' | 'admin'

// ─── Component ───────────────────────────────────────────────────────────────

export function EZAuthDashboard({
  defaultSection = 'overview',
  appName,
  apiKeysEnabled = true,
  locale = 'en',
  texts: textOverrides,
  className,
}: EZAuthDashboardProps) {
  const { user, isAuthenticated, logout } = useAuth()
  const texts = { ...DEFAULT_TEXTS, ...textOverrides }
  const [activeSection, setActiveSection] = useState<Section>(defaultSection)
  const [mounted, setMounted] = useState(false)
  useEffect(() => setMounted(true), [])

  if (!mounted) {
    return <DashboardSkeleton />
  }

  if (!isAuthenticated || !user) {
    return null
  }

  const isAdmin = isSuperadmin(user) || (user.globalRoles?.includes('admin') ?? false)

  const navItems: { id: Section; label: string; icon: string }[] = [
    { id: 'overview', label: texts.navOverview, icon: 'lucide:LayoutDashboard' },
    { id: 'api-keys', label: texts.navApiKeys, icon: 'lucide:Key' },
    { id: 'billing', label: texts.navBilling, icon: 'lucide:CreditCard' },
    { id: 'settings', label: texts.navSettings, icon: 'lucide:Settings' },
    ...(isAdmin
      ? [{ id: 'admin' as Section, label: texts.navAdmin, icon: 'lucide:ShieldCheck' }]
      : []),
  ]

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
              active={activeSection === item.id}
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
            {navItems.find(n => n.id === activeSection)?.label}
          </H2>
        </DashboardHeader>

        <DashboardContent>
          {activeSection === 'overview' && (
            <OverviewSection user={user} appName={appName} texts={texts} />
          )}
          {activeSection === 'api-keys' && (
            <DeveloperPortal
              enabled={apiKeysEnabled}
              locale={locale}
              texts={texts.developerPortal}
              showAdminScope={isSuperadmin(user)}
              appOptions={user.apps ?? []}
            />
          )}
          {activeSection === 'billing' && <BillingSection texts={texts} isAdmin={isAdmin} />}
          {activeSection === 'settings' && <SettingsSection appName={appName} texts={texts} />}
          {activeSection === 'admin' && isAdmin && <AuthAdminDashboard texts={texts.admin} />}
        </DashboardContent>
      </DashboardMain>
    </DashboardLayout>
  )
}

// ─── Settings Section ────────────────────────────────────────────────────────

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
  appName,
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
  appName?: string
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

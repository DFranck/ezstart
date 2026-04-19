'use client'

import { useState } from 'react'
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
import { cn } from '@ezstart/ui/lib'
import { toast } from '@ezstart/ui/utils'
import { useAuth } from '../react/hooks.js'
import { UserAvatar } from './UserAvatar.js'
import { UserSettings } from './UserSettings.js'
import { DeveloperPortal } from './developer/index.js'
import type { UserSettingsTexts } from './UserSettings.js'
import type { DeveloperPortalTexts } from './developer/types.js'
import type { PlanInfo } from '../core/types.js'

// ─── Types ───────────────────────────────────────────────────────────────────

export interface EZAuthDashboardTexts {
  /** Sidebar nav labels */
  navOverview: string
  navApiKeys: string
  navBilling: string
  navSettings: string
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
  currentPlan: string
  quotaLabel: string
  maxKeysLabel: string
  unlimited: string
  manageSubscription: string
  choosePlan: string
  popular: string
  month: string
  requestsPerMonth: string
  apiKeys: string
  currentLabel: string
  upgrade: string
  downgrade: string
  comingSoon: string
  featureCommunitySupport: string
  featureEmailSupport: string
  featurePriorityRateLimit: string
  featureDedicatedSupport: string
  featureSla: string
  /** Sign out */
  signOut: string
  /** Nested component overrides */
  settings: Partial<UserSettingsTexts>
  developerPortal: Partial<DeveloperPortalTexts>
}

export interface EZAuthDashboardProps {
  /** Default active section. Defaults to `'overview'`. */
  defaultSection?: 'overview' | 'api-keys' | 'billing' | 'settings'
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
  currentPlan: 'Current Plan',
  quotaLabel: '{quota} requests / month',
  maxKeysLabel: '{count} API keys',
  unlimited: 'Unlimited',
  manageSubscription: 'Manage Subscription',
  choosePlan: 'Choose Your Plan',
  popular: 'Most Popular',
  month: 'month',
  requestsPerMonth: 'requests / month',
  apiKeys: 'API keys',
  currentLabel: 'Current Plan',
  upgrade: 'Upgrade',
  downgrade: 'Downgrade',
  comingSoon: 'Coming soon — plans will be available shortly',
  featureCommunitySupport: 'Community support',
  featureEmailSupport: 'Email support',
  featurePriorityRateLimit: 'Priority rate limit',
  featureDedicatedSupport: 'Dedicated support',
  featureSla: 'SLA 99.9%',
  signOut: 'Sign Out',
  settings: {},
  developerPortal: {},
}

// ─── Constants ───────────────────────────────────────────────────────────────

const FREE_PLAN: PlanInfo = {
  id: 'free',
  name: 'Free',
  price: 0,
  quotaMonthly: 1000,
  maxKeys: 1,
  features: ['communitySupport'],
}

const PLANS: PlanInfo[] = [
  FREE_PLAN,
  {
    id: 'pro',
    name: 'Pro',
    price: 2900,
    quotaMonthly: 50000,
    maxKeys: 10,
    features: ['emailSupport', 'priorityRateLimit'],
  },
  {
    id: 'business',
    name: 'Business',
    price: 9900,
    quotaMonthly: null,
    maxKeys: null,
    features: ['dedicatedSupport', 'sla'],
  },
]

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

function getDisplayName(user: {
  firstName?: string
  lastName?: string
  username: string
}): string {
  if (user.firstName) return user.firstName
  return user.username
}

function getUserRoleCount(
  user: { globalRoles?: string[]; appRoles?: Record<string, string[]> },
  appName?: string
): number {
  let count = user.globalRoles?.length ?? 0
  if (appName && user.appRoles?.[appName]) {
    count += user.appRoles[appName].length
  }
  return count
}

function isSuperadmin(user: { globalRoles?: string[] }): boolean {
  return user.globalRoles?.includes('superadmin') ?? false
}

function formatPrice(cents: number): string {
  if (cents === 0) return '$0'
  return `$${(cents / 100).toFixed(0)}`
}

function formatQuota(quota: number | null, unlimitedLabel: string): string {
  if (quota === null) return unlimitedLabel
  return quota.toLocaleString()
}

const FEATURE_MAP: Record<string, keyof EZAuthDashboardTexts> = {
  communitySupport: 'featureCommunitySupport',
  emailSupport: 'featureEmailSupport',
  priorityRateLimit: 'featurePriorityRateLimit',
  dedicatedSupport: 'featureDedicatedSupport',
  sla: 'featureSla',
}

type Section = 'overview' | 'api-keys' | 'billing' | 'settings'

// ─── Component ───────────────────────────────────────────────────────────────

export function EZAuthDashboard({
  defaultSection = 'overview',
  appName,
  apiKeysEnabled = true,
  locale = 'en',
  texts: textOverrides,
  className,
}: EZAuthDashboardProps) {
  const { user, isAuthenticated, isAuthReady, logout } = useAuth()
  const texts = { ...DEFAULT_TEXTS, ...textOverrides }
  const [activeSection, setActiveSection] = useState<Section>(defaultSection)

  if (!isAuthReady) {
    return <DashboardSkeleton />
  }

  if (!isAuthenticated || !user) {
    return null
  }

  const navItems: { id: Section; label: string; icon: string }[] = [
    { id: 'overview', label: texts.navOverview, icon: 'lucide:LayoutDashboard' },
    { id: 'api-keys', label: texts.navApiKeys, icon: 'lucide:Key' },
    { id: 'billing', label: texts.navBilling, icon: 'lucide:CreditCard' },
    { id: 'settings', label: texts.navSettings, icon: 'lucide:Settings' },
  ]

  return (
    <DashboardLayout className={className}>
      {/* Sidebar */}
      <DashboardSidebar>
        <SidebarHeader>
          <Icon name="lucide:Code" className="h-5 w-5 text-primary shrink-0" />
          <Span className="font-semibold text-foreground">{texts.brand}</Span>
        </SidebarHeader>

        <SidebarNav>
          {navItems.map((item) => (
            <SidebarLink
              key={item.id}
              href="#"
              active={activeSection === item.id}
              icon={<Icon name={item.icon as 'lucide:Key'} className="h-4 w-4" />}
              onClick={(e) => {
                e.preventDefault()
                setActiveSection(item.id)
              }}
            >
              {item.label}
            </SidebarLink>
          ))}
        </SidebarNav>

        <SidebarFooter>
          <Div className="flex items-center gap-3">
            <UserAvatar size="sm" user={user} />
            <Div className="flex-1 min-w-0">
              <P className="text-sm font-medium text-foreground truncate">
                {getDisplayName(user)}
              </P>
              <P className="text-xs text-muted-foreground truncate">{user.email}</P>
            </Div>
          </Div>
        </SidebarFooter>
      </DashboardSidebar>

      {/* Main content */}
      <DashboardMain>
        <DashboardHeader>
          <SidebarToggle mode="mobile" />
          <H2 className="text-lg font-semibold text-foreground">
            {navItems.find((n) => n.id === activeSection)?.label}
          </H2>
        </DashboardHeader>

        <DashboardContent>
          {activeSection === 'overview' && (
            <OverviewSection
              user={user}
              appName={appName}
              texts={texts}
            />
          )}
          {activeSection === 'api-keys' && (
            <DeveloperPortal
              enabled={apiKeysEnabled}
              locale={locale}
              texts={texts.developerPortal}
              showAdminScope={isSuperadmin(user)}
            />
          )}
          {activeSection === 'billing' && (
            <BillingSection texts={texts} />
          )}
          {activeSection === 'settings' && (
            <UserSettings
              appName={appName}
              texts={texts.settings}
            />
          )}
        </DashboardContent>
      </DashboardMain>
    </DashboardLayout>
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
  const appsCount = user.apps?.length ?? 0
  const rolesCount = getUserRoleCount(user, appName)

  const stats = [
    { label: texts.statsApps, value: appsCount, icon: 'lucide:Layout' as const },
    { label: texts.statsRoles, value: rolesCount, icon: 'lucide:Shield' as const },
  ]

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

      {/* Quick stats */}
      <Div className="grid gap-4 sm:grid-cols-2">
        {stats.map((stat) => (
          <Card key={stat.label}>
            <CardContent className="flex items-center gap-4 p-4 md:p-6">
              <Div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10">
                <Icon name={stat.icon} className="h-5 w-5 text-primary" />
              </Div>
              <Div>
                <P className="text-sm text-muted-foreground">{stat.label}</P>
                <Span className="text-2xl font-bold text-foreground">{stat.value}</Span>
              </Div>
            </CardContent>
          </Card>
        ))}
      </Div>

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

function BillingSection({ texts }: { texts: EZAuthDashboardTexts }) {
  const currentPlanId = 'free'
  const currentPlan = PLANS.find((p) => p.id === currentPlanId) ?? FREE_PLAN

  const handleUpgrade = () => {
    toast.info(texts.comingSoon)
  }

  const handleManageSubscription = () => {
    toast.info(texts.comingSoon)
  }

  return (
    <Div className="space-y-6">
      {/* Current Plan */}
      <Card>
        <CardHeader className="pb-4">
          <CardTitle className="text-xl font-bold">{texts.billingTitle}</CardTitle>
          <CardDescription>{texts.billingDescription}</CardDescription>
        </CardHeader>

        <CardContent>
          <Div className="flex items-center justify-between rounded-lg border bg-card p-4">
            <Div className="space-y-1">
              <Div className="flex items-center gap-2">
                <P className="font-semibold text-lg">{texts.currentPlan}</P>
                <Badge variant="primary">{currentPlan.name}</Badge>
              </Div>
              <P className="text-sm text-muted-foreground">
                {texts.quotaLabel.replace(
                  '{quota}',
                  formatQuota(currentPlan.quotaMonthly, texts.unlimited)
                )}
              </P>
              <P className="text-sm text-muted-foreground">
                {texts.maxKeysLabel.replace(
                  '{count}',
                  currentPlan.maxKeys !== null ? String(currentPlan.maxKeys) : texts.unlimited
                )}
              </P>
            </Div>
            {currentPlanId !== 'free' && (
              <Button variant="outline" size="sm" onClick={handleManageSubscription}>
                <Icon name="lucide:Settings" className="w-4 h-4 mr-1.5" />
                {texts.manageSubscription}
              </Button>
            )}
          </Div>
        </CardContent>
      </Card>

      {/* Plans Comparison */}
      <Div className="space-y-4">
        <H2 className="text-lg font-semibold text-center">{texts.choosePlan}</H2>

        <Div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {PLANS.map((plan) => {
            const isCurrent = plan.id === currentPlanId
            return (
              <Card
                key={plan.id}
                className={cn('relative', plan.id === 'pro' && 'border-primary')}
              >
                {plan.id === 'pro' && (
                  <Div className="absolute -top-3 left-1/2 -translate-x-1/2">
                    <Badge variant="primary">{texts.popular}</Badge>
                  </Div>
                )}

                <CardHeader className="text-center pb-2">
                  <CardTitle className="text-lg">{plan.name}</CardTitle>
                  <Div className="mt-2">
                    <Span className="text-3xl font-bold text-foreground">
                      {formatPrice(plan.price)}
                    </Span>
                    {plan.price > 0 && (
                      <Span className="text-muted-foreground text-sm">/{texts.month}</Span>
                    )}
                  </Div>
                </CardHeader>

                <CardContent className="space-y-4">
                  <Div className="space-y-2">
                    <Div className="flex items-center gap-2">
                      <Icon name="lucide:Zap" className="w-4 h-4 text-primary shrink-0" />
                      <Span className="text-sm">
                        {formatQuota(plan.quotaMonthly, texts.unlimited)} {texts.requestsPerMonth}
                      </Span>
                    </Div>
                    <Div className="flex items-center gap-2">
                      <Icon name="lucide:Key" className="w-4 h-4 text-primary shrink-0" />
                      <Span className="text-sm">
                        {plan.maxKeys !== null ? String(plan.maxKeys) : texts.unlimited}{' '}
                        {texts.apiKeys}
                      </Span>
                    </Div>
                    {plan.features.map((feature) => {
                      const textKey = FEATURE_MAP[feature]
                      const label = textKey ? (texts[textKey] as string) : feature
                      return (
                        <Div key={feature} className="flex items-center gap-2">
                          <Icon name="lucide:Check" className="w-4 h-4 text-success shrink-0" />
                          <Span className="text-sm">{label}</Span>
                        </Div>
                      )
                    })}
                  </Div>

                  {isCurrent ? (
                    <Button variant="outline" className="w-full" disabled>
                      {texts.currentLabel}
                    </Button>
                  ) : (
                    <Button
                      variant={plan.id === 'pro' ? 'default' : 'outline'}
                      className="w-full"
                      onClick={handleUpgrade}
                    >
                      {plan.price > currentPlan.price ? texts.upgrade : texts.downgrade}
                    </Button>
                  )}
                </CardContent>
              </Card>
            )
          })}
        </Div>
      </Div>
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

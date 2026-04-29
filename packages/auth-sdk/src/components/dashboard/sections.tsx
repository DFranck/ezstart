'use client'

import {
  Badge,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  Div,
  H2,
  H3,
  Icon,
  P,
  Span,
  Spinner,
} from '@ezstart/ui/components'
import type { EZAuthDashboardTexts } from './types.js'

// ─── Helpers ─────────────────────────────────────────────────────────────────

/**
 * Format an ISO date string for the dashboard "Member since" rows.
 *
 * @internal
 */
export function formatDashboardDate(dateStr: string | undefined | null, locale?: string): string {
  if (!dateStr) return '-'
  try {
    return new Date(dateStr).toLocaleDateString(locale ?? undefined, {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    })
  } catch {
    return '-'
  }
}

/**
 * Compute the friendly display name from a user record.
 *
 * @internal
 */
export function getDashboardDisplayName(user: {
  firstName?: string
  lastName?: string
  username: string
}): string {
  if (user.firstName) return user.firstName
  return user.username
}

// ─── Section components ──────────────────────────────────────────────────────

interface OverviewSectionProps {
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
  locale?: string
}

/**
 * Welcome card + Apps card + Roles card + user info card. Internal sub-component
 * of `<EZAuthDashboard>`.
 *
 * @internal
 */
export function OverviewSection({ user, texts, locale }: OverviewSectionProps) {
  const apps = user.apps ?? []
  const globalRoles = user.globalRoles ?? []
  const appRoleEntries = Object.entries(user.appRoles ?? {})

  return (
    <Div className="space-y-6">
      {/* Welcome header */}
      <Div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <Div>
          <H2 className="text-xl font-semibold text-foreground md:text-2xl">
            {texts.welcomeBack}, {getDashboardDisplayName(user)}
          </H2>
          <P className="text-sm text-muted-foreground">
            {texts.memberSince} {formatDashboardDate(user.createdAt, locale)}
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
          <InfoRow icon="lucide:Mail" label={texts.labelEmail} value={user.email} />
          <InfoRow icon="lucide:AtSign" label={texts.labelUsername} value={user.username} />
          <InfoRow
            icon="lucide:Calendar"
            label={texts.memberSince}
            value={formatDashboardDate(user.createdAt, locale)}
          />
        </CardContent>
      </Card>
    </Div>
  )
}

interface BillingSectionProps {
  texts: EZAuthDashboardTexts
  isAdmin: boolean
}

/**
 * Billing placeholder card. Internal sub-component of `<EZAuthDashboard>`.
 *
 * @internal
 */
export function BillingSection({ texts, isAdmin }: BillingSectionProps) {
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

/**
 * Usage placeholder card. Internal sub-component of `<EZAuthDashboard>`.
 *
 * @internal
 */
export function UsageSection({ texts }: { texts: EZAuthDashboardTexts }) {
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

/**
 * Generic placeholder card used when a slot is not filled. Internal
 * sub-component of `<EZAuthDashboard>`.
 *
 * @internal
 */
export function PlaceholderSection({
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

/**
 * Single labeled row inside the overview info card.
 *
 * @internal
 */
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

/**
 * Loading placeholder rendered before the auth state has hydrated. Internal
 * sub-component of `<EZAuthDashboard>`.
 *
 * @internal
 */
/**
 * Loading placeholder rendered when the dashboard cannot resolve a user
 * (typically a transient state when navigating from a public page to
 * `/dashboard` before the SSR auth bootstrap completes, or while the
 * `RequireAuth` guard is redirecting an unauthenticated visitor to `/login`).
 *
 * Renders a centered full-viewport spinner with an accessible label so the
 * user knows the page is loading rather than broken. Replaces the previous
 * skeleton-grid placeholder which was mounted unconditionally on every page
 * load via a now-removed `mounted` guard.
 *
 * @internal
 */
export function DashboardSkeleton({ text = 'Loading dashboard…' }: { text?: string } = {}) {
  return (
    <Div
      className="fixed inset-0 z-40 flex items-center justify-center bg-background"
      aria-busy="true"
      role="status"
      aria-label={text}
    >
      <Spinner variant="primary" size="lg" text={text} />
    </Div>
  )
}

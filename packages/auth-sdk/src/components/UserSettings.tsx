'use client'

import { Badge, Card, CardContent, CardHeader, Icon } from '@ezstart/ui/components'
import { Div, H2, H3, P, Span } from '@ezstart/ui/components'
import { cn } from '@ezstart/ui/lib'
import { useAuth } from '../provider.js'
import { UserAvatar } from './UserAvatar.js'
import type { AuthUser } from '../types.js'

// ─── Types ───────────────────────────────────────────────────────────────────

export interface UserSettingsTexts {
  title: string
  personalInfo: string
  email: string
  username: string
  fullName: string
  memberSince: string
  lastActive: string
  connectedAccounts: string
  roles: string
  noRoles: string
  editProfile: string
}

export interface UserSettingsProps {
  /** Show large avatar at the top */
  showAvatar?: boolean
  /** Show email field */
  showEmail?: boolean
  /** Show connected accounts section (Google, etc.) */
  showConnectedAccounts?: boolean
  /** Enable editing (TODO: not yet implemented) */
  editable?: boolean
  /** Additional class name */
  className?: string
  /** Override texts */
  texts?: Partial<UserSettingsTexts>
  /** App name for role display */
  appName?: string
}

// ─── Defaults ────────────────────────────────────────────────────────────────

const DEFAULT_TEXTS: UserSettingsTexts = {
  title: 'Account Settings',
  personalInfo: 'Personal Information',
  email: 'Email',
  username: 'Username',
  fullName: 'Full Name',
  memberSince: 'Member since',
  lastActive: 'Last active',
  connectedAccounts: 'Connected Accounts',
  roles: 'Roles',
  noRoles: 'No roles assigned',
  editProfile: 'Edit Profile',
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
    return dateStr
  }
}

function formatRelativeDate(dateStr: string | undefined | null): string {
  if (!dateStr) return '-'
  try {
    const date = new Date(dateStr)
    const now = new Date()
    const diffMs = now.getTime() - date.getTime()
    const diffMins = Math.floor(diffMs / 60000)
    const diffHours = Math.floor(diffMs / 3600000)
    const diffDays = Math.floor(diffMs / 86400000)

    if (diffMins < 1) return 'Just now'
    if (diffMins < 60) return `${diffMins}m ago`
    if (diffHours < 24) return `${diffHours}h ago`
    if (diffDays < 7) return `${diffDays}d ago`
    return formatDate(dateStr)
  } catch {
    return dateStr
  }
}

function isGoogleAvatar(avatar?: string): boolean {
  if (!avatar) return false
  return avatar.includes('googleusercontent.com') || avatar.includes('google.com')
}

function getUserRoles(user: AuthUser, appName?: string): string[] {
  const roles: string[] = []

  // Global roles
  if (user.globalRoles) {
    roles.push(...user.globalRoles)
  }

  // App-specific roles
  if (appName && user.appRoles?.[appName]) {
    roles.push(...user.appRoles[appName])
  }

  return roles
}

function getFullName(user: AuthUser): string {
  if (user.firstName && user.lastName) {
    return `${user.firstName} ${user.lastName}`
  }
  if (user.firstName) return user.firstName
  return user.username
}

// ─── Component ───────────────────────────────────────────────────────────────

export function UserSettings({
  showAvatar = true,
  showEmail = true,
  showConnectedAccounts = true,
  editable = false,
  className,
  texts: textOverrides,
  appName,
}: UserSettingsProps) {
  const { user, isAuthenticated } = useAuth()
  const texts = { ...DEFAULT_TEXTS, ...textOverrides }

  if (!isAuthenticated || !user) return null

  const roles = getUserRoles(user, appName)

  return (
    <Div className={cn('w-full max-w-lg mx-auto space-y-6', className)}>
      {/* Header with avatar */}
      {showAvatar && (
        <Div className="flex flex-col items-center gap-3 pb-4">
          <UserAvatar size="lg" user={user} />
          <Div className="text-center">
            <H2 className="text-lg font-semibold text-foreground">{getFullName(user)}</H2>
            <P className="text-sm text-muted-foreground">@{user.username}</P>
          </Div>
          {/* TODO: Edit profile button when editable=true */}
          {editable && (
            <P className="text-xs text-muted-foreground italic">
              Edit functionality coming soon
            </P>
          )}
        </Div>
      )}

      {/* Personal info */}
      <Card>
        <CardHeader>
          <H3 className="text-sm font-medium text-foreground">{texts.personalInfo}</H3>
        </CardHeader>
        <CardContent className="space-y-4">
          {showEmail && (
            <InfoRow
              icon="lucide:Mail"
              label={texts.email}
              value={user.email}
              verified={user.isVerified}
            />
          )}
          <InfoRow icon="lucide:AtSign" label={texts.username} value={user.username} />
          <InfoRow icon="lucide:User" label={texts.fullName} value={getFullName(user)} />
          <InfoRow
            icon="lucide:Calendar"
            label={texts.memberSince}
            value={formatDate(user.createdAt)}
          />
          <InfoRow
            icon="lucide:Clock"
            label={texts.lastActive}
            value={formatRelativeDate(user.lastActiveAt)}
          />
        </CardContent>
      </Card>

      {/* Roles */}
      {roles.length > 0 && (
        <Card>
          <CardHeader>
            <H3 className="text-sm font-medium text-foreground">{texts.roles}</H3>
          </CardHeader>
          <CardContent>
            <Div className="flex flex-wrap gap-2">
              {roles.map(role => (
                <Badge key={role} variant="secondary">
                  {role}
                </Badge>
              ))}
            </Div>
          </CardContent>
        </Card>
      )}

      {/* Connected accounts */}
      {showConnectedAccounts && (
        <Card>
          <CardHeader>
            <H3 className="text-sm font-medium text-foreground">{texts.connectedAccounts}</H3>
          </CardHeader>
          <CardContent className="space-y-3">
            <Div className="flex items-center gap-3">
              <Icon name="fa:FaGoogle" className="w-5 h-5 text-muted-foreground" />
              <Div className="flex-1 min-w-0">
                <P className="text-sm font-medium text-foreground">Google</P>
                <P className="text-xs text-muted-foreground truncate">
                  {isGoogleAvatar(user.avatar) ? user.email : 'Not connected'}
                </P>
              </Div>
              {isGoogleAvatar(user.avatar) && (
                <Icon name="lucide:Check" className="w-4 h-4 text-primary shrink-0" />
              )}
            </Div>
          </CardContent>
        </Card>
      )}
    </Div>
  )
}

// ─── Sub-components ──────────────────────────────────────────────────────────

function InfoRow({
  icon,
  label,
  value,
  verified,
}: {
  icon: string
  label: string
  value: string
  verified?: boolean
}) {
  return (
    <Div className="flex items-center gap-3">
      <Icon name={icon as 'lucide:Mail'} className="w-4 h-4 text-muted-foreground shrink-0" />
      <Div className="flex-1 min-w-0">
        <P className="text-xs text-muted-foreground">{label}</P>
        <Div className="flex items-center gap-1.5">
          <Span className="text-sm text-foreground truncate">{value}</Span>
          {verified !== undefined && (
            <Icon
              name={verified ? 'lucide:CheckCircle' : 'lucide:AlertCircle'}
              className={cn(
                'w-3.5 h-3.5 shrink-0',
                verified ? 'text-primary' : 'text-muted-foreground'
              )}
            />
          )}
        </Div>
      </Div>
    </Div>
  )
}

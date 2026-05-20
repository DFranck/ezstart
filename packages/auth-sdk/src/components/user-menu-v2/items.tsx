'use client'

import { Badge, Div, type DropdownItem, Icon, Span } from '@ezstart/ui/components'
import type { AuthUser } from '../../core/types.js'
import { UserAvatar } from '../UserAvatar.js'
import { resolvePlanBadge } from './internal.js'
import type { UserMenuV2Item, UserMenuV2Texts } from './types.js'

/**
 * Inputs needed to build the authenticated `<UserMenuV2>` dropdown items.
 *
 * @internal
 */
export interface BuildUserMenuV2ItemsArgs {
  user: AuthUser
  texts: UserMenuV2Texts
  isLoggingOut: boolean
  signingOutAll: boolean
  planLabel?: string
  extraItems?: UserMenuV2Item[]
  unreadCount?: number
  helpHref?: string
  statusHref?: string
  changelogHref?: string
  commandPaletteHint?: string
  showSignOutAll: boolean
  onManageAccount?: () => void
  onOpenAccount: () => void
  onPlanClick?: () => void
  onNotificationsClick?: () => void
  onCommandPalette?: () => void
  onLogout: () => void
  onSignOutAll: () => void
}

/** Mark the most recently pushed item as a group separator boundary. @internal */
function divideAfterLast(items: DropdownItem[]): void {
  const prev = items[items.length - 1]
  if (prev) prev.divider = true
}

/** Identity card (top, non-clickable) — avatar + name + email + badges. @internal */
function buildIdentityCard(args: BuildUserMenuV2ItemsArgs): DropdownItem {
  const { user, texts, planLabel } = args
  const isVerified = Boolean((user as { isVerified?: boolean }).isVerified)
  const fullName = user.firstName
    ? `${user.firstName}${user.lastName ? ` ${user.lastName}` : ''}`
    : user.username
  const planBadge = resolvePlanBadge(user, planLabel, texts)

  return {
    label: (
      <Div className="flex flex-col gap-2 pointer-events-none">
        <Div className="flex items-center gap-3 min-w-0">
          <UserAvatar size="sm" user={user} />
          <Div className="flex flex-col min-w-0 flex-1">
            <Span className="text-sm font-medium text-foreground truncate">{fullName}</Span>
            <Span className="text-xs text-muted-foreground truncate">{user.email}</Span>
          </Div>
        </Div>
        <Div className="flex flex-wrap items-center gap-1.5">
          {isVerified ? (
            <Badge
              variant="outline"
              size="xs"
              className="bg-success/15 text-success border-success/30"
            >
              <Icon name="lucide:CheckCircle2" size={10} className="mr-1" />
              {texts.emailVerified}
            </Badge>
          ) : (
            <Badge
              variant="outline"
              size="xs"
              className="bg-warning/15 text-warning border-warning/30"
            >
              <Icon name="lucide:AlertTriangle" size={10} className="mr-1" />
              {texts.emailUnverified}
            </Badge>
          )}
          {planBadge && (
            <Badge variant={planBadge.variant} size="xs">
              {planBadge.icon && <Icon name={planBadge.icon} size={10} className="mr-1" />}
              {planBadge.label}
            </Badge>
          )}
        </Div>
      </Div>
    ),
    value: '_user-info',
    disabled: true,
    divider: true,
  }
}

/** Account + plan + notifications group. @internal */
function pushAccountGroup(items: DropdownItem[], args: BuildUserMenuV2ItemsArgs): void {
  const { texts, onManageAccount, onOpenAccount, onPlanClick, onNotificationsClick, unreadCount } =
    args

  items.push({
    label: texts.manageAccount,
    value: '_manage-account',
    icon: <Icon name="lucide:Settings" className="w-4 h-4" />,
    onSelect: () => {
      if (onManageAccount) onManageAccount()
      else onOpenAccount()
    },
  })

  if (onPlanClick) {
    items.push({
      label: texts.managePlan,
      value: '_manage-plan',
      icon: <Icon name="lucide:CreditCard" className="w-4 h-4" />,
      onSelect: onPlanClick,
    })
  }

  if (onNotificationsClick) {
    const hasUnread = typeof unreadCount === 'number' && unreadCount > 0
    items.push({
      label: (
        <Div className="flex items-center justify-between gap-2 w-full">
          <Span className="text-sm">{texts.notifications}</Span>
          {hasUnread && (
            <Badge variant="destructive" size="xs">
              {unreadCount! > 99 ? '99+' : String(unreadCount)}
            </Badge>
          )}
        </Div>
      ),
      value: '_notifications',
      icon: <Icon name="lucide:Bell" className="w-4 h-4" />,
      onSelect: onNotificationsClick,
    })
  }
}

/** Consumer-injected extra rows. @internal */
function pushExtraItems(items: DropdownItem[], extraItems?: UserMenuV2Item[]): void {
  if (!extraItems || extraItems.length === 0) return
  extraItems.forEach((item, index) => {
    if (item.separator && index > 0) divideAfterLast(items)
    items.push({
      label: item.label,
      value: `extra-${index}`,
      icon: item.icon ? <Icon name={item.icon as 'lucide:LogIn'} className="w-4 h-4" /> : undefined,
      onSelect: () => {
        if (item.onClick) item.onClick()
        if (item.href) window.location.href = item.href
      },
    })
  })
}

/** Help center + keyboard shortcuts rows (each gated). @internal */
function pushHelpRows(items: DropdownItem[], args: BuildUserMenuV2ItemsArgs): void {
  const { texts, helpHref, commandPaletteHint, onCommandPalette } = args

  if (helpHref) {
    items.push({
      label: texts.helpCenter,
      value: '_help-center',
      icon: <Icon name="lucide:HelpCircle" className="w-4 h-4" />,
      onSelect: () => {
        if (typeof window !== 'undefined') window.location.href = helpHref
      },
    })
  }

  if (onCommandPalette) {
    items.push({
      label: (
        <Div className="flex items-center justify-between gap-2 w-full">
          <Span className="text-sm">{texts.keyboardShortcuts}</Span>
          <Span className="text-xs text-muted-foreground">
            {commandPaletteHint ?? texts.keyboardShortcutsHint}
          </Span>
        </Div>
      ),
      value: '_command-palette',
      icon: <Icon name="lucide:Keyboard" className="w-4 h-4" />,
      onSelect: onCommandPalette,
    })
  }
}

/** Status + changelog rows (each gated). @internal */
function pushResourceRows(items: DropdownItem[], args: BuildUserMenuV2ItemsArgs): void {
  const { texts, statusHref, changelogHref } = args

  if (statusHref) {
    items.push({
      label: texts.status,
      value: '_status',
      icon: <Icon name="lucide:Activity" className="w-4 h-4" />,
      onSelect: () => {
        if (typeof window !== 'undefined') window.open(statusHref, '_blank', 'noopener,noreferrer')
      },
    })
  }

  if (changelogHref) {
    items.push({
      label: texts.changelog,
      value: '_changelog',
      icon: <Icon name="lucide:Sparkles" className="w-4 h-4" />,
      onSelect: () => {
        if (typeof window !== 'undefined') window.location.href = changelogHref
      },
    })
  }
}

/** Help / shortcuts / status / changelog group (each gated). @internal */
function pushHelpGroup(items: DropdownItem[], args: BuildUserMenuV2ItemsArgs): void {
  const { helpHref, statusHref, changelogHref, onCommandPalette } = args
  const hasAnyHelp = !!helpHref || !!onCommandPalette || !!statusHref || !!changelogHref
  if (hasAnyHelp) divideAfterLast(items)
  pushHelpRows(items, args)
  pushResourceRows(items, args)
}

/** Destructive sign-out group (last). @internal */
function pushSignOutGroup(items: DropdownItem[], args: BuildUserMenuV2ItemsArgs): void {
  const { texts, isLoggingOut, signingOutAll, showSignOutAll, onLogout, onSignOutAll } = args
  divideAfterLast(items)

  items.push({
    label: (
      <Span className="text-destructive">{isLoggingOut ? texts.signingOut : texts.signOut}</Span>
    ),
    value: '_sign-out',
    icon: (
      <Icon
        name={isLoggingOut ? 'fa:FaSpinner' : 'lucide:LogOut'}
        spin={isLoggingOut}
        className="w-4 h-4 text-destructive"
      />
    ),
    disabled: isLoggingOut,
    onSelect: onLogout,
  })

  if (showSignOutAll) {
    items.push({
      label: (
        <Span className="text-destructive">
          {signingOutAll ? texts.signingOut : texts.signOutAllDevices}
        </Span>
      ),
      value: '_sign-out-all',
      icon: (
        <Icon
          name={signingOutAll ? 'fa:FaSpinner' : 'lucide:LogOut'}
          spin={signingOutAll}
          className="w-4 h-4 text-destructive"
        />
      ),
      disabled: signingOutAll || isLoggingOut,
      onSelect: onSignOutAll,
    })
  }
}

/**
 * Build the full authenticated `<UserMenuV2>` dropdown items list. The order
 * (identity card → account group → extra items → help group → sign-out group)
 * and the divider boundaries are preserved exactly from the original inline
 * implementation. Personalization (theme + locale) lives in `<AccountModalV2>`,
 * not the dropdown — see the component for the rationale.
 *
 * @internal
 */
export function buildUserMenuV2Items(args: BuildUserMenuV2ItemsArgs): DropdownItem[] {
  const items: DropdownItem[] = []
  items.push(buildIdentityCard(args))
  pushAccountGroup(items, args)
  pushExtraItems(items, args.extraItems)
  pushHelpGroup(items, args)
  pushSignOutGroup(items, args)
  return items
}

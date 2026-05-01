'use client'

import { Badge, Button, Div, Icon, Span } from '@ezstart/ui/components'
import type { AuthUser } from '../../core/types.js'
import { UserAvatar } from '../UserAvatar.js'

export interface UserMenuV2TriggerProps {
  user: AuthUser | null
  isAuthenticated: boolean
  isLoggingIn: boolean
  variant: 'icon' | 'extended'
  avatarSize: 'sm' | 'md' | 'lg'
  signInLabel: string
  unreadCount?: number
  notificationsBadgeLabel?: string
  className?: string
  /**
   * Click handler. Pass `undefined` when the trigger is wrapped by `<Dropdown>`
   * (Dropdown's wrapping div handles the toggle via bubble). Pass a function
   * for the signed-out state where the trigger triggers the sign-in flow
   * directly (no Dropdown wrapper).
   */
  onClick?: () => void
}

/**
 * Single trigger component used by both auth states. Mirrors the
 * authenticated avatar layout when signed-out (placeholder icon + "Sign in"
 * label) so the chrome stays stable across auth state transitions — the
 * dropdown only mounts/unmounts its content, not the trigger itself.
 *
 * Touch target ≥ 44×44px on mobile (size=icon Button is 44×44 by default).
 *
 * Accessibility — `aria-haspopup` semantics differ by auth state:
 * - Authenticated: rendered INSIDE `<Dropdown>` whose wrapping `<div role="button">`
 *   already announces `aria-haspopup="menu"`. Adding it on the inner button
 *   creates a redundant double-announcement, so we omit it here.
 * - Not authenticated: the trigger fires `login()` which performs a hard
 *   `window.location.href` redirect to the EZAuth sign-in page — a page
 *   navigation, NOT a popup. Setting `aria-haspopup` would mislead screen
 *   readers into expecting a menu / dialog that never appears.
 *
 * @internal
 */
export function UserMenuV2Trigger({
  user,
  isAuthenticated,
  isLoggingIn,
  variant,
  avatarSize,
  signInLabel,
  unreadCount,
  notificationsBadgeLabel,
  className,
  onClick,
}: UserMenuV2TriggerProps) {
  const hasUnread = typeof unreadCount === 'number' && unreadCount > 0
  const ariaLabel = isAuthenticated && user ? 'User menu' : signInLabel
  const fullName =
    isAuthenticated && user
      ? user.firstName
        ? `${user.firstName}${user.lastName ? ` ${user.lastName}` : ''}`
        : user.username
      : signInLabel

  // ── Variant: icon ──
  if (variant === 'icon') {
    return (
      <Button
        type="button"
        variant={isAuthenticated ? 'ghost' : 'default'}
        size="icon"
        className={`relative rounded-full cursor-pointer ${className ?? ''}`.trim()}
        aria-label={ariaLabel}
        onClick={onClick}
        disabled={isLoggingIn}
      >
        {isAuthenticated && user ? (
          <UserAvatar size={avatarSize} user={user} />
        ) : (
          <Icon
            name={isLoggingIn ? 'fa:FaSpinner' : 'lucide:UserCircle2'}
            spin={isLoggingIn}
            className="w-5 h-5"
          />
        )}
        {hasUnread && (
          <Badge
            variant="destructive"
            size="xs"
            className="absolute -top-1 -right-1 h-4 min-w-[1rem] px-1 rounded-full justify-center"
            aria-label={`${unreadCount} ${notificationsBadgeLabel ?? 'unread notifications'}`}
          >
            {unreadCount! > 9 ? '9+' : String(unreadCount)}
          </Badge>
        )}
      </Button>
    )
  }

  // ── Variant: extended ──
  return (
    <Button
      type="button"
      variant={isAuthenticated ? 'ghost' : 'default'}
      className={`relative w-full justify-start h-auto py-2 px-2 cursor-pointer ${
        className ?? ''
      }`.trim()}
      aria-label={ariaLabel}
      onClick={onClick}
      disabled={isLoggingIn}
    >
      <Div className="flex items-center gap-2 w-full min-w-0">
        {isAuthenticated && user ? (
          <UserAvatar size={avatarSize} user={user} />
        ) : (
          <Div
            className={`flex items-center justify-center rounded-full ${
              avatarSize === 'lg' ? 'h-10 w-10' : avatarSize === 'sm' ? 'h-7 w-7' : 'h-8 w-8'
            }`}
          >
            <Icon
              name={isLoggingIn ? 'fa:FaSpinner' : 'lucide:UserCircle2'}
              spin={isLoggingIn}
              className="w-4 h-4"
            />
          </Div>
        )}
        <Div className="flex flex-col min-w-0 text-left flex-1">
          <Span className="text-sm font-medium truncate">{fullName}</Span>
          {isAuthenticated && user && (
            <Span className="text-xs text-muted-foreground truncate">{user.email}</Span>
          )}
        </Div>
        {hasUnread && (
          <Badge
            variant="destructive"
            size="xs"
            className="ml-1 shrink-0"
            aria-label={`${unreadCount} ${notificationsBadgeLabel ?? 'unread notifications'}`}
          >
            {unreadCount! > 9 ? '9+' : String(unreadCount)}
          </Badge>
        )}
      </Div>
    </Button>
  )
}

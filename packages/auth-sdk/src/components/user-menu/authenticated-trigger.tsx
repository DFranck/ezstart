'use client'

import { Button, Div, Span } from '@ezstart/ui/components'
import type { AuthUser } from '../../core/types.js'
import { UserAvatar } from '../UserAvatar.js'

/**
 * Props for the authenticated `<UserMenu>` (V1) dropdown trigger.
 *
 * @internal
 */
export interface UserMenuAuthenticatedTriggerProps {
  user: AuthUser
  variant: 'icon' | 'extended'
  avatarSize: 'sm' | 'md' | 'lg'
}

/**
 * Authenticated trigger for `<UserMenu>` (V1). `'extended'` renders the
 * avatar + name + email row; `'icon'` renders a round avatar-only button.
 *
 * @internal
 */
export function UserMenuAuthenticatedTrigger({
  user,
  variant,
  avatarSize,
}: UserMenuAuthenticatedTriggerProps) {
  const fullName = user.firstName
    ? `${user.firstName}${user.lastName ? ` ${user.lastName}` : ''}`
    : user.username

  if (variant === 'extended') {
    return (
      <Button
        variant="ghost"
        className="w-full justify-start h-auto py-2 px-2 cursor-pointer"
        aria-label="User menu"
      >
        <Div className="flex items-center gap-2 w-full min-w-0">
          <UserAvatar size={avatarSize} user={user} />
          <Div className="flex flex-col min-w-0 text-left">
            <Span className="text-sm font-medium truncate">{fullName}</Span>
            <Span className="text-xs text-muted-foreground truncate">{user.email}</Span>
          </Div>
        </Div>
      </Button>
    )
  }

  return (
    <Button
      variant="ghost"
      size="icon"
      className="rounded-full cursor-pointer"
      aria-label="User menu"
    >
      <UserAvatar size={avatarSize} user={user} />
    </Button>
  )
}

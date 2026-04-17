'use client'

import { Span } from '@ezstart/ui/components'
import { cn } from '@ezstart/ui/lib'
import { useAuth } from '../react/hooks.js'

export interface UserAvatarProps {
  /** Avatar size */
  size?: 'sm' | 'md' | 'lg'
  /** Additional class name */
  className?: string
  /** Override user (instead of using useAuth) */
  user?: { avatar?: string; firstName?: string; lastName?: string; username: string; email: string }
}

const sizeClasses = {
  sm: 'w-7 h-7 text-xs',
  md: 'w-9 h-9 text-sm',
  lg: 'w-16 h-16 text-xl',
} as const

function getInitials(user: {
  firstName?: string
  lastName?: string
  username: string
  email: string
}): string {
  if (user.firstName && user.lastName) {
    return `${user.firstName[0]}${user.lastName[0]}`.toUpperCase()
  }
  if (user.firstName) {
    return user.firstName.slice(0, 2).toUpperCase()
  }
  if (user.username) {
    return user.username.slice(0, 2).toUpperCase()
  }
  return user.email.slice(0, 2).toUpperCase()
}

export function UserAvatar({ size = 'md', className, user: externalUser }: UserAvatarProps) {
  const auth = useAuth()
  const user = externalUser || auth.user

  if (!user) return null

  const initials = getInitials(user)
  const sizeClass = sizeClasses[size]

  if (user.avatar) {
    return (
      <img
        src={user.avatar}
        alt={user.username}
        className={cn('rounded-full object-cover shrink-0', sizeClass, className)}
        referrerPolicy="no-referrer"
      />
    )
  }

  return (
    <Span
      className={cn(
        'rounded-full bg-primary text-primary-foreground flex items-center justify-center font-medium shrink-0 select-none',
        sizeClass,
        className
      )}
      aria-label={user.username}
    >
      {initials}
    </Span>
  )
}

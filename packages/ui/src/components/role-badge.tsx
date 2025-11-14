import React from 'react'
import { type Role } from '@ezstart/rbac'
import { getRoleLabel, getRoleBadgeClasses, getRoleIcon } from '@ezstart/rbac'
import { Badge } from './badge'
import { Icon } from './icon'
import { cn } from '../lib/utils'

export interface RoleBadgeProps {
  role: Role
  showIcon?: boolean
  className?: string
}

/**
 * RoleBadge - Display a role with appropriate styling
 *
 * Automatically applies the correct color, icon, and label based on the role.
 * Uses @ezstart/rbac helpers for consistent styling across the app.
 *
 * @example
 * ```tsx
 * <RoleBadge role="superadmin" showIcon />
 * <RoleBadge role="beta-tester" />
 * ```
 */
export const RoleBadge = React.forwardRef<HTMLSpanElement, RoleBadgeProps>(
  ({ role, showIcon = false, className }, ref) => {
    const label = getRoleLabel(role)
    const badgeClasses = getRoleBadgeClasses(role)
    const iconName = getRoleIcon(role) as any // Type casting needed for dynamic icon names

    return (
      <span ref={ref} className={cn(badgeClasses, className)}>
        {showIcon && <Icon name={iconName} className="w-3 h-3 mr-1" />}
        {label}
      </span>
    )
  }
)

RoleBadge.displayName = 'RoleBadge'

export interface RoleBadgeListProps {
  roles: Role[]
  showIcon?: boolean
  maxDisplay?: number
  className?: string
}

/**
 * RoleBadgeList - Display multiple roles as badges
 *
 * Shows roles sorted by hierarchy (highest first).
 * Can limit display count with "+N more" indicator.
 *
 * @example
 * ```tsx
 * <RoleBadgeList roles={['admin', 'manager']} showIcon />
 * <RoleBadgeList roles={user.roles} maxDisplay={2} />
 * ```
 */
export const RoleBadgeList = React.forwardRef<HTMLDivElement, RoleBadgeListProps>(
  ({ roles, showIcon = false, maxDisplay, className }, ref) => {
    if (!roles || roles.length === 0) {
      return null
    }

    const displayRoles = maxDisplay ? roles.slice(0, maxDisplay) : roles
    const remainingCount = maxDisplay && roles.length > maxDisplay ? roles.length - maxDisplay : 0

    return (
      <div ref={ref} className={cn('flex flex-wrap gap-1', className)}>
        {displayRoles.map((role) => (
          <RoleBadge key={role} role={role} showIcon={showIcon} />
        ))}
        {remainingCount > 0 && (
          <Badge variant="outline" className="text-xs">
            +{remainingCount} more
          </Badge>
        )}
      </div>
    )
  }
)

RoleBadgeList.displayName = 'RoleBadgeList'

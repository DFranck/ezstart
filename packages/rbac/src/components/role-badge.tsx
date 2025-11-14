import React from 'react'
import { Badge } from '@ezstart/ui/components'
import { type Role } from '../types.js'
import { getRoleLabel } from '../helpers.js'

// Map roles to Badge variants
const roleToBadgeVariant = {
  superadmin: 'destructive' as const,
  admin: 'warning' as const,
  manager: 'primary' as const,
  'beta-tester': 'purple' as const,
  client: 'success' as const,
}

export interface RoleBadgeProps {
  role: Role
  showIcon?: boolean
  className?: string
}

/**
 * RoleBadge - Display a role with appropriate styling
 *
 * Automatically applies the correct color, icon, and label based on the role.
 * Uses Badge component from @ezstart/ui for consistent styling.
 *
 * @example
 * ```tsx
 * <RoleBadge role="superadmin" showIcon />
 * <RoleBadge role="beta-tester" />
 * ```
 */
export const RoleBadge: React.FC<RoleBadgeProps> = ({ role, showIcon = false, className }) => {
  const label = getRoleLabel(role)
  const variant = roleToBadgeVariant[role] || 'default'

  return (
    <Badge variant={variant} size="sm" className={className}>
      {showIcon && (
        <svg
          xmlns="http://www.w3.org/2000/svg"
          width="12"
          height="12"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          className="inline-block mr-1"
          aria-hidden="true"
        >
          {/* Simple icons inline pour éviter dépendances */}
          {role === 'superadmin' && <path d="m2 4 3 12h14l3-12-6 7-4-7-4 7-6-7zm3 16h14" />}
          {role === 'admin' && <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10" />}
          {role === 'manager' && (
            <>
              <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
              <circle cx="9" cy="7" r="4" />
              <path d="M22 21v-2a4 4 0 0 0-3-3.87" />
              <path d="M16 3.13a4 4 0 0 1 0 7.75" />
            </>
          )}
          {role === 'beta-tester' && (
            <>
              <path d="M10 2v7.527a2 2 0 0 1-.211.896L4.72 20.55a1 1 0 0 0 .9 1.45h12.76a1 1 0 0 0 .9-1.45l-5.069-10.127A2 2 0 0 1 14 9.527V2" />
              <path d="M8.5 2h7" />
              <path d="M7 16h10" />
            </>
          )}
          {role === 'client' && (
            <>
              <path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2" />
              <circle cx="12" cy="7" r="4" />
            </>
          )}
        </svg>
      )}
      {label}
    </Badge>
  )
}

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
export const RoleBadgeList: React.FC<RoleBadgeListProps> = ({
  roles,
  showIcon = false,
  maxDisplay,
  className,
}) => {
  if (!roles || roles.length === 0) {
    return null
  }

  const displayRoles = maxDisplay ? roles.slice(0, maxDisplay) : roles
  const remainingCount = maxDisplay && roles.length > maxDisplay ? roles.length - maxDisplay : 0

  return (
    <div className={`flex flex-wrap gap-1 ${className || ''}`}>
      {displayRoles.map((role) => (
        <RoleBadge key={role} role={role} showIcon={showIcon} />
      ))}
      {remainingCount > 0 && (
        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border border-border text-muted-foreground">
          +{remainingCount} more
        </span>
      )}
    </div>
  )
}

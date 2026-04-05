'use client'

import type { AuthUser } from '@ezstart/auth-sdk'
import {
  Badge,
  Button,
  Div,
  Icon,
  Img,
  P,
  Span,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@ezstart/ui/components'
import { canManageUser, type useRBAC } from '@ezstart/rbac'
import { useTranslations } from 'next-intl'

interface UserManagementTableProps {
  users: AuthUser[]
  currentUser: AuthUser | null
  onEditUser: (user: AuthUser) => void
  rbac: ReturnType<typeof useRBAC>
}

export function UserManagementTable({
  users,
  currentUser,
  onEditUser,
  rbac,
}: UserManagementTableProps) {
  const t = useTranslations('admin')

  const getRoleBadge = (role: string, isGlobal = true) => {
    const variants: Record<string, 'destructive' | 'default' | 'secondary' | 'outline'> = {
      superadmin: 'destructive',
      admin: 'default',
      manager: 'secondary',
      'beta-tester': 'outline',
      client: 'outline',
    }
    return (
      <Badge variant={variants[role] || 'outline'}>
        {role}
        {!isGlobal && <Span className="ml-1 text-[10px] opacity-70">✦</Span>}
      </Badge>
    )
  }

  // Helper to get all roles (global + app-specific)
  const getAllRoles = (user: AuthUser) => {
    const roles: Array<{ role: string; isGlobal: boolean; app?: string }> = []

    // Add global roles
    if (user.globalRoles && user.globalRoles.length > 0) {
      user.globalRoles.forEach((role: string) => roles.push({ role, isGlobal: true }))
    }

    // Add app-specific roles with app name
    if (user.appRoles) {
      Object.entries(user.appRoles).forEach(([app, appRoles]) => {
        if (Array.isArray(appRoles)) {
          appRoles.forEach(role => roles.push({ role: `${role}`, isGlobal: false, app }))
        }
      })
    }

    return roles
  }

  return (
    <>
      {/* Mobile Card View (< 640px) */}
      <Div className="sm:hidden space-y-4">
        {users?.map(user => {
          const canEdit = canManageUser(currentUser, user)

          return (
            <Div key={user._id} className="border border-border rounded-lg p-4 space-y-3">
              {/* User Info */}
              <Div className="flex items-start justify-between">
                <Div className="flex items-center gap-3 flex-1">
                  {user.avatar && (
                    <Img
                      src={user.avatar}
                      alt={user.username}
                      className="w-10 h-10 rounded-full flex-shrink-0"
                    />
                  )}
                  <Div className="min-w-0 flex-1">
                    <P className="font-medium truncate">{user.username}</P>
                    {(user.firstName || user.lastName) && (
                      <P className="text-sm text-muted-foreground truncate">
                        {user.firstName} {user.lastName}
                      </P>
                    )}
                    <P className="text-xs text-muted-foreground truncate">{user.email}</P>
                  </Div>
                </Div>

                {/* Verified Badge */}
                {user.isVerified ? (
                  <Badge variant="default" className="bg-status-healthy flex-shrink-0">
                    <Icon name="lucide:Check" className="mr-1" size={12} />
                    <Span className="text-xs">{t('table.verifiedLabel')}</Span>
                  </Badge>
                ) : (
                  <Badge variant="secondary" className="flex-shrink-0">
                    <Icon name="lucide:X" className="mr-1" size={12} />
                    <Span className="text-xs">{t('table.notVerified')}</Span>
                  </Badge>
                )}
              </Div>

              {/* Roles */}
              <Div>
                <P className="text-xs font-semibold text-muted-foreground mb-1">
                  {t('table.roles')}
                </P>
                <Div className="flex flex-wrap gap-1">
                  {(() => {
                    const allRoles = getAllRoles(user)
                    if (allRoles.length === 0) {
                      return <Badge variant="outline">{t('table.noRoles')}</Badge>
                    }
                    return allRoles.map((roleInfo, idx) => (
                      <Span
                        key={`${roleInfo.role}-${roleInfo.app || 'global'}-${idx}`}
                        title={roleInfo.app ? `App: ${roleInfo.app}` : 'Global role'}
                      >
                        {getRoleBadge(roleInfo.role, roleInfo.isGlobal)}
                      </Span>
                    ))
                  })()}
                </Div>
              </Div>

              {/* Apps */}
              {user.apps && user.apps.length > 0 && (
                <Div>
                  <P className="text-xs font-semibold text-muted-foreground mb-1">
                    {t('table.apps')}
                  </P>
                  <Div className="flex flex-wrap gap-1">
                    {user.apps.slice(0, 3).map(app => (
                      <Badge key={app} variant="secondary" className="text-xs">
                        {app}
                      </Badge>
                    ))}
                    {user.apps.length > 3 && (
                      <Badge variant="outline" className="text-xs">
                        +{user.apps.length - 3}
                      </Badge>
                    )}
                  </Div>
                </Div>
              )}

              {/* Action Button */}
              <Div className="pt-2 border-t border-border">
                {canEdit ? (
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => onEditUser(user)}
                    className="w-full"
                  >
                    <Icon name="lucide:Edit" className="mr-2" />
                    {t('table.editUser')}
                  </Button>
                ) : (
                  <Button size="sm" variant="ghost" disabled className="w-full">
                    <Icon name="lucide:Lock" className="mr-2" />
                    {t('table.locked')}
                  </Button>
                )}
              </Div>
            </Div>
          )
        })}

        {users && users.length === 0 && (
          <Div className="text-center py-12 border border-border rounded-lg">
            <P className="text-muted-foreground">{t('userManagement.noUsers')}</P>
          </Div>
        )}
      </Div>

      {/* Desktop Table View (>= 640px) */}
      <Div className="hidden sm:block overflow-x-auto">
        <Table variant="hoverable">
          <TableHeader>
            <TableRow>
              <TableHead>{t('table.user')}</TableHead>
              <TableHead className="hidden sm:table-cell">{t('table.email')}</TableHead>
              <TableHead>{t('table.roles')}</TableHead>
              <TableHead className="hidden md:table-cell">{t('table.apps')}</TableHead>
              <TableHead className="hidden lg:table-cell">{t('table.verified')}</TableHead>
              <TableHead>{t('table.actions')}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {users?.map(user => {
              const canEdit = canManageUser(currentUser, user)

              return (
                <TableRow key={user._id}>
                  <TableCell>
                    <Div className="flex items-center gap-3">
                      {user.avatar && (
                        <Img
                          src={user.avatar}
                          alt={user.username}
                          className="w-8 h-8 rounded-full"
                        />
                      )}
                      <Div>
                        <P className="font-medium">{user.username}</P>
                        {(user.firstName || user.lastName) && (
                          <P className="text-sm text-muted-foreground">
                            {user.firstName} {user.lastName}
                          </P>
                        )}
                        {/* Show email on mobile */}
                        <P className="text-xs text-muted-foreground sm:hidden">{user.email}</P>
                      </Div>
                    </Div>
                  </TableCell>
                  <TableCell className="hidden sm:table-cell">
                    <P className="text-sm">{user.email}</P>
                  </TableCell>
                  <TableCell>
                    <Div className="flex flex-wrap gap-1">
                      {(() => {
                        const allRoles = getAllRoles(user)
                        if (allRoles.length === 0) {
                          return <Badge variant="outline">{t('table.noRoles')}</Badge>
                        }
                        return allRoles.map((roleInfo, idx) => (
                          <Span
                            key={`${roleInfo.role}-${roleInfo.app || 'global'}-${idx}`}
                            title={roleInfo.app ? `App: ${roleInfo.app}` : 'Global role'}
                          >
                            {getRoleBadge(roleInfo.role, roleInfo.isGlobal)}
                          </Span>
                        ))
                      })()}
                    </Div>
                  </TableCell>
                  <TableCell className="hidden md:table-cell">
                    <Div className="flex flex-wrap gap-1">
                      {user.apps && user.apps.length > 0 ? (
                        user.apps.slice(0, 3).map(app => (
                          <Badge key={app} variant="secondary" className="text-xs">
                            {app}
                          </Badge>
                        ))
                      ) : (
                        <Badge variant="outline" className="text-xs">
                          {t('table.noApps')}
                        </Badge>
                      )}
                      {user.apps && user.apps.length > 3 && (
                        <Badge variant="outline" className="text-xs">
                          +{user.apps.length - 3}
                        </Badge>
                      )}
                    </Div>
                  </TableCell>
                  <TableCell className="hidden lg:table-cell">
                    {user.isVerified ? (
                      <Badge variant="default" className="bg-status-healthy">
                        <Icon name="lucide:Check" className="mr-1" />
                        {t('table.verifiedLabel')}
                      </Badge>
                    ) : (
                      <Badge variant="secondary">
                        <Icon name="lucide:X" className="mr-1" />
                        {t('table.unverified')}
                      </Badge>
                    )}
                  </TableCell>
                  <TableCell>
                    {canEdit ? (
                      <Button size="sm" variant="outline" onClick={() => onEditUser(user)}>
                        <Icon name="lucide:Edit" className="mr-1 hidden sm:inline" />
                        <Span className="hidden sm:inline">{t('table.edit')}</Span>
                        <Icon name="lucide:Edit" className="sm:hidden" />
                      </Button>
                    ) : (
                      <Button size="sm" variant="ghost" disabled>
                        <Icon name="lucide:Lock" className="mr-1 hidden sm:inline" />
                        <Span className="hidden sm:inline">{t('table.locked')}</Span>
                        <Icon name="lucide:Lock" className="sm:hidden" />
                      </Button>
                    )}
                  </TableCell>
                </TableRow>
              )
            })}
          </TableBody>
        </Table>

        {users && users.length === 0 && (
          <Div className="text-center py-12">
            <P className="text-muted-foreground">{t('userManagement.noUsers')}</P>
          </Div>
        )}
      </Div>
    </>
  )
}

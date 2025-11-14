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

interface UserManagementTableProps {
  users: AuthUser[]
  currentUser: AuthUser | null
  onEditUser: (user: AuthUser) => void
  rbac: ReturnType<typeof useRBAC>
}

export function UserManagementTable({ users, currentUser, onEditUser, rbac }: UserManagementTableProps) {
  const getRoleBadge = (role: string) => {
    const variants: Record<string, any> = {
      superadmin: 'destructive',
      admin: 'default',
      manager: 'secondary',
      'beta-tester': 'outline',
      client: 'outline',
    }
    return <Badge variant={variants[role] || 'outline'}>{role}</Badge>
  }

  return (
    <>
      {/* Mobile Card View (< 640px) */}
      <Div className="sm:hidden space-y-4">
        {users?.map((user) => {
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
                  <Badge variant="default" className="bg-green-600 flex-shrink-0">
                    <Icon name="lucide:Check" className="mr-1" size={12} />
                    <Span className="text-xs">Verified</Span>
                  </Badge>
                ) : (
                  <Badge variant="secondary" className="flex-shrink-0">
                    <Icon name="lucide:X" className="mr-1" size={12} />
                    <Span className="text-xs">Not verified</Span>
                  </Badge>
                )}
              </Div>

              {/* Roles */}
              <Div>
                <P className="text-xs font-semibold text-muted-foreground mb-1">Roles</P>
                <Div className="flex flex-wrap gap-1">
                  {user.roles && user.roles.length > 0 ? (
                    user.roles.map((role) => (
                      <Span key={role}>{getRoleBadge(role)}</Span>
                    ))
                  ) : (
                    <Badge variant="outline">No roles</Badge>
                  )}
                </Div>
              </Div>

              {/* Apps */}
              {user.apps && user.apps.length > 0 && (
                <Div>
                  <P className="text-xs font-semibold text-muted-foreground mb-1">Apps</P>
                  <Div className="flex flex-wrap gap-1">
                    {user.apps.slice(0, 3).map((app) => (
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
                  <Button size="sm" variant="outline" onClick={() => onEditUser(user)} className="w-full">
                    <Icon name="lucide:Edit" className="mr-2" />
                    Edit User
                  </Button>
                ) : (
                  <Button size="sm" variant="ghost" disabled className="w-full">
                    <Icon name="lucide:Lock" className="mr-2" />
                    Locked
                  </Button>
                )}
              </Div>
            </Div>
          )
        })}

        {users && users.length === 0 && (
          <Div className="text-center py-12 border border-border rounded-lg">
            <P className="text-muted-foreground">No users found</P>
          </Div>
        )}
      </Div>

      {/* Desktop Table View (>= 640px) */}
      <Div className="hidden sm:block overflow-x-auto">
        <Table variant="hoverable">
          <TableHeader>
            <TableRow>
              <TableHead>User</TableHead>
              <TableHead className="hidden sm:table-cell">Email</TableHead>
              <TableHead>Roles</TableHead>
              <TableHead className="hidden md:table-cell">Apps</TableHead>
              <TableHead className="hidden lg:table-cell">Verified</TableHead>
              <TableHead>Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
          {users?.map((user) => {
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
                    {user.roles && user.roles.length > 0 ? (
                      user.roles.map((role) => (
                        <Span key={role}>{getRoleBadge(role)}</Span>
                      ))
                    ) : (
                      <Badge variant="outline">No roles</Badge>
                    )}
                  </Div>
                </TableCell>
                <TableCell className="hidden md:table-cell">
                  <Div className="flex flex-wrap gap-1">
                    {user.apps && user.apps.length > 0 ? (
                      user.apps.slice(0, 3).map((app) => (
                        <Badge key={app} variant="secondary" className="text-xs">
                          {app}
                        </Badge>
                      ))
                    ) : (
                      <Badge variant="outline" className="text-xs">
                        No apps
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
                    <Badge variant="default" className="bg-green-600">
                      <Icon name="lucide:Check" className="mr-1" />
                      Verified
                    </Badge>
                  ) : (
                    <Badge variant="secondary">
                      <Icon name="lucide:X" className="mr-1" />
                      Unverified
                    </Badge>
                  )}
                </TableCell>
                <TableCell>
                  {canEdit ? (
                    <Button size="sm" variant="outline" onClick={() => onEditUser(user)}>
                      <Icon name="lucide:Edit" className="mr-1 hidden sm:inline" />
                      <Span className="hidden sm:inline">Edit</Span>
                      <Icon name="lucide:Edit" className="sm:hidden" />
                    </Button>
                  ) : (
                    <Button size="sm" variant="ghost" disabled>
                      <Icon name="lucide:Lock" className="mr-1 hidden sm:inline" />
                      <Span className="hidden sm:inline">Locked</Span>
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
            <P className="text-muted-foreground">No users found</P>
          </Div>
        )}
      </Div>
    </>
  )
}

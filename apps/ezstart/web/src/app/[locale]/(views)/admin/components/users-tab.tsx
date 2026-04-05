'use client'

import type { AuthUser } from '@ezstart/auth-sdk'
import { useAuth } from '@ezstart/auth-sdk'
import { callApi } from '@ezstart/fetch-client'
import { canManageUser, useRBAC } from '@ezstart/rbac'
import {
  Badge,
  Button,
  Card,
  CardContent,
  CardHeader,
  type ColumnDef,
  DataTable,
  Div,
  H2,
  Icon,
  Img,
  P,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Span,
  Spinner,
} from '@ezstart/ui/components'
import { useQuery } from '@tanstack/react-query'
import { useTranslations } from 'next-intl'
import { useMemo, useState } from 'react'
import { UserEditModal } from './user-edit-modal'

interface PaginatedUsers {
  users: AuthUser[]
  pagination: {
    page: number
    limit: number
    total: number
    totalPages: number
  }
}

function getRoleBadgeVariant(role: string): 'destructive' | 'default' | 'secondary' | 'outline' {
  const variants: Record<string, 'destructive' | 'default' | 'secondary' | 'outline'> = {
    superadmin: 'destructive',
    admin: 'default',
    manager: 'secondary',
    'beta-tester': 'outline',
    client: 'outline',
  }
  return variants[role] || 'outline'
}

export function UsersTab() {
  const { user: currentUser } = useAuth()
  const t = useTranslations()
  const rbac = useRBAC(currentUser, 'ezstart')
  const [page, setPage] = useState(1)
  const limit = 50
  const [selectedUser, setSelectedUser] = useState<AuthUser | null>(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [roleFilter, setRoleFilter] = useState<string>('all')

  const {
    data,
    isLoading: loading,
    error: queryError,
    refetch,
  } = useQuery({
    queryKey: ['admin', 'users', page, limit, searchQuery, roleFilter],
    queryFn: async () => {
      const query: Record<string, string> = {
        page: String(page),
        limit: String(limit),
      }

      if (searchQuery) query.search = searchQuery
      if (roleFilter && roleFilter !== 'all') query.role = roleFilter

      const response = await callApi<PaginatedUsers>('/admin/users', {
        appName: 'ezauth',
        query,
      })

      if (response.ok && response.data) {
        return response.data
      }

      const errorMsg =
        response.status === 401
          ? 'Unauthorized - Please login again'
          : response.status === 403
            ? 'Forbidden - Admin access required'
            : `Failed to fetch users (${response.status})`
      throw new Error(errorMsg)
    },
    staleTime: 30000,
  })

  const users = data?.users ?? []
  const pagination = data?.pagination ?? { page: 1, limit, total: 0, totalPages: 0 }
  const error = queryError?.message ?? null

  const columns: ColumnDef<AuthUser>[] = useMemo(
    () => [
      {
        id: 'user',
        header: t('admin.table.user'),
        accessorFn: row => row.username,
        cell: ({ row }) => {
          const u = row.original
          return (
            <Div className="flex items-center gap-3">
              {u.avatar && (
                <Img
                  src={u.avatar}
                  alt={u.username}
                  className="w-8 h-8 rounded-full flex-shrink-0"
                />
              )}
              <Div className="min-w-0">
                <P className="font-medium truncate">{u.username}</P>
                <P className="text-xs text-muted-foreground truncate">{u.email}</P>
              </Div>
            </Div>
          )
        },
      },
      {
        id: 'globalRoles',
        header: t('admin.table.roles'),
        enableSorting: false,
        cell: ({ row }) => {
          const globalRoles = row.original.globalRoles ?? []
          if (globalRoles.length === 0) return null
          return (
            <Div className="flex flex-wrap gap-1">
              {globalRoles.map(role => (
                <Badge key={role} variant={getRoleBadgeVariant(role)}>
                  {role}
                </Badge>
              ))}
            </Div>
          )
        },
      },
      {
        id: 'appRoles',
        header: t('admin.table.apps'),
        enableSorting: false,
        cell: ({ row }) => {
          const appRoles = row.original.appRoles ?? {}
          const entries = Object.entries(appRoles).filter(
            ([, roles]) => Array.isArray(roles) && roles.length > 0
          )
          if (entries.length === 0) {
            return (
              <Badge variant="outline" className="text-xs">
                {t('admin.table.noApps')}
              </Badge>
            )
          }
          return (
            <Div className="flex flex-wrap gap-1">
              {entries.map(([app, roles]) => (
                <Badge key={app} variant="secondary" className="text-xs" title={roles.join(', ')}>
                  {app}
                  <Span className="ml-1 text-[10px] opacity-70">({roles.join(', ')})</Span>
                </Badge>
              ))}
            </Div>
          )
        },
      },
      {
        accessorKey: 'isVerified',
        header: t('admin.table.verified'),
        cell: ({ row }) =>
          row.original.isVerified ? (
            <Icon name="lucide:Check" className="text-emerald-500" />
          ) : (
            <Icon name="lucide:X" className="text-muted-foreground" />
          ),
      },
      {
        accessorKey: 'createdAt',
        header: t('admin.table.createdAt'),
        cell: ({ row }) => (
          <P className="text-sm text-muted-foreground">
            {new Date(row.original.createdAt).toLocaleDateString()}
          </P>
        ),
      },
      {
        id: 'actions',
        header: t('admin.table.actions'),
        enableSorting: false,
        cell: ({ row }) => {
          const u = row.original
          const canEdit = canManageUser(currentUser, u)
          return canEdit ? (
            <Button size="sm" variant="outline" onClick={() => setSelectedUser(u)}>
              <Icon name="lucide:Edit" className="mr-1" />
              {t('admin.table.edit')}
            </Button>
          ) : (
            <Button size="sm" variant="ghost" disabled>
              <Icon name="lucide:Lock" className="mr-1" />
              {t('admin.table.locked')}
            </Button>
          )
        },
      },
    ],
    [t, currentUser]
  )

  return (
    <>
      <Card>
        <CardHeader>
          <H2>{t('admin.userManagement.title')}</H2>
        </CardHeader>
        <CardContent>
          {loading && <Spinner size="lg" />}

          {error && (
            <Div className="bg-destructive/10 text-destructive px-4 py-3 rounded-md mb-4">
              <P className="font-medium">{t('admin.userManagement.errorLoading')}</P>
              <P className="text-sm mt-1">{error}</P>
            </Div>
          )}

          {!loading && !error && (
            <>
              {/* Filters */}
              <Div className="mb-6 flex gap-4 flex-wrap">
                <Select value={roleFilter || 'all'} onValueChange={setRoleFilter}>
                  <SelectTrigger className="w-[180px]">
                    <SelectValue placeholder={t('admin.userManagement.allRoles')} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">{t('admin.userManagement.allRoles')}</SelectItem>
                    <SelectItem value="superadmin">
                      {t('admin.userManagement.roles.superadmin')}
                    </SelectItem>
                    <SelectItem value="admin">{t('admin.userManagement.roles.admin')}</SelectItem>
                    <SelectItem value="manager">
                      {t('admin.userManagement.roles.manager')}
                    </SelectItem>
                    <SelectItem value="beta-tester">
                      {t('admin.userManagement.roles.betaTester')}
                    </SelectItem>
                    <SelectItem value="client">
                      {t('admin.userManagement.roles.client')}
                    </SelectItem>
                  </SelectContent>
                </Select>
                <Button onClick={() => refetch()} variant="outline">
                  {t('admin.userManagement.refresh')}
                </Button>
              </Div>

              {/* Users DataTable */}
              <DataTable
                columns={columns}
                data={users}
                filterColumn="user"
                filterPlaceholder={t('admin.userManagement.searchPlaceholder')}
                pageSize={limit}
                hidePagination
              />

              {/* Server-side pagination */}
              <Div className="mt-6 flex items-center justify-between">
                <P className="text-sm text-muted-foreground">
                  {t('admin.userManagement.showing', {
                    count: users?.length ?? 0,
                    total: pagination?.total ?? 0,
                  })}
                </P>
                <Div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={pagination.page === 1}
                    onClick={() => setPage(p => p - 1)}
                  >
                    {t('admin.userManagement.previous')}
                  </Button>
                  <P className="text-sm py-2 px-3">
                    {t('admin.userManagement.pageOf', {
                      page: pagination.page,
                      totalPages: pagination.totalPages || 1,
                    })}
                  </P>
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={pagination.page === pagination.totalPages}
                    onClick={() => setPage(p => p + 1)}
                  >
                    {t('admin.userManagement.next')}
                  </Button>
                </Div>
              </Div>
            </>
          )}
        </CardContent>
      </Card>

      {/* Edit User Modal */}
      {selectedUser && (
        <UserEditModal
          user={selectedUser}
          currentUser={currentUser}
          rbac={rbac}
          onClose={() => setSelectedUser(null)}
          onSave={() => {
            setSelectedUser(null)
            refetch()
          }}
        />
      )}
    </>
  )
}

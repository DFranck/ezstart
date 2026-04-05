'use client'

import type { AuthUser } from '@ezstart/auth-sdk'
import { useAuth } from '@ezstart/auth-sdk'
import { callApi } from '@ezstart/fetch-client'
import { useRBAC } from '@ezstart/rbac'
import {
  Badge,
  Button,
  Card,
  CardContent,
  CardHeader,
  Div,
  H2,
  Input,
  P,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Spinner,
} from '@ezstart/ui/components'
import { useQuery } from '@tanstack/react-query'
import { useTranslations } from 'next-intl'
import { useState } from 'react'
import { UserEditModal } from './user-edit-modal'
import { UserManagementTable } from './user-management-table'

interface PaginatedUsers {
  users: AuthUser[]
  pagination: {
    page: number
    limit: number
    total: number
    totalPages: number
  }
}

export function UsersTab() {
  const { user } = useAuth()
  const t = useTranslations()
  const rbac = useRBAC(user, 'ezstart')
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
                <Input
                  type="text"
                  placeholder={t('admin.userManagement.searchPlaceholder')}
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  className="flex-1 min-w-[200px]"
                />
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
                    <SelectItem value="client">{t('admin.userManagement.roles.client')}</SelectItem>
                  </SelectContent>
                </Select>
                <Button onClick={() => refetch()} variant="outline">
                  {t('admin.userManagement.refresh')}
                </Button>
              </Div>

              {/* Users Table */}
              <UserManagementTable
                users={users}
                currentUser={user}
                onEditUser={setSelectedUser}
                rbac={rbac}
              />

              {/* Pagination */}
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
          currentUser={user}
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

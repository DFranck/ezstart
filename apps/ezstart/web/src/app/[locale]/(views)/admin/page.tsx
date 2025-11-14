'use client'

import type { AuthUser } from '@ezstart/auth-sdk'
import { RequireAuth, AccessDenied, LoginButton } from '@ezstart/auth-sdk'
import { callApi } from '@ezstart/fetch-client'
import { useRBAC, RequireRole, InsufficientPermissions } from '@ezstart/rbac'
import {
  Badge,
  Button,
  Card,
  CardContent,
  CardHeader,
  Div,
  H1,
  H2,
  Input,
  P,
  Section,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Spinner,
} from '@ezstart/ui/components'
import { useTranslations } from 'next-intl'
import { useEffect, useState } from 'react'
import { UserEditModal } from './components/user-edit-modal'
import { UserManagementTable } from './components/user-management-table'
import { useAuth } from '@ezstart/auth-sdk'

interface PaginatedUsers {
  users: AuthUser[]
  pagination: {
    page: number
    limit: number
    total: number
    totalPages: number
  }
}

function AdminPanelContent() {
  const { user } = useAuth()
  const t = useTranslations()
  const rbac = useRBAC(user, 'ezstart') // Pass appName for app-specific checks
  const [users, setUsers] = useState<AuthUser[]>([])
  const [pagination, setPagination] = useState({ page: 1, limit: 50, total: 0, totalPages: 0 })
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [selectedUser, setSelectedUser] = useState<AuthUser | null>(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [roleFilter, setRoleFilter] = useState<string>('all')

  // Fetch users function using callApi
  const fetchUsers = async (page = 1) => {
    try {
      setLoading(true)
      setError(null)

      const query: Record<string, any> = {
        page: page.toString(),
        limit: pagination.limit.toString(),
      }

      if (searchQuery) query.search = searchQuery
      if (roleFilter && roleFilter !== 'all') query.role = roleFilter

      const response = await callApi<PaginatedUsers>('/admin/users', {
        appName: 'ezauth',
        query,
      })

      if (response.ok && response.data) {
        setUsers(response.data.users)
        setPagination(response.data.pagination)
      } else {
        const errorMsg =
          response.status === 401
            ? 'Unauthorized - Please login again'
            : response.status === 403
              ? 'Forbidden - Admin access required'
              : `Failed to fetch users (${response.status})`
        throw new Error(errorMsg)
      }
    } catch (err: any) {
      setError(err.message)
      console.error('Error fetching users:', err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchUsers()
  }, [searchQuery, roleFilter])

  return (
    <Div size={'xs'}>
      <Section size={'xl'} className="mt-10">
        <H1>Admin Panel</H1>
        <P className="text-muted-foreground mt-2">
          Manage users, roles, permissions, and features across the @ezstart monorepo
        </P>
      </Section>

      <Card>
        <CardHeader>
          <H2>User Management</H2>
        </CardHeader>
        <CardContent>
          {loading && <Spinner size="lg" />}

          {error && (
            <Div className="bg-destructive/10 text-destructive px-4 py-3 rounded-md mb-4">
              <P className="font-medium">Error loading users</P>
              <P className="text-sm mt-1">{error}</P>
            </Div>
          )}

          {!loading && !error && (
            <>
              {/* Filters */}
              <Div className="mb-6 flex gap-4 flex-wrap">
                <Input
                  type="text"
                  placeholder="Search by email, username, name..."
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  className="flex-1 min-w-[200px]"
                />
                <Select value={roleFilter || 'all'} onValueChange={setRoleFilter}>
                  <SelectTrigger className="w-[180px]">
                    <SelectValue placeholder="All Roles" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Roles</SelectItem>
                    <SelectItem value="superadmin">Superadmin</SelectItem>
                    <SelectItem value="admin">Admin</SelectItem>
                    <SelectItem value="manager">Manager</SelectItem>
                    <SelectItem value="beta-tester">Beta Tester</SelectItem>
                    <SelectItem value="client">Client</SelectItem>
                  </SelectContent>
                </Select>
                <Button onClick={() => fetchUsers(1)} variant="outline">
                  Refresh
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
                  Showing {users?.length ?? 0} of {pagination?.total ?? 0} users
                </P>
                <Div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={!pagination || pagination.page === 1}
                    onClick={() => fetchUsers((pagination?.page ?? 1) - 1)}
                  >
                    Previous
                  </Button>
                  <P className="text-sm py-2 px-3">
                    Page {pagination?.page ?? 1} of {pagination?.totalPages ?? 1}
                  </P>
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={!pagination || pagination.page === pagination.totalPages}
                    onClick={() => fetchUsers((pagination?.page ?? 1) + 1)}
                  >
                    Next
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
            fetchUsers(pagination.page)
          }}
        />
      )}
    </Div>
  )
}

export default function AdminPage() {
  const t = useTranslations()

  return (
    <RequireAuth
      loadingComponent={
        <Section size="full">
          <Spinner size="lg" />
        </Section>
      }
      fallbackComponent={
        <Section size="full">
          <Card variant={'ghost'}>
            <AccessDenied>
              <LoginButton>{t('auth.login')}</LoginButton>
            </AccessDenied>
          </Card>
        </Section>
      }
    >
      <RequireRole
        roles="superadmin"
        fallbackComponent={
          <Section size={'full'}>
            <Card variant={'ghost'}>
              <InsufficientPermissions requiredRoles="superadmin" />
            </Card>
          </Section>
        }
      >
        <AdminPanelContent />
      </RequireRole>
    </RequireAuth>
  )
}

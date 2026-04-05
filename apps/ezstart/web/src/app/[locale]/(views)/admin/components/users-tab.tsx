'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { useTranslations } from 'next-intl'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  Badge,
  Button,
  Card,
  Div,
  Input,
  P,
  Skeleton,
  Span,
  Spinner,
  DataTable,
  DataTableColumnHeader,
  type ColumnDef,
} from '@ezstart/ui/components'
import { callApi, parseApiError } from '@ezstart/fetch-client'
import { EditRolesModal } from './edit-roles-modal'

// ========================================
// Types
// ========================================

interface AdminUser {
  _id: string
  email: string
  username: string
  globalRoles: string[]
  appRoles: Record<string, string[]>
  createdAt: string
}

interface UsersResponse {
  data: AdminUser[]
  meta: { total: number; limit: number; offset: number }
}

// ========================================
// Constants
// ========================================

const PAGE_SIZE = 20

// ========================================
// Helpers
// ========================================

function formatDate(dateStr: string): string {
  return new Intl.DateTimeFormat('en-US', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(new Date(dateStr))
}

// ========================================
// Component
// ========================================

export function UsersTab() {
  const t = useTranslations('admin.users')
  const td = useTranslations('admin.dialog')
  const tr = useTranslations('admin.roles')

  // Data state
  const [users, setUsers] = useState<AdminUser[]>([])
  const [loading, setLoading] = useState(true)
  const [total, setTotal] = useState(0)
  const [offset, setOffset] = useState(0)

  // Search state
  const [searchInput, setSearchInput] = useState('')
  const [searchQuery, setSearchQuery] = useState('')
  const searchTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Modal/dialog state
  const [editUser, setEditUser] = useState<AdminUser | null>(null)
  const [editOpen, setEditOpen] = useState(false)
  const [deleteDialog, setDeleteDialog] = useState<{ open: boolean; userId: string | null }>({
    open: false,
    userId: null,
  })

  // Debounced search
  const handleSearchChange = useCallback((value: string) => {
    setSearchInput(value)
    if (searchTimerRef.current) clearTimeout(searchTimerRef.current)
    searchTimerRef.current = setTimeout(() => {
      setSearchQuery(value)
      setOffset(0)
    }, 400)
  }, [])

  useEffect(() => {
    return () => {
      if (searchTimerRef.current) clearTimeout(searchTimerRef.current)
    }
  }, [])

  // Fetch users
  const fetchUsers = useCallback(async () => {
    setLoading(true)
    try {
      const query: Record<string, string> = {
        limit: String(PAGE_SIZE),
        offset: String(offset),
      }
      if (searchQuery) query.search = searchQuery

      const response = await callApi<UsersResponse>('/admin/users', {
        appName: 'ezauth',
        method: 'GET',
        query,
      })
      if (response.ok) {
        const result = response.data as { users?: AdminUser[]; pagination?: { total: number } }
        setUsers(result.users || [])
        setTotal(result.pagination?.total ?? 0)
      }
    } catch {
      // Error logged by callApi
    } finally {
      setLoading(false)
    }
  }, [offset, searchQuery])

  useEffect(() => {
    fetchUsers()
  }, [fetchUsers])

  // Delete state
  const [deleting, setDeleting] = useState(false)
  const [deleteError, setDeleteError] = useState('')

  // Delete handler
  const handleDeleteConfirm = useCallback(async () => {
    if (!deleteDialog.userId) return
    setDeleting(true)
    setDeleteError('')
    try {
      const response = await callApi(`/admin/users/${deleteDialog.userId}`, {
        appName: 'ezauth',
        method: 'DELETE',
      })
      if (!response.ok) {
        throw new Error(response.error || parseApiError(response.data) || t('deleteError'))
      }
      setDeleteDialog({ open: false, userId: null })
      fetchUsers()
    } catch (err) {
      setDeleteError(err instanceof Error ? err.message : t('deleteError'))
    } finally {
      setDeleting(false)
    }
  }, [deleteDialog.userId, fetchUsers, t])

  // Edit handler
  const handleEditClick = useCallback((user: AdminUser) => {
    setEditUser(user)
    setEditOpen(true)
  }, [])

  // DataTable columns
  const columns: ColumnDef<AdminUser>[] = [
    {
      accessorKey: 'email',
      header: ({ header }) => <DataTableColumnHeader header={header} title={t('columns.email')} />,
      cell: ({ row }) => <Span className="text-sm font-medium">{row.original.email}</Span>,
    },
    {
      accessorKey: 'username',
      header: ({ header }) => (
        <DataTableColumnHeader header={header} title={t('columns.username')} />
      ),
      cell: ({ row }) => <Span className="text-sm">{row.original.username}</Span>,
    },
    {
      accessorKey: 'globalRoles',
      header: ({ header }) => (
        <DataTableColumnHeader header={header} title={t('columns.globalRoles')} />
      ),
      cell: ({ row }) => (
        <Div className="flex flex-wrap gap-1">
          {row.original.globalRoles.map(role => (
            <Badge
              key={role}
              variant={role === 'superadmin' ? 'destructive' : 'secondary'}
              size="sm"
            >
              {tr(role as 'superadmin' | 'admin' | 'manager' | 'beta-tester' | 'client')}
            </Badge>
          ))}
        </Div>
      ),
    },
    {
      accessorKey: 'appRoles',
      header: ({ header }) => (
        <DataTableColumnHeader header={header} title={t('columns.appRoles')} />
      ),
      cell: ({ row }) => {
        const entries = Object.entries(row.original.appRoles)
        if (entries.length === 0) return <Span className="text-muted-foreground text-sm">-</Span>
        return (
          <Div className="flex flex-wrap gap-1">
            {entries.map(([app, roles]) =>
              roles.map(role => (
                <Badge key={`${app}-${role}`} variant="outline" size="sm">
                  {app}:{role}
                </Badge>
              ))
            )}
          </Div>
        )
      },
    },
    {
      accessorKey: 'createdAt',
      header: ({ header }) => (
        <DataTableColumnHeader header={header} title={t('columns.createdAt')} />
      ),
      cell: ({ row }) => <Span className="text-sm">{formatDate(row.original.createdAt)}</Span>,
    },
    {
      id: 'actions',
      header: t('columns.actions'),
      cell: ({ row }) => (
        <Div className="flex gap-1">
          <Button variant="outline" size="sm" onClick={() => handleEditClick(row.original)}>
            {t('edit')}
          </Button>
          <Button
            variant="destructive"
            size="sm"
            onClick={() => setDeleteDialog({ open: true, userId: row.original._id })}
          >
            {t('delete')}
          </Button>
        </Div>
      ),
    },
  ]

  // Stats computed from current data
  const superadminCount = users.filter(u => u.globalRoles.includes('superadmin')).length
  const adminCount = users.filter(u => u.globalRoles.includes('admin')).length
  const withAppRoles = users.filter(u => Object.keys(u.appRoles).length > 0).length

  return (
    <Div className="space-y-4">
      {/* Stats */}
      <Div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <Card className="p-4">
          <P className="text-sm text-muted-foreground">{t('stats.totalUsers')}</P>
          <P className="text-2xl font-bold">{total}</P>
        </Card>
        <Card className="p-4">
          <P className="text-sm text-muted-foreground">{t('stats.superadmins')}</P>
          <P className="text-2xl font-bold">{superadminCount}</P>
        </Card>
        <Card className="p-4">
          <P className="text-sm text-muted-foreground">{t('stats.admins')}</P>
          <P className="text-2xl font-bold">{adminCount}</P>
        </Card>
        <Card className="p-4">
          <P className="text-sm text-muted-foreground">{t('stats.withAppRoles')}</P>
          <P className="text-2xl font-bold">{withAppRoles}</P>
        </Card>
      </Div>

      {/* Search */}
      <Input
        placeholder={t('searchPlaceholder')}
        value={searchInput}
        onChange={e => handleSearchChange(e.target.value)}
        className="w-full sm:w-80"
      />

      {/* Table */}
      {loading ? (
        <Card className="p-8">
          <Div className="space-y-3">
            {Array.from({ length: 5 }).map((_, i) => (
              <Skeleton key={i} className="h-10 w-full" />
            ))}
          </Div>
        </Card>
      ) : users.length === 0 ? (
        <Card className="p-8">
          <P className="text-center text-muted-foreground">{t('noUsers')}</P>
        </Card>
      ) : (
        <DataTable columns={columns} data={users} pageSize={PAGE_SIZE} />
      )}

      {/* Server-side pagination info */}
      {!loading && total > PAGE_SIZE && (
        <Div className="flex items-center justify-between">
          <P className="text-sm text-muted-foreground">
            {offset + 1}-{Math.min(offset + PAGE_SIZE, total)} / {total}
          </P>
          <Div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              disabled={offset === 0}
              onClick={() => setOffset(prev => Math.max(0, prev - PAGE_SIZE))}
            >
              &larr;
            </Button>
            <Button
              variant="outline"
              size="sm"
              disabled={offset + PAGE_SIZE >= total}
              onClick={() => setOffset(prev => prev + PAGE_SIZE)}
            >
              &rarr;
            </Button>
          </Div>
        </Div>
      )}

      {/* Edit Roles Modal */}
      <EditRolesModal
        user={editUser}
        open={editOpen}
        onOpenChange={setEditOpen}
        onSaved={fetchUsers}
      />

      {/* Delete Confirmation Dialog */}
      <AlertDialog
        variant="destructive"
        open={deleteDialog.open}
        onOpenChange={(open: boolean) => {
          if (!deleting) setDeleteDialog(prev => ({ ...prev, open }))
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t('confirmDeleteTitle')}</AlertDialogTitle>
            <AlertDialogDescription>{t('confirmDeleteDescription')}</AlertDialogDescription>
          </AlertDialogHeader>
          {deleteError && (
            <Div className="bg-destructive/15 border border-destructive/50 text-destructive px-4 py-3 rounded-md text-sm">
              {deleteError}
            </Div>
          )}
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleting}>{td('cancel')}</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteConfirm} disabled={deleting}>
              {deleting ? <Spinner size="sm" /> : td('confirm')}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Div>
  )
}

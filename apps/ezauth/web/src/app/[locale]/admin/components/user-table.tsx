'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useTranslations, useLocale } from 'next-intl'
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
import { toast } from '@ezstart/ui/utils'
import { callApi, parseApiError } from '@ezstart/fetch-client'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { EditRolesModal } from './edit-roles-modal'
import { AuthErrorBanner } from '@/components/AuthErrorBanner'

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

interface ListUsersMeta {
  total: number
  limit: number
  offset: number
}

// ========================================
// Constants
// ========================================

const PAGE_SIZE = 20

// ========================================
// Component
// ========================================

export function UserTable() {
  const t = useTranslations('admin.users')
  const td = useTranslations('admin.dialog')
  const tr = useTranslations('admin.roles')
  const tp = useTranslations('admin.pagination')
  const locale = useLocale()
  const queryClient = useQueryClient()

  // Pagination + search state
  const [offset, setOffset] = useState(0)
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

  // React Query: fetch users (new API format { data, meta })
  const {
    data: usersData,
    isLoading,
    isError,
    refetch,
  } = useQuery({
    queryKey: ['admin', 'users', offset, searchQuery],
    queryFn: async () => {
      const query: Record<string, string> = {
        limit: String(PAGE_SIZE),
        offset: String(offset),
      }
      if (searchQuery) query.search = searchQuery

      const response = await callApi<AdminUser[]>('/admin/users', {
        appName: 'ezauth',
        method: 'GET',
        query,
      })
      if (!response.ok) {
        throw new Error(response.error || parseApiError(response.data) || t('fetchError'))
      }
      return {
        users: (response.data ?? []) as AdminUser[],
        meta: (response.meta ?? { total: 0, limit: PAGE_SIZE, offset }) as ListUsersMeta,
      }
    },
  })

  const users = usersData?.users ?? []
  const total = usersData?.meta.total ?? 0

  // Delete mutation
  const deleteMutation = useMutation({
    mutationFn: async (userId: string) => {
      const response = await callApi(`/admin/users/${userId}`, {
        appName: 'ezauth',
        method: 'DELETE',
      })
      if (!response.ok) {
        throw new Error(response.error || parseApiError(response.data) || t('deleteError'))
      }
    },
    onSuccess: () => {
      toast.success(t('deleteSuccess'))
      setDeleteDialog({ open: false, userId: null })
      queryClient.invalidateQueries({ queryKey: ['admin', 'users'] })
    },
    onError: (err: Error) => {
      toast.error(err.message || t('deleteError'))
    },
  })

  const handleDeleteConfirm = useCallback(() => {
    if (deleteDialog.userId) {
      deleteMutation.mutate(deleteDialog.userId)
    }
  }, [deleteDialog.userId, deleteMutation])

  // Edit handler
  const handleEditClick = useCallback((user: AdminUser) => {
    setEditUser(user)
    setEditOpen(true)
  }, [])

  // Locale-aware date formatter
  const formatDate = useCallback(
    (dateStr: string): string =>
      new Intl.DateTimeFormat(locale, {
        dateStyle: 'medium',
        timeStyle: 'short',
      }).format(new Date(dateStr)),
    [locale]
  )

  // DataTable columns
  const columns: ColumnDef<AdminUser>[] = useMemo(
    () => [
      {
        accessorKey: 'email',
        header: ({ header }) => (
          <DataTableColumnHeader header={header} title={t('columns.email')} />
        ),
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
        id: 'roles',
        header: t('columns.roles'),
        enableSorting: false,
        cell: ({ row }) => {
          const global = row.original.globalRoles
          const appEntries = Object.entries(row.original.appRoles)
          if (global.length === 0 && appEntries.length === 0) {
            return <Span className="text-muted-foreground text-sm">-</Span>
          }
          return (
            <Div className="flex flex-wrap gap-1">
              {global.map(role => (
                <Badge
                  key={role}
                  variant={role === 'superadmin' ? 'destructive' : 'secondary'}
                  size="sm"
                >
                  {tr(role as 'superadmin' | 'admin' | 'manager' | 'beta-tester' | 'client')}
                </Badge>
              ))}
              {appEntries.map(([app, roles]) =>
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
    ],
    [t, tr, formatDate, handleEditClick]
  )

  const deleting = deleteMutation.isPending
  const endIndex = Math.min(offset + PAGE_SIZE, total)

  return (
    <Div className="space-y-4">
      {/* Search */}
      <Input
        placeholder={t('searchPlaceholder')}
        value={searchInput}
        onChange={e => handleSearchChange(e.target.value)}
        className="w-full sm:w-80"
      />

      {/* Error state */}
      {isError && (
        <Card className="p-6">
          <Div className="space-y-3 text-center">
            <P className="text-destructive text-sm">{t('fetchError')}</P>
            <Button variant="outline" size="sm" onClick={() => refetch()}>
              {td('retry')}
            </Button>
          </Div>
        </Card>
      )}

      {/* Table */}
      {!isError && isLoading ? (
        <Card className="p-8">
          <Div className="space-y-3">
            {Array.from({ length: 5 }).map((_, i) => (
              <Skeleton key={i} className="h-10 w-full" />
            ))}
          </Div>
        </Card>
      ) : !isError && users.length === 0 ? (
        <Card className="p-8">
          <P className="text-center text-muted-foreground">{t('noUsers')}</P>
        </Card>
      ) : !isError ? (
        <DataTable columns={columns} data={users} pageSize={PAGE_SIZE} />
      ) : null}

      {/* Server-side pagination */}
      {!isLoading && !isError && total > PAGE_SIZE && (
        <Div className="flex items-center justify-between">
          <P className="text-sm text-muted-foreground">
            {tp('showing', { from: offset + 1, to: endIndex, total })}
          </P>
          <Div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              disabled={offset === 0}
              onClick={() => setOffset(prev => Math.max(0, prev - PAGE_SIZE))}
            >
              {tp('previous')}
            </Button>
            <Button
              variant="outline"
              size="sm"
              disabled={offset + PAGE_SIZE >= total}
              onClick={() => setOffset(prev => prev + PAGE_SIZE)}
            >
              {tp('next')}
            </Button>
          </Div>
        </Div>
      )}

      {/* Edit Roles Modal */}
      <EditRolesModal
        user={editUser}
        open={editOpen}
        onOpenChange={setEditOpen}
        onSaved={() => queryClient.invalidateQueries({ queryKey: ['admin', 'users'] })}
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
          {deleteMutation.isError && (
            <AuthErrorBanner>
              {deleteMutation.error instanceof Error
                ? deleteMutation.error.message
                : t('deleteError')}
            </AuthErrorBanner>
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

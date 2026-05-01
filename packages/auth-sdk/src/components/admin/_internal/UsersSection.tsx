'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  Button,
  Div,
  Input,
  P,
  Spinner,
} from '@ezstart/ui/components'
import { apiCall, type ApiMeta } from '@ezstart/api-sdk'
import { toast } from '@ezstart/ui/utils'
import { useAuthStore } from '../../../react/auth-provider.js'
import { AdminStatsCards } from '../AdminStatsCards.js'
import { AdminUsersTable } from '../AdminUsersTable.js'
import { EditUserModal } from '../EditUserModal.js'
import {
  ADMIN_PAGE_SIZE,
  type AdminUser,
  type AuthUsersSectionTexts,
  DEFAULT_USERS_TEXTS,
  isAdminUserOnline,
  type UsersApiMeta,
} from '../types.js'

export interface AuthUsersSectionProps {
  className?: string
  texts?: Partial<AuthUsersSectionTexts>
}

/**
 * Internal users-management section embedded in `<AuthAdminDashboard>`.
 *
 * Auto-scoped server-side via `req.derivedScope` (JWT-derived):
 * - superadmin -> all users
 * - app admin   -> users of owned Applications
 * - user        -> own account only
 *
 * No client-side scope props — the API derives scope from the JWT carried
 * by the surrounding `<AuthProvider>`. Federated admin is configured at
 * the Provider level (apiUrl), not per-component.
 *
 * @internal
 */
export function AuthUsersSection({ className, texts }: AuthUsersSectionProps) {
  const t: Required<AuthUsersSectionTexts> = { ...DEFAULT_USERS_TEXTS, ...texts }
  const storeAccessToken = useAuthStore(state => state.accessToken)

  const getToken = useCallback(async (): Promise<string | null> => {
    return storeAccessToken
  }, [storeAccessToken])

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

  // Fetch users — backend derives scope from JWT automatically.
  const fetchUsers = useCallback(async () => {
    setLoading(true)
    try {
      const query: Record<string, string> = {
        limit: String(ADMIN_PAGE_SIZE),
        offset: String(offset),
      }
      if (searchQuery) query.search = searchQuery

      const envelope = await apiCall<{ data: AdminUser[]; meta?: ApiMeta }>('/admin/users', {
        appName: 'ezauth',
        method: 'GET',
        query,
        getToken,
        preserveEnvelope: true,
      })
      const fetchedUsers = envelope.data ?? []
      setUsers(fetchedUsers)
      const meta = envelope.meta as UsersApiMeta | undefined
      setTotal(meta?.total ?? 0)
    } catch {
      // Error already logged by apiCall
    } finally {
      setLoading(false)
    }
  }, [offset, searchQuery, getToken])

  useEffect(() => {
    fetchUsers()
  }, [fetchUsers])

  // Delete state
  const [deleting, setDeleting] = useState(false)
  const [deleteError, setDeleteError] = useState('')

  const handleDeleteConfirm = useCallback(async () => {
    if (!deleteDialog.userId) return
    setDeleting(true)
    setDeleteError('')
    try {
      await apiCall(`/admin/users/${deleteDialog.userId}`, {
        appName: 'ezauth',
        method: 'DELETE',
        getToken,
      })
      toast.success(t.deleteSuccess)
      setDeleteDialog({ open: false, userId: null })
      fetchUsers()
    } catch (err) {
      const message = err instanceof Error ? err.message : t.deleteError
      setDeleteError(message)
      toast.error(t.deleteError)
    } finally {
      setDeleting(false)
    }
  }, [deleteDialog.userId, fetchUsers, t, getToken])

  const handleEditClick = useCallback((user: AdminUser) => {
    setEditUser(user)
    setEditOpen(true)
  }, [])

  // Stats computed from current page data
  const superadminCount = users.filter(u => u.globalRoles?.includes('superadmin')).length
  const adminCount = users.filter(u => u.globalRoles?.includes('admin')).length
  const withAppRoles = users.filter(u => Object.keys(u.appRoles || {}).length > 0).length
  const onlineCount = users.filter(u => isAdminUserOnline(u.lastActiveAt)).length

  return (
    <Div className={className}>
      <Div className="space-y-4">
        <AdminStatsCards
          total={total}
          onlineCount={onlineCount}
          superadminCount={superadminCount}
          adminCount={adminCount}
          withAppRoles={withAppRoles}
          t={t}
        />

        {/* Search */}
        <Div className="flex flex-col sm:flex-row gap-3">
          <Input
            placeholder={t.searchPlaceholder}
            value={searchInput}
            onChange={e => handleSearchChange(e.target.value)}
            className="w-full sm:w-80"
          />
        </Div>

        {/* Table */}
        <AdminUsersTable
          users={users}
          loading={loading}
          total={total}
          showAppsColumn={true}
          t={t}
          onEdit={handleEditClick}
          onDelete={userId => setDeleteDialog({ open: true, userId })}
        />

        {/* Server-side pagination */}
        {!loading && total > ADMIN_PAGE_SIZE && (
          <Div className="flex items-center justify-between">
            <P className="text-sm text-muted-foreground">
              {offset + 1}-{Math.min(offset + ADMIN_PAGE_SIZE, total)} / {total}
            </P>
            <Div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                disabled={offset === 0}
                onClick={() => setOffset(prev => Math.max(0, prev - ADMIN_PAGE_SIZE))}
              >
                &larr; {t.previous}
              </Button>
              <Button
                variant="outline"
                size="sm"
                disabled={offset + ADMIN_PAGE_SIZE >= total}
                onClick={() => setOffset(prev => prev + ADMIN_PAGE_SIZE)}
              >
                {t.next} &rarr;
              </Button>
            </Div>
          </Div>
        )}

        <EditUserModal
          user={editUser}
          open={editOpen}
          onOpenChange={setEditOpen}
          onSaved={fetchUsers}
          t={t}
          getToken={getToken}
        />

        <AlertDialog
          variant="destructive"
          open={deleteDialog.open}
          onOpenChange={(open: boolean) => {
            if (!deleting) setDeleteDialog(prev => ({ ...prev, open }))
          }}
        >
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>{t.confirmDeleteTitle}</AlertDialogTitle>
              <AlertDialogDescription>{t.confirmDeleteDescription}</AlertDialogDescription>
            </AlertDialogHeader>
            {deleteError && (
              <Div className="bg-destructive/15 border border-destructive/50 text-destructive px-4 py-3 rounded-md text-sm">
                {deleteError}
              </Div>
            )}
            <AlertDialogFooter>
              <AlertDialogCancel disabled={deleting}>{t.cancel}</AlertDialogCancel>
              <AlertDialogAction onClick={handleDeleteConfirm} disabled={deleting}>
                {deleting ? <Spinner size="sm" /> : t.confirm}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </Div>
    </Div>
  )
}

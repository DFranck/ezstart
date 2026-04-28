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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Spinner,
} from '@ezstart/ui/components'
import { apiCall, type ApiMeta } from '@ezstart/api-sdk'
import { toast } from '@ezstart/ui/utils'
import { useAuthStore } from '../../../react/auth-provider.js'
import { AdminStatsCards } from '../AdminStatsCards.js'
import { AdminUsersTable } from '../AdminUsersTable.js'
import { EditRolesModal } from '../EditRolesModal.js'
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
  /**
   * Override the EZAuth API base URL used for `/admin/users` calls.
   *
   * Required for **federated admin** scenarios where the section is
   * embedded in a hub app (e.g. `apps/ezstart/web/admin`) that consumes
   * EZAuth cross-origin. When omitted, the API URL falls back to the
   * surrounding `<AuthProvider>` configuration.
   *
   * @example 'https://auth.example.com'
   */
  apiUrl?: string
  /**
   * Override the bearer token used for admin API calls. Accepts a static
   * string or a thunk returning a string (or Promise). When provided, this
   * value is used instead of the `accessToken` from the local auth store —
   * required for federated admin embeds where the hub app holds the
   * platform-wide superadmin JWT and forwards it to each SDK dashboard.
   */
  authToken?: string | (() => string | Promise<string>)
  /** BCP47 locale for date / time formatting (defaults to browser locale). */
  locale?: string
}

/**
 * Internal users-management section embedded in `<AuthAdminDashboard>`.
 *
 * Auto-scoped server-side via `req.derivedScope` (JWT-derived):
 * - superadmin -> all users
 * - app admin   -> users of owned Applications
 * - user        -> own account only
 *
 * @internal
 */
export function AuthUsersSection({
  className,
  texts,
  apiUrl: apiUrlOverride,
  authToken: authTokenOverride,
  locale,
}: AuthUsersSectionProps) {
  const t: Required<AuthUsersSectionTexts> = { ...DEFAULT_USERS_TEXTS, ...texts }
  const storeAccessToken = useAuthStore(state => state.accessToken)

  /**
   * Resolve the bearer token used for admin API calls.
   *
   * Federated admin (Tier 3 hub embedding multiple SDK dashboards) MUST
   * pass an `authToken` override carrying the platform-wide superadmin
   * JWT — the local `useAuthStore` only knows the hub's own session
   * token, which is unrelated to the EZAuth admin endpoints.
   */
  const getToken = useCallback(async (): Promise<string | null> => {
    if (authTokenOverride !== undefined) {
      const value =
        typeof authTokenOverride === 'function' ? await authTokenOverride() : authTokenOverride
      return value || null
    }
    return storeAccessToken
  }, [authTokenOverride, storeAccessToken])

  // App filter — populated from the response set so the user can narrow
  // down by app within the auto-derived scope (superadmin sees all apps,
  // an app admin sees only the apps they own, etc.).
  const [appFilter, setAppFilter] = useState<string>('')
  const [availableApps, setAvailableApps] = useState<string[]>([])

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
      if (appFilter) query.app = appFilter
      if (searchQuery) query.search = searchQuery

      const envelope = await apiCall<{ data: AdminUser[]; meta?: ApiMeta }>('/admin/users', {
        appName: 'ezauth',
        method: 'GET',
        query,
        getToken,
        preserveEnvelope: true,
        ...(apiUrlOverride ? { baseUrl: apiUrlOverride } : {}),
      })
      const fetchedUsers = envelope.data ?? []
      setUsers(fetchedUsers)
      const meta = envelope.meta as UsersApiMeta | undefined
      setTotal(meta?.total ?? 0)

      const apps = new Set<string>()
      for (const u of fetchedUsers) {
        if (u.apps) {
          for (const a of u.apps) apps.add(a)
        }
      }
      setAvailableApps(prev => {
        const merged = new Set([...prev, ...apps])
        return [...merged].sort()
      })
    } catch {
      // Error already logged by apiCall
    } finally {
      setLoading(false)
    }
  }, [offset, searchQuery, appFilter, getToken, apiUrlOverride])

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
        ...(apiUrlOverride ? { baseUrl: apiUrlOverride } : {}),
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
  }, [deleteDialog.userId, fetchUsers, t, getToken, apiUrlOverride])

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

        {/* Search + App filter */}
        <Div className="flex flex-col sm:flex-row gap-3">
          <Input
            placeholder={t.searchPlaceholder}
            value={searchInput}
            onChange={e => handleSearchChange(e.target.value)}
            className="w-full sm:w-80"
          />
          {availableApps.length > 0 && (
            <Select
              value={appFilter}
              onValueChange={(val: string) => {
                setAppFilter(val === '__all__' ? '' : val)
                setOffset(0)
              }}
            >
              <SelectTrigger className="w-full sm:w-48">
                <SelectValue placeholder={t.filterByApp} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="__all__">{t.allApps}</SelectItem>
                {availableApps.map(app => (
                  <SelectItem key={app} value={app}>
                    {app}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
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
          locale={locale}
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

        <EditRolesModal
          user={editUser}
          open={editOpen}
          onOpenChange={setEditOpen}
          onSaved={fetchUsers}
          t={t}
          getToken={getToken}
          apiUrl={apiUrlOverride}
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

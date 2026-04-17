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
  Badge,
  Button,
  Card,
  Checkbox,
  Div,
  H2,
  Input,
  Label,
  Modal,
  P,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Skeleton,
  Span,
  Spinner,
  DataTable,
  DataTableColumnHeader,
  type ColumnDef,
} from '@ezstart/ui/components'
import { apiCall, type ApiMeta } from '@ezstart/api-sdk'
import { toast } from '@ezstart/ui/utils'
import { useAuthStore } from '../react/store.js'
import { useAuthContext } from '../react/auth-provider.js'
import type { AuthScope } from '../core/types.js'

// ========================================
// Types
// ========================================

interface AdminUser {
  _id: string
  email: string
  username: string
  globalRoles: string[]
  appRoles: Record<string, string[]>
  apps?: string[]
  lastActiveAt?: string | null
  createdAt: string
}

interface UsersApiMeta {
  total: number
  limit: number
  offset: number
}

export interface AuthAdminDashboardTexts {
  // Stats
  totalUsers?: string
  online?: string
  superadmins?: string
  admins?: string
  withAppRoles?: string

  // Search
  searchPlaceholder?: string

  // Table columns
  columnEmail?: string
  columnUsername?: string
  columnRoles?: string
  columnLastActive?: string
  columnCreatedAt?: string
  columnApps?: string
  columnActions?: string

  // Actions
  edit?: string
  delete?: string
  noUsers?: string

  // Online/relative time
  onlineLabel?: string
  minutesAgo?: string
  hoursAgo?: string
  daysAgo?: string

  // Delete dialog
  confirmDeleteTitle?: string
  confirmDeleteDescription?: string
  cancel?: string
  confirm?: string
  deleteError?: string
  deleteSuccess?: string

  // Edit roles modal
  editRolesTitle?: string
  editRolesSubtitle?: string
  globalRolesLabel?: string
  appRolesLabel?: string
  noAppRoles?: string
  save?: string
  editError?: string
  editSuccess?: string

  // Role labels
  roleSuperadmin?: string
  roleAdmin?: string
  roleManager?: string
  roleBetaTester?: string
  roleClient?: string

  // Pagination
  previous?: string
  next?: string

  // App filter (platform/first-party scope)
  allApps?: string
  filterByApp?: string
}

export interface AuthAdminDashboardProps {
  /** App name filter. For app-scoped keys, this is auto-set from the provider context. */
  appName?: string
  className?: string
  texts?: Partial<AuthAdminDashboardTexts>
  /** Override scope detection (defaults to the scope from AuthProvider context). */
  scope?: AuthScope
}

// ========================================
// Constants
// ========================================

const PAGE_SIZE = 20
const ONLINE_THRESHOLD_MS = 5 * 60 * 1000

const GLOBAL_ROLES = ['superadmin', 'admin'] as const
const APP_ROLES = ['admin', 'manager', 'beta-tester', 'client'] as const

// ========================================
// Default texts (English)
// ========================================

const DEFAULT_TEXTS: Required<AuthAdminDashboardTexts> = {
  totalUsers: 'Total users',
  online: 'Online',
  superadmins: 'Superadmins',
  admins: 'Admins',
  withAppRoles: 'With app roles',
  searchPlaceholder: 'Search by email or username...',
  columnEmail: 'Email',
  columnUsername: 'Username',
  columnRoles: 'Roles',
  columnLastActive: 'Last active',
  columnCreatedAt: 'Created',
  columnApps: 'Apps',
  columnActions: 'Actions',
  edit: 'Edit',
  delete: 'Delete',
  noUsers: 'No users found.',
  onlineLabel: 'Online',
  minutesAgo: '{count}m ago',
  hoursAgo: '{count}h ago',
  daysAgo: '{count}d ago',
  confirmDeleteTitle: 'Delete user',
  confirmDeleteDescription:
    'Are you sure you want to delete this user? This action cannot be undone.',
  cancel: 'Cancel',
  confirm: 'Confirm',
  deleteError: 'Failed to delete user.',
  deleteSuccess: 'User deleted successfully.',
  editRolesTitle: 'Edit roles',
  editRolesSubtitle: 'Edit roles for {email}',
  globalRolesLabel: 'Global roles',
  appRolesLabel: '{app} roles',
  noAppRoles: 'No app-specific roles assigned.',
  save: 'Save',
  editError: 'Failed to update roles.',
  editSuccess: 'Roles updated successfully.',
  roleSuperadmin: 'Superadmin',
  roleAdmin: 'Admin',
  roleManager: 'Manager',
  roleBetaTester: 'Beta tester',
  roleClient: 'Client',
  previous: 'Previous',
  next: 'Next',
  allApps: 'All apps',
  filterByApp: 'Filter by app',
}

// ========================================
// Helpers
// ========================================

function formatDate(dateStr: string): string {
  return new Intl.DateTimeFormat('en-US', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(new Date(dateStr))
}

function isOnline(lastActiveAt?: string | null): boolean {
  if (!lastActiveAt) return false
  return Date.now() - new Date(lastActiveAt).getTime() < ONLINE_THRESHOLD_MS
}

function getRelativeTime(
  lastActiveAt: string | null | undefined,
  t: Required<AuthAdminDashboardTexts>
): string {
  if (!lastActiveAt) return '-'

  const diffMs = Date.now() - new Date(lastActiveAt).getTime()
  const diffMin = Math.floor(diffMs / 60_000)
  const diffHours = Math.floor(diffMs / 3_600_000)
  const diffDays = Math.floor(diffMs / 86_400_000)

  if (diffMin < 5) return t.onlineLabel
  if (diffMin < 60) return t.minutesAgo.replace('{count}', String(diffMin))
  if (diffHours < 24) return t.hoursAgo.replace('{count}', String(diffHours))
  return t.daysAgo.replace('{count}', String(diffDays))
}

function getRoleLabel(role: string, t: Required<AuthAdminDashboardTexts>): string {
  const map: Record<string, string> = {
    superadmin: t.roleSuperadmin,
    admin: t.roleAdmin,
    manager: t.roleManager,
    'beta-tester': t.roleBetaTester,
    client: t.roleClient,
  }
  return map[role] || role
}

// ========================================
// EditRolesModal (internal)
// ========================================

function EditRolesModal({
  user,
  open,
  onOpenChange,
  onSaved,
  t,
  accessToken,
}: {
  user: AdminUser | null
  open: boolean
  onOpenChange: (open: boolean) => void
  onSaved: () => void
  t: Required<AuthAdminDashboardTexts>
  accessToken: string | null
}) {
  const [globalRoles, setGlobalRoles] = useState<string[]>([])
  const [appRoles, setAppRoles] = useState<Record<string, string[]>>({})
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    if (user) {
      setGlobalRoles([...(user.globalRoles || [])])
      setAppRoles(
        Object.fromEntries(
          Object.entries(user.appRoles || {}).map(([app, roles]) => [app, [...(roles || [])]])
        )
      )
    }
  }, [user])

  const handleGlobalRoleToggle = useCallback((role: string) => {
    setGlobalRoles(prev => (prev.includes(role) ? prev.filter(r => r !== role) : [...prev, role]))
  }, [])

  const handleAppRoleToggle = useCallback((app: string, role: string) => {
    setAppRoles(prev => {
      const current = prev[app] || []
      const updated = current.includes(role) ? current.filter(r => r !== role) : [...current, role]
      return { ...prev, [app]: updated }
    })
  }, [])

  const handleSave = useCallback(async () => {
    if (!user) return
    setSaving(true)
    setError('')
    try {
      await apiCall(`/admin/users/${user._id}`, {
        appName: 'ezauth',
        method: 'PATCH',
        body: { globalRoles, appRoles },
        getToken: () => accessToken,
      })
      toast.success(t.editSuccess)
      onSaved()
      onOpenChange(false)
    } catch (err) {
      const message = err instanceof Error ? err.message : t.editError
      setError(message)
      toast.error(t.editError)
    } finally {
      setSaving(false)
    }
  }, [user, globalRoles, appRoles, onSaved, onOpenChange, t, accessToken])

  if (!user) return null

  const appNames = Object.keys(appRoles || {})

  return (
    <Modal
      isOpen={open}
      onClose={() => onOpenChange(false)}
      size="lg"
      title={t.editRolesTitle}
      description={t.editRolesSubtitle.replace('{email}', user.email)}
      footer={
        <>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={saving}>
            {t.cancel}
          </Button>
          <Button onClick={handleSave} disabled={saving}>
            {saving ? <Spinner size="sm" /> : t.save}
          </Button>
        </>
      }
    >
      <Div className="space-y-6 py-4">
        {error && (
          <Div className="bg-destructive/15 border border-destructive/50 text-destructive px-4 py-3 rounded-md text-sm">
            {error}
          </Div>
        )}

        {/* Global Roles */}
        <Div className="space-y-3">
          <H2 size="h5" className="font-semibold">
            {t.globalRolesLabel}
          </H2>
          <Div className="space-y-2">
            {GLOBAL_ROLES.map(role => (
              <Div key={role} className="flex items-center gap-2">
                <Checkbox
                  id={`global-${role}`}
                  checked={globalRoles.includes(role)}
                  onCheckedChange={() => handleGlobalRoleToggle(role)}
                />
                <Label htmlFor={`global-${role}`} className="cursor-pointer">
                  {getRoleLabel(role, t)}
                </Label>
              </Div>
            ))}
          </Div>
        </Div>

        {/* App Roles */}
        {appNames.length > 0 ? (
          appNames.map(app => (
            <Div key={app} className="space-y-3">
              <H2 size="h5" className="font-semibold">
                {t.appRolesLabel.replace('{app}', app)}
              </H2>
              <Div className="space-y-2">
                {APP_ROLES.map(role => (
                  <Div key={role} className="flex items-center gap-2">
                    <Checkbox
                      id={`${app}-${role}`}
                      checked={(appRoles[app] || []).includes(role)}
                      onCheckedChange={() => handleAppRoleToggle(app, role)}
                    />
                    <Label htmlFor={`${app}-${role}`} className="cursor-pointer">
                      {getRoleLabel(role, t)}
                    </Label>
                  </Div>
                ))}
              </Div>
            </Div>
          ))
        ) : (
          <P className="text-muted-foreground text-sm">{t.noAppRoles}</P>
        )}
      </Div>
    </Modal>
  )
}

// ========================================
// AuthAdminDashboard (main export)
// ========================================

export function AuthAdminDashboard({ appName: appNameProp, className, texts, scope: scopeProp }: AuthAdminDashboardProps) {
  const t: Required<AuthAdminDashboardTexts> = { ...DEFAULT_TEXTS, ...texts }
  const accessToken = useAuthStore(state => state.accessToken)

  // Resolve scope from context or prop
  let contextScope: AuthScope = 'app'
  try {
    const ctx = useAuthContext()
    contextScope = ctx.scope
  } catch {
    // AuthProvider not available, default to 'app'
  }
  const scope = scopeProp ?? contextScope

  // For app-scoped keys, always filter by the provider's appName
  const effectiveAppName = scope === 'app' ? appNameProp : undefined

  // App filter for platform/first-party (user can select which app to view)
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

  // Fetch users
  const activeAppFilter = effectiveAppName || appFilter || undefined
  const fetchUsers = useCallback(async () => {
    setLoading(true)
    try {
      const query: Record<string, string> = {
        limit: String(PAGE_SIZE),
        offset: String(offset),
      }
      if (activeAppFilter) query.app = activeAppFilter
      if (searchQuery) query.search = searchQuery

      // Preserve envelope to access `meta.total` for server-side pagination.
      const envelope = await apiCall<{ data: AdminUser[]; meta?: ApiMeta }>('/admin/users', {
        appName: 'ezauth',
        method: 'GET',
        query,
        getToken: () => accessToken,
        preserveEnvelope: true,
      })
      const fetchedUsers = envelope.data ?? []
      setUsers(fetchedUsers)
      const meta = envelope.meta as UsersApiMeta | undefined
      setTotal(meta?.total ?? 0)

      // Collect available apps from users for the app filter dropdown
      if (scope !== 'app') {
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
      }
    } catch {
      // Error already logged by apiCall
    } finally {
      setLoading(false)
    }
  }, [offset, searchQuery, activeAppFilter, accessToken, scope])

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
      await apiCall(`/admin/users/${deleteDialog.userId}`, {
        appName: 'ezauth',
        method: 'DELETE',
        getToken: () => accessToken,
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
  }, [deleteDialog.userId, fetchUsers, t, accessToken])

  // Edit handler
  const handleEditClick = useCallback((user: AdminUser) => {
    setEditUser(user)
    setEditOpen(true)
  }, [])

  // DataTable columns — show apps column when not filtering by a single app
  const showAppsColumn = scope !== 'app'
  const columns: ColumnDef<AdminUser>[] = [
    {
      accessorKey: 'email',
      header: ({ header }) => <DataTableColumnHeader header={header} title={t.columnEmail} />,
      cell: ({ row }) => <Span className="text-sm font-medium">{row.original.email}</Span>,
    },
    {
      accessorKey: 'username',
      header: ({ header }) => <DataTableColumnHeader header={header} title={t.columnUsername} />,
      cell: ({ row }) => <Span className="text-sm">{row.original.username}</Span>,
    },
    ...(showAppsColumn
      ? [
          {
            id: 'apps',
            header: t.columnApps,
            enableSorting: false,
            cell: ({ row }: { row: { original: AdminUser } }) => {
              const apps = row.original.apps || []
              if (apps.length === 0) {
                return <Span className="text-muted-foreground text-sm">-</Span>
              }
              return (
                <Div className="flex flex-wrap gap-1">
                  {apps.map(app => (
                    <Badge key={app} variant="secondary" size="sm">
                      {app}
                    </Badge>
                  ))}
                </Div>
              )
            },
          },
        ]
      : []),
    {
      id: 'roles',
      header: t.columnRoles,
      enableSorting: false,
      cell: ({ row }) => {
        const global = row.original.globalRoles || []
        const appEntries = Object.entries(row.original.appRoles || {})
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
                {getRoleLabel(role, t)}
              </Badge>
            ))}
            {appEntries.map(([app, roles]) =>
              roles.map(role => (
                <Badge key={`${app}-${role}`} variant="outline" size="sm">
                  {app}:{getRoleLabel(role, t)}
                </Badge>
              ))
            )}
          </Div>
        )
      },
    },
    {
      accessorKey: 'lastActiveAt',
      header: ({ header }) => <DataTableColumnHeader header={header} title={t.columnLastActive} />,
      cell: ({ row }) => {
        const online = isOnline(row.original.lastActiveAt)
        const label = getRelativeTime(row.original.lastActiveAt, t)
        return online ? (
          <Badge variant="default" size="sm" className="bg-success text-success-foreground">
            {label}
          </Badge>
        ) : (
          <Span className="text-sm text-muted-foreground">{label}</Span>
        )
      },
    },
    {
      accessorKey: 'createdAt',
      header: ({ header }) => <DataTableColumnHeader header={header} title={t.columnCreatedAt} />,
      cell: ({ row }) => <Span className="text-sm">{formatDate(row.original.createdAt)}</Span>,
    },
    {
      id: 'actions',
      header: t.columnActions,
      cell: ({ row }) => (
        <Div className="flex gap-1">
          <Button variant="outline" size="sm" onClick={() => handleEditClick(row.original)}>
            {t.edit}
          </Button>
          <Button
            variant="destructive"
            size="sm"
            onClick={() => setDeleteDialog({ open: true, userId: row.original._id })}
          >
            {t.delete}
          </Button>
        </Div>
      ),
    },
  ]

  // Stats computed from current page data
  const superadminCount = users.filter(u => u.globalRoles?.includes('superadmin')).length
  const adminCount = users.filter(u => u.globalRoles?.includes('admin')).length
  const withAppRoles = users.filter(u => Object.keys(u.appRoles || {}).length > 0).length
  const onlineCount = users.filter(u => isOnline(u.lastActiveAt)).length

  return (
    <Div className={className}>
      <Div className="space-y-4">
        {/* Stats */}
        <Div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
          <Card className="p-4">
            <P className="text-sm text-muted-foreground">{t.totalUsers}</P>
            <P className="text-2xl font-bold">{total}</P>
          </Card>
          <Card className="p-4">
            <P className="text-sm text-muted-foreground">{t.online}</P>
            <P className="text-2xl font-bold text-success">{onlineCount}</P>
          </Card>
          <Card className="p-4">
            <P className="text-sm text-muted-foreground">{t.superadmins}</P>
            <P className="text-2xl font-bold">{superadminCount}</P>
          </Card>
          <Card className="p-4">
            <P className="text-sm text-muted-foreground">{t.admins}</P>
            <P className="text-2xl font-bold">{adminCount}</P>
          </Card>
          <Card className="p-4">
            <P className="text-sm text-muted-foreground">{t.withAppRoles}</P>
            <P className="text-2xl font-bold">{withAppRoles}</P>
          </Card>
        </Div>

        {/* Search + App filter */}
        <Div className="flex flex-col sm:flex-row gap-3">
          <Input
            placeholder={t.searchPlaceholder}
            value={searchInput}
            onChange={e => handleSearchChange(e.target.value)}
            className="w-full sm:w-80"
          />
          {/* App filter dropdown — only shown for platform/first-party scope */}
          {scope !== 'app' && availableApps.length > 0 && (
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
            <P className="text-center text-muted-foreground">{t.noUsers}</P>
          </Card>
        ) : (
          <DataTable columns={columns} data={users} pageSize={PAGE_SIZE} />
        )}

        {/* Server-side pagination */}
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
                &larr; {t.previous}
              </Button>
              <Button
                variant="outline"
                size="sm"
                disabled={offset + PAGE_SIZE >= total}
                onClick={() => setOffset(prev => prev + PAGE_SIZE)}
              >
                {t.next} &rarr;
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
          t={t}
          accessToken={accessToken}
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

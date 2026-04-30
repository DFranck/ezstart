'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
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
import { toast } from '@ezstart/ui/utils'
import { useMyApplications, useRevokeApplication } from '../../../react/applications.js'
import { CreateApplicationModal } from '../../applications/CreateApplicationModal.js'
import { defaultApplicationsFlowTexts } from '../../applications/types.js'
import { AdminApplicationsStatsCards } from '../AdminApplicationsStatsCards.js'
import { AdminApplicationsTable } from '../AdminApplicationsTable.js'
import { EditApplicationModal } from '../EditApplicationModal.js'
import {
  ADMIN_APPLICATIONS_PAGE_SIZE,
  type AdminApplicationRow,
  type AuthApplicationsSectionTexts,
  DEFAULT_APPLICATIONS_TEXTS,
} from '../AdminApplications.types.js'

type StatusFilter = 'all' | 'active' | 'archived'

export interface AuthApplicationsSectionProps {
  className?: string
  /** Partial texts override — falls back to English defaults. */
  texts?: Partial<AuthApplicationsSectionTexts>
  /**
   * Optional callback invoked when the superadmin clicks the "View details"
   * action on a row. Stays i18n-agnostic: the consumer wires this to its own
   * router (e.g. `router.push(\`/developer/\${app.id}\`)`). When `undefined`,
   * the action button is omitted (graceful default).
   */
  onApplicationOpen?: (app: AdminApplicationRow) => void
}

/**
 * Internal Applications-management section embedded in `<AuthAdminDashboard>`.
 *
 * Auth model: relies on the surrounding `<AuthProvider>` to supply the
 * superadmin bearer token. The underlying `useMyApplications` hook calls
 * `GET /api/applications?all=true` which the API rejects for any
 * non-superadmin caller (auto-derived scope).
 *
 * @internal
 */
export function AuthApplicationsSection({
  className,
  texts,
  onApplicationOpen,
}: AuthApplicationsSectionProps) {
  const t: Required<AuthApplicationsSectionTexts> = { ...DEFAULT_APPLICATIONS_TEXTS, ...texts }

  // Server query — always cross-tenant for the admin dashboard
  const {
    data: applications = [],
    isLoading,
    refetch,
  } = useMyApplications(true, { all: true, includeArchived: true })

  // Local filter / search state
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all')
  const [searchInput, setSearchInput] = useState('')
  const [searchQuery, setSearchQuery] = useState('')
  const searchTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const [page, setPage] = useState(0)

  // Modal / dialog state
  const [createOpen, setCreateOpen] = useState(false)
  const [editApp, setEditApp] = useState<AdminApplicationRow | null>(null)
  const [editOpen, setEditOpen] = useState(false)
  const [archiveDialog, setArchiveDialog] = useState<{
    open: boolean
    app: AdminApplicationRow | null
  }>({ open: false, app: null })

  const handleSearchChange = useCallback((value: string) => {
    setSearchInput(value)
    if (searchTimerRef.current) clearTimeout(searchTimerRef.current)
    searchTimerRef.current = setTimeout(() => {
      setSearchQuery(value)
      setPage(0)
    }, 300)
  }, [])

  useEffect(() => {
    return () => {
      if (searchTimerRef.current) clearTimeout(searchTimerRef.current)
    }
  }, [])

  // Filter + paginate locally — `?all=true` returns the full set, which is
  // small enough (admin scope) for client-side filtering.
  const filtered = useMemo(() => {
    const q = searchQuery.trim().toLowerCase()
    return applications.filter(app => {
      if (statusFilter !== 'all' && app.status !== statusFilter) return false
      if (!q) return true
      return (
        app.slug.toLowerCase().includes(q) ||
        app.name.toLowerCase().includes(q) ||
        app.ownerId.toLowerCase().includes(q)
      )
    })
  }, [applications, statusFilter, searchQuery])

  const total = filtered.length
  const paged = useMemo(
    () =>
      filtered.slice(
        page * ADMIN_APPLICATIONS_PAGE_SIZE,
        (page + 1) * ADMIN_APPLICATIONS_PAGE_SIZE
      ),
    [filtered, page]
  )

  // Stats — computed on the FULL (unfiltered) result set so superadmin sees
  // platform-wide health, not "what passes the search".
  const stats = useMemo(() => {
    const active = applications.filter(a => a.status === 'active').length
    const archived = applications.filter(a => a.status === 'archived').length
    const platformOwned = applications.filter(a => a.isPlatformOwned).length
    const themed = applications.filter(a => a.themeEnabled).length
    return {
      total: applications.length,
      active,
      archived,
      platformOwned,
      themed,
    }
  }, [applications])

  // Archive flow
  const revokeMutation = useRevokeApplication({
    onSuccess: () => {
      toast.success(t.archiveSuccess)
      setArchiveDialog({ open: false, app: null })
      refetch()
    },
    onError: () => {
      toast.error(t.archiveError)
    },
  })

  const handleArchiveConfirm = useCallback(() => {
    if (!archiveDialog.app) return
    // Cascade revoke API keys when archiving from the admin view — the table
    // does not surface key counts, so the safe default is to cascade and let
    // the API report how many keys it revoked via the success response.
    revokeMutation.mutate({ id: archiveDialog.app.id, cascade: true })
  }, [archiveDialog.app, revokeMutation])

  return (
    <Div className={className}>
      <Div className="space-y-4">
        <AdminApplicationsStatsCards
          total={stats.total}
          activeCount={stats.active}
          archivedCount={stats.archived}
          platformOwnedCount={stats.platformOwned}
          themedCount={stats.themed}
          t={t}
        />

        {/* Search + status filter + create CTA */}
        <Div className="flex flex-col sm:flex-row gap-3 sm:items-center sm:justify-between">
          <Div className="flex flex-col sm:flex-row gap-3 flex-1">
            <Input
              placeholder={t.searchPlaceholder}
              value={searchInput}
              onChange={e => handleSearchChange(e.target.value)}
              className="w-full sm:w-80"
            />
            <Select
              value={statusFilter}
              onValueChange={(val: string) => {
                setStatusFilter(val as StatusFilter)
                setPage(0)
              }}
            >
              <SelectTrigger className="w-full sm:w-48">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{t.statusAll}</SelectItem>
                <SelectItem value="active">{t.statusActive}</SelectItem>
                <SelectItem value="archived">{t.statusArchived}</SelectItem>
              </SelectContent>
            </Select>
          </Div>
          <Button onClick={() => setCreateOpen(true)}>{t.createApplication}</Button>
        </Div>

        {/* Table */}
        <AdminApplicationsTable
          applications={paged}
          loading={isLoading}
          total={total}
          t={t}
          onView={onApplicationOpen}
          onEdit={app => {
            setEditApp(app)
            setEditOpen(true)
          }}
          onArchive={app => setArchiveDialog({ open: true, app })}
        />

        {/* Pagination */}
        {!isLoading && total > ADMIN_APPLICATIONS_PAGE_SIZE && (
          <Div className="flex items-center justify-between">
            <P className="text-sm text-muted-foreground">
              {page * ADMIN_APPLICATIONS_PAGE_SIZE + 1}-
              {Math.min((page + 1) * ADMIN_APPLICATIONS_PAGE_SIZE, total)} / {total}
            </P>
            <Div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                disabled={page === 0}
                onClick={() => setPage(p => Math.max(0, p - 1))}
              >
                &larr; {t.previous}
              </Button>
              <Button
                variant="outline"
                size="sm"
                disabled={(page + 1) * ADMIN_APPLICATIONS_PAGE_SIZE >= total}
                onClick={() => setPage(p => p + 1)}
              >
                {t.next} &rarr;
              </Button>
            </Div>
          </Div>
        )}

        {/* Modals */}
        <CreateApplicationModal
          isOpen={createOpen}
          onClose={() => setCreateOpen(false)}
          onCreated={() => {
            setCreateOpen(false)
            refetch()
          }}
          texts={defaultApplicationsFlowTexts.create}
        />

        <EditApplicationModal
          application={editApp}
          open={editOpen}
          onOpenChange={setEditOpen}
          onSaved={refetch}
          t={t}
        />

        <AlertDialog
          variant="destructive"
          open={archiveDialog.open}
          onOpenChange={(open: boolean) => {
            if (!revokeMutation.isPending) {
              setArchiveDialog(prev => ({ ...prev, open }))
            }
          }}
        >
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>{t.confirmArchiveTitle}</AlertDialogTitle>
              <AlertDialogDescription>
                {t.confirmArchiveDescription}
                {archiveDialog.app ? (
                  <>
                    {' '}
                    <strong className="text-foreground">{archiveDialog.app.name}</strong> (
                    <code className="text-xs">{archiveDialog.app.slug}</code>)
                  </>
                ) : null}
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel disabled={revokeMutation.isPending}>{t.cancel}</AlertDialogCancel>
              <AlertDialogAction onClick={handleArchiveConfirm} disabled={revokeMutation.isPending}>
                {revokeMutation.isPending ? <Spinner size="sm" /> : t.confirm}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </Div>
    </Div>
  )
}

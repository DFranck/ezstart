'use client'

import {
  Badge,
  Button,
  Card,
  DataTable,
  DataTableColumnHeader,
  Div,
  P,
  Skeleton,
  Span,
  type ColumnDef,
} from '@ezstart/ui/components'
import {
  ADMIN_APPLICATIONS_PAGE_SIZE,
  type AdminApplicationRow,
  type AuthApplicationsSectionTexts,
  formatAdminApplicationDate,
} from './AdminApplications.types.js'

export interface AdminApplicationsTableProps {
  applications: AdminApplicationRow[]
  loading: boolean
  total: number
  t: Required<AuthApplicationsSectionTexts>
  onEdit: (app: AdminApplicationRow) => void
  onArchive: (app: AdminApplicationRow) => void
  /**
   * Optional handler invoked when the superadmin clicks the "View details"
   * action on a row. When provided, the action button is rendered as the
   * first action; when `undefined`, the button is omitted (graceful default
   * for consumers that don't wire detail navigation).
   */
  onView?: (app: AdminApplicationRow) => void
  /** BCP47 locale for date formatting. */
  locale?: string
}

/**
 * Builds the column definitions for the admin Applications DataTable.
 *
 * Extracted from the component body so the per-row action buttons (view,
 * edit, archive) can be unit-tested directly — the @ezstart/ui DataTable
 * mock used in tests is a passthrough that drops the columns prop, making
 * cell-renderer assertions impossible without this helper.
 *
 * @internal
 */
export function buildAdminApplicationsColumns(opts: {
  t: Required<AuthApplicationsSectionTexts>
  onEdit: (app: AdminApplicationRow) => void
  onArchive: (app: AdminApplicationRow) => void
  onView?: (app: AdminApplicationRow) => void
  locale?: string
}): ColumnDef<AdminApplicationRow>[] {
  const { t, onEdit, onArchive, onView, locale } = opts
  return [
    {
      accessorKey: 'slug',
      header: ({ header }) => <DataTableColumnHeader header={header} title={t.columnSlug} />,
      cell: ({ row }) => <Span className="text-sm font-mono font-medium">{row.original.slug}</Span>,
    },
    {
      accessorKey: 'name',
      header: ({ header }) => <DataTableColumnHeader header={header} title={t.columnName} />,
      cell: ({ row }) => (
        <Div className="flex flex-col gap-0.5">
          <Span className="text-sm font-medium">{row.original.name}</Span>
          {row.original.description ? (
            <Span className="text-xs text-muted-foreground line-clamp-1">
              {row.original.description}
            </Span>
          ) : null}
        </Div>
      ),
    },
    {
      accessorKey: 'ownerId',
      header: ({ header }) => <DataTableColumnHeader header={header} title={t.columnOwner} />,
      cell: ({ row }) => (
        <Span className="text-xs font-mono text-muted-foreground" title={row.original.ownerId}>
          {row.original.ownerId.slice(0, 12)}...
        </Span>
      ),
    },
    {
      accessorKey: 'status',
      header: ({ header }) => <DataTableColumnHeader header={header} title={t.columnStatus} />,
      cell: ({ row }) =>
        row.original.status === 'active' ? (
          <Badge variant="success" size="sm">
            {t.badgeActive}
          </Badge>
        ) : (
          <Badge variant="secondary" size="sm">
            {t.badgeArchived}
          </Badge>
        ),
    },
    {
      id: 'theme',
      header: t.columnTheme,
      enableSorting: false,
      cell: ({ row }) => {
        const hasTheme = !!row.original.theme
        const enabled = !!row.original.themeEnabled
        if (!hasTheme && !enabled) {
          return <Span className="text-muted-foreground text-sm">-</Span>
        }
        return enabled ? (
          <Badge variant="info" size="sm">
            {t.badgeThemed}
          </Badge>
        ) : (
          <Badge variant="outline" size="sm">
            {t.badgeThemeDisabled}
          </Badge>
        )
      },
    },
    {
      id: 'platform',
      header: t.columnPlatform,
      enableSorting: false,
      cell: ({ row }) =>
        row.original.isPlatformOwned ? (
          <Badge variant="primary" size="sm">
            {t.badgePlatform}
          </Badge>
        ) : (
          <Span className="text-muted-foreground text-sm">-</Span>
        ),
    },
    {
      accessorKey: 'createdAt',
      header: ({ header }) => <DataTableColumnHeader header={header} title={t.columnCreatedAt} />,
      cell: ({ row }) => (
        <Span className="text-sm">
          {formatAdminApplicationDate(row.original.createdAt, locale)}
        </Span>
      ),
    },
    {
      id: 'actions',
      header: t.columnActions,
      cell: ({ row }) => (
        <Div className="flex gap-1">
          {onView ? (
            <Button variant="outline" size="sm" onClick={() => onView(row.original)}>
              {t.viewDetails}
            </Button>
          ) : null}
          <Button variant="outline" size="sm" onClick={() => onEdit(row.original)}>
            {t.edit}
          </Button>
          {row.original.status === 'active' ? (
            <Button variant="destructive" size="sm" onClick={() => onArchive(row.original)}>
              {t.archive}
            </Button>
          ) : null}
        </Div>
      ),
    },
  ]
}

/**
 * Renders the Applications table (DataTable) used by `<AuthAdminDashboard>`.
 * Internal sub-component — extracted to keep each file under the 400-line policy ceiling.
 *
 * @internal
 */
export function AdminApplicationsTable({
  applications,
  loading,
  total,
  t,
  onEdit,
  onArchive,
  onView,
  locale,
}: AdminApplicationsTableProps) {
  const columns = buildAdminApplicationsColumns({ t, onEdit, onArchive, onView, locale })

  if (loading) {
    return (
      <Card className="p-8">
        <Div className="space-y-3">
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-10 w-full" />
          ))}
        </Div>
      </Card>
    )
  }

  if (applications.length === 0) {
    return (
      <Card className="p-8">
        <P className="text-center text-muted-foreground">{t.noApplications}</P>
      </Card>
    )
  }

  return (
    <Card className="overflow-hidden">
      <DataTable
        columns={columns}
        data={applications}
        pageSize={ADMIN_APPLICATIONS_PAGE_SIZE}
        stickyColumns="lg-down"
        texts={{
          previous: t.previous,
          next: t.next,
          rows: t.rows,
          pageOf: t.pageOf,
          empty: t.noApplications,
        }}
      />
      <Span className="sr-only">{total} total</Span>
    </Card>
  )
}

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
  Tooltip,
  TooltipContent,
  TooltipTrigger,
  type ColumnDef,
} from '@ezstart/ui/components'
import {
  ADMIN_PAGE_SIZE,
  type AdminUser,
  type AuthUsersSectionTexts,
  formatAdminDate,
  formatAdminShortDate,
  getAdminRelativeTime,
  getAdminRoleLabel,
  isAdminUserOnline,
} from './types.js'

export interface AdminUsersTableProps {
  users: AdminUser[]
  loading: boolean
  total: number
  /** Whether the optional `apps` column should be rendered. */
  showAppsColumn: boolean
  t: Required<AuthUsersSectionTexts>
  onEdit: (user: AdminUser) => void
  onDelete: (userId: string) => void
  /** BCP47 locale for date formatting. */
  locale?: string
}

/**
 * Renders the users table (DataTable) used by `<AuthAdminDashboard>`.
 * Internal sub-component — extracted to keep each file under the 400-line
 * policy ceiling.
 *
 * @internal
 */
export function AdminUsersTable({
  users,
  loading,
  total,
  showAppsColumn,
  t,
  onEdit,
  onDelete,
  locale,
}: AdminUsersTableProps) {
  const columns: ColumnDef<AdminUser>[] = [
    {
      accessorKey: 'email',
      header: ({ header }) => <DataTableColumnHeader header={header} title={t.columnEmail} />,
      cell: ({ row }) => {
        const { email, deletedAt, scheduledHardDeleteAt } = row.original
        if (!deletedAt) {
          return <Span className="text-sm font-medium">{email}</Span>
        }
        // Soft-deleted: render dimmed email + warning badge with scheduled
        // hard-delete date. Badge uses `warning` variant so it's visually
        // distinct from the role/status badges.
        const dateForBadge = scheduledHardDeleteAt ?? deletedAt
        const shortDate = formatAdminShortDate(dateForBadge, locale)
        const badgeLabel = t.softDeletedBadge.replace('{date}', shortDate)
        return (
          <Div className="flex flex-wrap items-center gap-2">
            <Span className="text-sm font-medium text-muted-foreground line-through">{email}</Span>
            <Tooltip>
              <TooltipTrigger asChild>
                <Badge variant="warning" size="sm">
                  {badgeLabel}
                </Badge>
              </TooltipTrigger>
              <TooltipContent variant="warning">{t.softDeletedTooltip}</TooltipContent>
            </Tooltip>
          </Div>
        )
      },
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
                {getAdminRoleLabel(role, t)}
              </Badge>
            ))}
            {appEntries.map(([app, roles]) =>
              roles.map(role => (
                <Badge key={`${app}-${role}`} variant="outline" size="sm">
                  {app}:{getAdminRoleLabel(role, t)}
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
        const online = isAdminUserOnline(row.original.lastActiveAt)
        const label = getAdminRelativeTime(row.original.lastActiveAt, t)
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
      cell: ({ row }) => (
        <Span className="text-sm">{formatAdminDate(row.original.createdAt, locale)}</Span>
      ),
    },
    {
      id: 'actions',
      header: t.columnActions,
      cell: ({ row }) => {
        const isSoftDeleted = !!row.original.deletedAt
        if (isSoftDeleted) {
          // Restore stub — backend endpoint pending. Button is disabled and
          // surfaces a "Coming soon" tooltip so admins know the action is on
          // the roadmap. Wire onClick to a real `POST /admin/users/:id/restore`
          // call once the endpoint ships.
          return (
            <Div className="flex gap-1">
              <Tooltip>
                <TooltipTrigger asChild>
                  <Span tabIndex={0} className="inline-flex">
                    <Button variant="outline" size="sm" disabled aria-disabled="true">
                      {t.restoreAction}
                    </Button>
                  </Span>
                </TooltipTrigger>
                <TooltipContent variant="info">{t.restoreComingSoon}</TooltipContent>
              </Tooltip>
            </Div>
          )
        }
        return (
          <Div className="flex gap-1">
            <Button variant="outline" size="sm" onClick={() => onEdit(row.original)}>
              {t.edit}
            </Button>
            <Button variant="destructive" size="sm" onClick={() => onDelete(row.original._id)}>
              {t.delete}
            </Button>
          </Div>
        )
      },
    },
  ]

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

  if (users.length === 0) {
    return (
      <Card className="p-8">
        <P className="text-center text-muted-foreground">{t.noUsers}</P>
      </Card>
    )
  }

  return (
    <Card className="overflow-hidden">
      <DataTable
        columns={columns}
        data={users}
        pageSize={ADMIN_PAGE_SIZE}
        stickyColumns="lg-down"
        texts={{
          previous: t.previous,
          next: t.next,
          rows: t.rows,
          pageOf: t.pageOf,
          empty: t.noUsers,
        }}
      />
      <Span className="sr-only">{total} total</Span>
    </Card>
  )
}

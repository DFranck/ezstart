'use client'

import { useMemo } from 'react'
import { Badge, Button, type ColumnDef, Span } from '@ezstart/ui/components'
import type { ErrorLogListEntry } from '../../../../react/admin-error-logs.js'
import type { AuthErrorLogsSectionTexts } from './texts.js'
import { formatDate, levelBadgeVariant, statusBadgeVariant } from './helpers.js'

/**
 * Builds the memoized DataTable column set for the error logs table. The
 * "View" action column triggers `onView` with the clicked row id.
 *
 * @internal
 */
export function useErrorLogColumns(
  t: Required<AuthErrorLogsSectionTexts>,
  locale: string,
  onView: (id: string) => void
): ColumnDef<ErrorLogListEntry>[] {
  return useMemo(
    () => [
      {
        accessorKey: 'timestamp',
        header: t.columnTimestamp,
        cell: ({ row }) => (
          <Span className="text-xs text-muted-foreground whitespace-nowrap">
            {formatDate(row.original.timestamp, locale)}
          </Span>
        ),
      },
      {
        accessorKey: 'level',
        header: t.columnLevel,
        cell: ({ row }) => (
          <Badge variant={levelBadgeVariant(row.original.level)} size="xs">
            {row.original.level}
          </Badge>
        ),
        enableSorting: false,
      },
      {
        accessorKey: 'method',
        header: t.columnMethod,
        cell: ({ row }) => (
          <Span className="text-xs font-mono text-muted-foreground">
            {row.original.method ?? '—'}
          </Span>
        ),
        enableSorting: false,
      },
      {
        accessorKey: 'url',
        header: t.columnUrl,
        cell: ({ row }) => (
          <Span className="text-xs font-mono text-foreground truncate max-w-[260px] block">
            {row.original.url ?? '—'}
          </Span>
        ),
        enableSorting: false,
      },
      {
        accessorKey: 'statusCode',
        header: t.columnStatus,
        cell: ({ row }) =>
          row.original.statusCode ? (
            <Badge variant={statusBadgeVariant(row.original.statusCode)} size="xs">
              {row.original.statusCode}
            </Badge>
          ) : (
            <Span className="text-xs text-muted-foreground">—</Span>
          ),
        enableSorting: false,
      },
      {
        accessorKey: 'message',
        header: t.columnMessage,
        cell: ({ row }) => (
          <Span className="text-xs text-foreground truncate max-w-[300px] block">
            {row.original.message}
          </Span>
        ),
        enableSorting: false,
      },
      {
        accessorKey: 'userId',
        header: t.columnUser,
        cell: ({ row }) => (
          <Span className="text-xs font-mono text-muted-foreground truncate max-w-[140px] block">
            {row.original.userId ?? '—'}
          </Span>
        ),
        enableSorting: false,
      },
      {
        id: 'actions',
        header: t.columnActions,
        cell: ({ row }) => (
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => onView(row.original._id)}
          >
            {t.viewAction}
          </Button>
        ),
        enableSorting: false,
      },
    ],
    [t, locale, onView]
  )
}

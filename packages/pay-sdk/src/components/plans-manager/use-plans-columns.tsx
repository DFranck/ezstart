'use client'

/**
 * `useColumns` hook for the PlansManager DataTable.
 *
 * Extracted from PlansManager.tsx to keep the parent under 300 lines and to
 * make the column definitions reusable / testable in isolation.
 *
 * @internal
 */

import { Badge, Button, type ColumnDef, Div, P, Span } from '@ezstart/ui/components'
import { useMemo } from 'react'
import type { Plan } from '../../core/types.js'
import { formatCurrency } from '../../core/format-currency.js'
import type { PlansManagerTexts } from './plans-manager-types.js'

export interface UsePlansColumnsOptions {
  texts: PlansManagerTexts
  resolvedLocale: string
  isArchiving: boolean
  onEdit: (plan: Plan) => void
  onArchive: (plan: Plan) => void
}

export function usePlansColumns({
  texts,
  resolvedLocale,
  isArchiving,
  onEdit,
  onArchive,
}: UsePlansColumnsOptions): ColumnDef<Plan>[] {
  return useMemo<ColumnDef<Plan>[]>(() => {
    return [
      {
        accessorKey: 'name',
        header: texts.columns.name,
        cell: ({ row }) => (
          <Div className="flex flex-col">
            <P className="font-medium">{row.original.name}</P>
            {row.original.description && (
              <P className="text-xs text-muted-foreground line-clamp-1">
                {row.original.description}
              </P>
            )}
          </Div>
        ),
      },
      {
        accessorKey: 'amount',
        header: texts.columns.price,
        cell: ({ row }) => {
          const { amount, currency } = row.original
          return (
            <Span className="tabular-nums">
              {formatCurrency(amount / 100, currency, resolvedLocale)}
            </Span>
          )
        },
      },
      {
        accessorKey: 'interval',
        header: texts.columns.interval,
        cell: ({ row }) => {
          const { interval, intervalCount } = row.original
          const base = interval === 'month' ? texts.intervals.month : texts.intervals.year
          return (
            <Span className="text-sm">
              {intervalCount > 1 ? `${base} × ${intervalCount}` : base}
            </Span>
          )
        },
      },
      {
        accessorKey: 'active',
        header: texts.columns.status,
        cell: ({ row }) =>
          row.original.active ? (
            <Badge variant="success">{texts.status.active}</Badge>
          ) : (
            <Badge variant="secondary">{texts.status.inactive}</Badge>
          ),
      },
      {
        id: 'features',
        header: texts.columns.features,
        cell: ({ row }) => {
          const count = row.original.features?.length ?? 0
          return <Span className="text-sm text-muted-foreground">{count}</Span>
        },
        enableSorting: false,
      },
      {
        id: 'actions',
        header: texts.columns.actions,
        cell: ({ row }) => (
          <Div className="flex gap-1">
            <Button
              variant="outline"
              size="sm"
              onClick={() => onEdit(row.original)}
              disabled={isArchiving}
            >
              {texts.actions.edit}
            </Button>
            {row.original.active && (
              <Button
                variant="destructive"
                size="sm"
                onClick={() => onArchive(row.original)}
                disabled={isArchiving}
              >
                {texts.actions.archive}
              </Button>
            )}
          </Div>
        ),
        enableSorting: false,
      },
    ]
  }, [texts, resolvedLocale, onEdit, onArchive, isArchiving])
}

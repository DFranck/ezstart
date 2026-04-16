'use client'

import { type ColumnDef, Badge, Button, DataTable, Div, Span, Code } from '@ezstart/ui/components'
import { useMemo } from 'react'
import type { ApiKeyItem } from '../../core/types.js'
import type { ApiKeysTableTexts } from './types.js'
import { UsageBadge } from './UsageBadge.js'

export interface ApiKeysTableProps {
  keys: ApiKeyItem[]
  onRevoke: (id: string) => void
  onRotate: (id: string) => void
  onViewUsage: (id: string) => void
  isRevoking: boolean
  isRotating: boolean
  texts: ApiKeysTableTexts
  /** Locale used for date formatting (e.g. `'en'`, `'fr'`). Defaults to `'en'`. */
  locale?: string
}

export function ApiKeysTable({
  keys,
  onRevoke,
  onRotate,
  onViewUsage,
  isRevoking,
  isRotating,
  texts,
  locale = 'en',
}: ApiKeysTableProps) {
  const formatDate = (iso: string | null): string => {
    if (!iso) return texts.never
    return new Date(iso).toLocaleDateString(locale, {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    })
  }

  const columns: ColumnDef<ApiKeyItem>[] = useMemo(
    () => [
      {
        accessorKey: 'name',
        header: texts.name,
        cell: ({ row }) => (
          <Span className="font-medium text-foreground">{row.original.name}</Span>
        ),
      },
      {
        accessorKey: 'keyPrefix',
        header: texts.keyPrefix,
        cell: ({ row }) => (
          <Code className="text-sm text-muted-foreground">{row.original.keyPrefix}...</Code>
        ),
        enableSorting: false,
      },
      {
        accessorKey: 'status',
        header: texts.status,
        cell: ({ row }) => {
          const status = row.original.status
          return (
            <Badge variant={status === 'active' ? 'success' : 'destructive'}>
              {status === 'active' ? texts.statusActive : texts.statusRevoked}
            </Badge>
          )
        },
      },
      {
        id: 'usage',
        header: texts.usage,
        cell: ({ row }) => {
          const { quotaMonthly, usageThisMonth, status } = row.original
          if (status === 'revoked') return null
          return (
            <Div
              className="cursor-pointer"
              onClick={() => onViewUsage(row.original.id)}
            >
              <UsageBadge
                used={usageThisMonth}
                quota={quotaMonthly}
                texts={{ unlimited: texts.unlimited }}
              />
            </Div>
          )
        },
        enableSorting: false,
      },
      {
        accessorKey: 'createdAt',
        header: texts.created,
        cell: ({ row }) => formatDate(row.original.createdAt),
      },
      {
        accessorKey: 'lastUsedAt',
        header: texts.lastUsed,
        cell: ({ row }) => formatDate(row.original.lastUsedAt),
      },
      {
        id: 'actions',
        header: texts.actions,
        cell: ({ row }) => {
          if (row.original.status === 'revoked') return null
          return (
            <Div className="flex gap-1">
              <Button
                variant="outline"
                size="sm"
                onClick={() => onRotate(row.original.id)}
                disabled={isRotating}
              >
                {texts.rotate}
              </Button>
              <Button
                variant="destructive"
                size="sm"
                onClick={() => onRevoke(row.original.id)}
                disabled={isRevoking}
              >
                {texts.revoke}
              </Button>
            </Div>
          )
        },
        enableSorting: false,
      },
    ],
    [texts, locale, onRevoke, onRotate, onViewUsage, isRevoking, isRotating]
  )

  return (
    <DataTable
      columns={columns}
      data={keys}
      pageSize={10}
      density="compact"
    />
  )
}

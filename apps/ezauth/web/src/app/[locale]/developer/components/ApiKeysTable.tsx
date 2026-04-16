'use client'

import { type ColumnDef, Badge, Button, DataTable, Div, Span, Code } from '@ezstart/ui/components'
import { useLocale, useTranslations } from 'next-intl'
import { useMemo } from 'react'
import type { ApiKeyItem } from '../types'
import { UsageBadge } from './UsageBadge'

interface ApiKeysTableProps {
  keys: ApiKeyItem[]
  onRevoke: (id: string) => void
  onRotate: (id: string) => void
  onViewUsage: (id: string) => void
  isRevoking: boolean
  isRotating: boolean
}

export function ApiKeysTable({
  keys,
  onRevoke,
  onRotate,
  onViewUsage,
  isRevoking,
  isRotating,
}: ApiKeysTableProps) {
  const t = useTranslations('developer')
  const locale = useLocale()

  const formatDate = (iso: string | null): string => {
    if (!iso) return t('table.never')
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
        header: t('table.name'),
        cell: ({ row }) => (
          <Span className="font-medium text-foreground">{row.original.name}</Span>
        ),
      },
      {
        accessorKey: 'keyPrefix',
        header: t('table.keyPrefix'),
        cell: ({ row }) => (
          <Code className="text-sm text-muted-foreground">{row.original.keyPrefix}...</Code>
        ),
        enableSorting: false,
      },
      {
        accessorKey: 'status',
        header: t('table.status'),
        cell: ({ row }) => {
          const status = row.original.status
          return (
            <Badge variant={status === 'active' ? 'success' : 'destructive'}>
              {t(`status.${status}`)}
            </Badge>
          )
        },
      },
      {
        id: 'usage',
        header: t('table.usage'),
        cell: ({ row }) => {
          const { quotaMonthly, usageThisMonth, status } = row.original
          if (status === 'revoked') return null
          return (
            <Div
              className="cursor-pointer"
              onClick={() => onViewUsage(row.original.id)}
            >
              <UsageBadge used={usageThisMonth} quota={quotaMonthly} />
            </Div>
          )
        },
        enableSorting: false,
      },
      {
        accessorKey: 'createdAt',
        header: t('table.created'),
        cell: ({ row }) => formatDate(row.original.createdAt),
      },
      {
        accessorKey: 'lastUsedAt',
        header: t('table.lastUsed'),
        cell: ({ row }) => formatDate(row.original.lastUsedAt),
      },
      {
        id: 'actions',
        header: t('table.actions'),
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
                {t('rotate.submit')}
              </Button>
              <Button
                variant="destructive"
                size="sm"
                onClick={() => onRevoke(row.original.id)}
                disabled={isRevoking}
              >
                {t('revoke.submit')}
              </Button>
            </Div>
          )
        },
        enableSorting: false,
      },
    ],
    [t, locale, onRevoke, onRotate, onViewUsage, isRevoking, isRotating]
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

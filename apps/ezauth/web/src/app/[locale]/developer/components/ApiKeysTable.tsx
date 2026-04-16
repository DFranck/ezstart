'use client'

import { type ColumnDef } from '@tanstack/react-table'
import { Badge, Button, DataTable } from '@ezstart/ui/components'
import { useLocale, useTranslations } from 'next-intl'
import { useMemo } from 'react'
import type { ApiKeyItem } from '../types'

interface ApiKeysTableProps {
  keys: ApiKeyItem[]
  onRevoke: (id: string) => void
  onRotate: (id: string) => void
  isRevoking: boolean
  isRotating: boolean
}

export function ApiKeysTable({ keys, onRevoke, onRotate, isRevoking, isRotating }: ApiKeysTableProps) {
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

  const columns: ColumnDef<ApiKeyItem, string>[] = useMemo(
    () => [
      {
        accessorKey: 'name',
        header: t('table.name'),
        cell: ({ row }) => (
          <span className="font-medium text-foreground">{row.original.name}</span>
        ),
      },
      {
        accessorKey: 'keyPrefix',
        header: t('table.keyPrefix'),
        cell: ({ row }) => (
          <code className="text-sm text-muted-foreground">{row.original.keyPrefix}...</code>
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
        accessorKey: 'expiresAt',
        header: t('table.expires'),
        cell: ({ row }) =>
          row.original.expiresAt ? formatDate(row.original.expiresAt) : t('table.noExpiry'),
      },
      {
        id: 'actions',
        header: t('table.actions'),
        cell: ({ row }) => {
          if (row.original.status === 'revoked') return null
          return (
            <div className="flex gap-1">
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
            </div>
          )
        },
        enableSorting: false,
      },
    ],
    [t, locale, onRevoke, onRotate, isRevoking, isRotating]
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

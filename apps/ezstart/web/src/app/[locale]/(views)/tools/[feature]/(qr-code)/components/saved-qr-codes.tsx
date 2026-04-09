'use client'

import {
  Button,
  Card,
  CardContent,
  CardHeader,
  DataTable,
  Div,
  H3,
  Icon,
  Input,
  Label,
  P,
  Span,
} from '@ezstart/ui/components'
import type { ColumnDef } from '@ezstart/ui/components'
import { useAuthStore } from '@ezstart/auth-sdk'
import { useRBAC } from '@ezstart/rbac'
import { useSafeTranslations } from '@/hooks/useSafeIntl'
import { useState, useMemo } from 'react'
import { useQRCodes, useDeleteQRCode } from '../hooks/useQRCodes'
import type { SavedQRCode } from '../hooks/useQRCodes'

const PAGE_SIZE = 10

export function SavedQRCodes() {
  const t = useSafeTranslations('qrCode')
  const { user, isAuthenticated } = useAuthStore()
  const rbac = useRBAC(user, 'ezstart')
  const isAdmin = rbac.hasAnyRole(['admin', 'superadmin'])

  const [page, setPage] = useState(0)
  const [filterEmail, setFilterEmail] = useState('')

  const { data, isLoading } = useQRCodes({
    limit: PAGE_SIZE,
    offset: page * PAGE_SIZE,
    enabled: isAuthenticated,
  })

  const deleteMutation = useDeleteQRCode(t)

  const columns = useMemo<ColumnDef<SavedQRCode, unknown>[]>(() => {
    const cols: ColumnDef<SavedQRCode, unknown>[] = [
      {
        accessorKey: 'title',
        header: t('saved.columns.title'),
        cell: ({ row }) => {
          const title = row.original.title
          const url = row.original.url
          return (
            <Div className="space-y-0.5 max-w-[200px]">
              <P size="sm" weight="medium" className="truncate">
                {title || '-'}
              </P>
              <P size="xs" className="text-muted-foreground truncate">
                {url}
              </P>
            </Div>
          )
        },
      },
      {
        accessorKey: 'size',
        header: t('saved.columns.size'),
        cell: ({ row }) => <Span className="text-sm">{row.original.size}px</Span>,
      },
      {
        accessorKey: 'createdAt',
        header: t('saved.columns.date'),
        cell: ({ row }) => (
          <Span className="text-sm text-muted-foreground">
            {new Date(row.original.createdAt).toLocaleDateString()}
          </Span>
        ),
      },
      {
        id: 'actions',
        header: t('saved.columns.actions'),
        cell: ({ row }) => (
          <Div className="flex items-center gap-1">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => window.open(row.original.url, '_blank')}
            >
              <Icon name="lucide:ExternalLink" size={14} ariaHidden />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => deleteMutation.mutate(row.original.id)}
              disabled={deleteMutation.isPending}
            >
              <Icon name="lucide:Trash2" size={14} className="text-destructive" ariaHidden />
            </Button>
          </Div>
        ),
      },
    ]

    // Add user email column for admins
    if (isAdmin) {
      cols.splice(1, 0, {
        accessorKey: 'userEmail',
        header: t('saved.columns.userEmail'),
        cell: ({ row }) => (
          <Span className="text-sm text-muted-foreground">{row.original.userEmail || '-'}</Span>
        ),
      })
    }

    return cols
  }, [t, isAdmin, deleteMutation])

  if (!isAuthenticated) {
    return (
      <Card variant="outline">
        <CardContent className="py-6">
          <Div layout="center" className="space-y-2">
            <Icon name="lucide:LogIn" className="w-8 h-8 text-muted-foreground" />
            <P className="text-muted-foreground">{t('saved.signInPrompt')}</P>
          </Div>
        </CardContent>
      </Card>
    )
  }

  const qrCodes = data?.qrCodes ?? []
  const total = data?.meta?.total ?? 0

  // Client-side email filter for admin view
  const filteredQRCodes =
    isAdmin && filterEmail
      ? qrCodes.filter(qr => qr.userEmail?.toLowerCase().includes(filterEmail.toLowerCase()))
      : qrCodes

  return (
    <Card>
      <CardHeader>
        <Div className="flex items-center justify-between">
          <H3>{isAdmin ? t('saved.titleAdmin') : t('saved.title')}</H3>
          <P size="sm" className="text-muted-foreground">
            {t('saved.totalCount', { count: total })}
          </P>
        </Div>

        {isAdmin && (
          <Div className="mt-2">
            <Label htmlFor="filter-email" className="sr-only">
              {t('saved.filterByEmail')}
            </Label>
            <Input
              id="filter-email"
              placeholder={t('saved.filterByEmail')}
              value={filterEmail}
              onChange={e => setFilterEmail(e.target.value)}
              className="max-w-xs"
            />
          </Div>
        )}
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <Div layout="center" className="py-8">
            <P className="text-muted-foreground">{t('saved.loading')}</P>
          </Div>
        ) : filteredQRCodes.length === 0 ? (
          <Div layout="center" className="py-8">
            <Icon name="lucide:QrCode" className="w-8 h-8 text-muted-foreground/40 mb-2" />
            <P className="text-muted-foreground">{t('saved.emptyState')}</P>
          </Div>
        ) : (
          <DataTable
            columns={columns}
            data={filteredQRCodes}
            pageSize={PAGE_SIZE}
            tableSize="compact"
          />
        )}

        {/* Server-side pagination */}
        {total > PAGE_SIZE && (
          <Div className="flex items-center justify-between pt-4">
            <P size="sm" className="text-muted-foreground">
              {t('saved.pagination', {
                from: page * PAGE_SIZE + 1,
                to: Math.min((page + 1) * PAGE_SIZE, total),
                total,
              })}
            </P>
            <Div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPage(p => Math.max(0, p - 1))}
                disabled={page === 0}
              >
                {t('saved.previous')}
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPage(p => p + 1)}
                disabled={(page + 1) * PAGE_SIZE >= total}
              >
                {t('saved.next')}
              </Button>
            </Div>
          </Div>
        )}
      </CardContent>
    </Card>
  )
}

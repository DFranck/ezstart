'use client'

import { useCallback, useEffect, useState } from 'react'
import { useTranslations } from 'next-intl'
import {
  Badge,
  Button,
  Card,
  Div,
  P,
  Skeleton,
  Span,
  DataTable,
  DataTableColumnHeader,
  type ColumnDef,
} from '@ezstart/ui/components'
import { callApi, parseApiError } from '@ezstart/fetch-client'

// ========================================
// Types
// ========================================

interface WaitlistEntry {
  _id: string
  email: string
  app: string
  status: 'pending' | 'invited' | 'registered'
  createdAt: string
}

interface WaitlistResponse {
  data: WaitlistEntry[]
  meta: { total: number; limit: number; offset: number }
}

// ========================================
// Constants
// ========================================

const PAGE_SIZE = 20

const statusVariantMap: Record<string, 'warning' | 'info' | 'success'> = {
  pending: 'warning',
  invited: 'info',
  registered: 'success',
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

// ========================================
// Component
// ========================================

export function WaitlistTable() {
  const t = useTranslations('admin.waitlist')

  // Data state
  const [entries, setEntries] = useState<WaitlistEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  // Fetch waitlist
  const fetchWaitlist = useCallback(async () => {
    setLoading(true)
    try {
      const response = await callApi<WaitlistResponse>('/admin/waitlist', {
        appName: 'ezauth',
        method: 'GET',
        query: { limit: String(PAGE_SIZE), offset: '0' },
      })
      if (response.ok) {
        setEntries(response.data.data || [])
      }
    } catch {
      // Error logged by callApi
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchWaitlist()
  }, [fetchWaitlist])

  // Invite handler
  const handleInvite = useCallback(
    async (entryId: string) => {
      setError('')
      try {
        const response = await callApi('/admin/waitlist/invite', {
          appName: 'ezauth',
          method: 'POST',
          body: { waitlistId: entryId },
        })
        if (!response.ok) {
          throw new Error(response.error || parseApiError(response.data) || t('inviteError'))
        }
        fetchWaitlist()
      } catch (err) {
        setError(err instanceof Error ? err.message : t('inviteError'))
      }
    },
    [fetchWaitlist, t]
  )

  // DataTable columns
  const columns: ColumnDef<WaitlistEntry>[] = [
    {
      accessorKey: 'email',
      header: ({ header }) => <DataTableColumnHeader header={header} title={t('columns.email')} />,
      cell: ({ row }) => <Span className="text-sm font-medium">{row.original.email}</Span>,
    },
    {
      accessorKey: 'app',
      header: ({ header }) => <DataTableColumnHeader header={header} title={t('columns.app')} />,
      cell: ({ row }) => (
        <Badge variant="outline" size="sm">
          {row.original.app}
        </Badge>
      ),
    },
    {
      accessorKey: 'status',
      header: ({ header }) => <DataTableColumnHeader header={header} title={t('columns.status')} />,
      cell: ({ row }) => {
        const status = row.original.status
        const statusKey = `status${status.charAt(0).toUpperCase()}${status.slice(1)}` as
          | 'statusPending'
          | 'statusInvited'
          | 'statusRegistered'
        return (
          <Badge variant={statusVariantMap[status] || 'secondary'} size="sm" dot>
            {t(statusKey)}
          </Badge>
        )
      },
    },
    {
      accessorKey: 'createdAt',
      header: ({ header }) => (
        <DataTableColumnHeader header={header} title={t('columns.createdAt')} />
      ),
      cell: ({ row }) => <Span className="text-sm">{formatDate(row.original.createdAt)}</Span>,
    },
    {
      id: 'actions',
      header: t('columns.actions'),
      cell: ({ row }) => {
        if (row.original.status !== 'pending') return null
        return (
          <Button variant="outline" size="sm" onClick={() => handleInvite(row.original._id)}>
            {t('invite')}
          </Button>
        )
      },
    },
  ]

  return (
    <Div className="space-y-4">
      {error && (
        <Div className="bg-destructive/15 border border-destructive/50 text-destructive px-4 py-3 rounded-md text-sm">
          {error}
        </Div>
      )}

      {loading ? (
        <Card className="p-8">
          <Div className="space-y-3">
            {Array.from({ length: 5 }).map((_, i) => (
              <Skeleton key={i} className="h-10 w-full" />
            ))}
          </Div>
        </Card>
      ) : entries.length === 0 ? (
        <Card className="p-8">
          <P className="text-center text-muted-foreground">{t('noWaitlist')}</P>
        </Card>
      ) : (
        <DataTable columns={columns} data={entries} pageSize={PAGE_SIZE} />
      )}
    </Div>
  )
}

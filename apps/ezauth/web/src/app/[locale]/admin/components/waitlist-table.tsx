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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  type ColumnDef,
} from '@ezstart/ui/components'
import { callApi, parseApiError } from '@ezstart/fetch-client'

// ========================================
// Types
// ========================================

interface WaitlistEntry {
  email: string
  status: 'pending' | 'invited' | 'activated' | 'rejected'
  accessCode: string | null
  invitedAt: string | null
  activatedAt: string | null
  addedAt: string
  notes: string
}

interface WaitlistResponse {
  entries: WaitlistEntry[]
  stats: {
    total: number
    pending: number
    invited: number
    activated: number
    rejected: number
  }
}

// ========================================
// Constants — known apps
// ========================================

const APPS = [
  'ezstart',
  'ezbill',
  'ezpay',
  'green-pulse',
  'fengshui',
  'asc-tcd',
  'gacha-analyzer',
  'ezauth',
] as const

// ========================================
// Constants
// ========================================

const PAGE_SIZE = 20

const statusVariantMap: Record<string, 'warning' | 'info' | 'success' | 'destructive'> = {
  pending: 'warning',
  invited: 'info',
  activated: 'success',
  rejected: 'destructive',
}

// ========================================
// Helpers
// ========================================

function formatDate(dateStr: string | null): string {
  if (!dateStr) return '—'
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

  // State
  const [selectedApp, setSelectedApp] = useState<string>(APPS[0])
  const [entries, setEntries] = useState<WaitlistEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  // Fetch waitlist for the selected app
  const fetchWaitlist = useCallback(async (appName: string) => {
    setLoading(true)
    setError('')
    try {
      const response = await callApi<WaitlistResponse>(`/admin/${appName}`, {
        appName: 'ezauth',
        method: 'GET',
      })
      if (response.ok) {
        setEntries(response.data.entries || [])
      }
    } catch {
      // Error logged by callApi
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchWaitlist(selectedApp)
  }, [fetchWaitlist, selectedApp])

  // Invite handler — email in URL path, no body needed
  const handleInvite = useCallback(
    async (email: string) => {
      setError('')
      try {
        const response = await callApi(
          `/admin/${selectedApp}/${encodeURIComponent(email)}/invite`,
          {
            appName: 'ezauth',
            method: 'POST',
          }
        )
        if (!response.ok) {
          throw new Error(response.error || parseApiError(response.data) || t('inviteError'))
        }
        fetchWaitlist(selectedApp)
      } catch (err) {
        setError(err instanceof Error ? err.message : t('inviteError'))
      }
    },
    [fetchWaitlist, selectedApp, t]
  )

  // DataTable columns
  const columns: ColumnDef<WaitlistEntry>[] = [
    {
      accessorKey: 'email',
      header: ({ header }) => <DataTableColumnHeader header={header} title={t('columns.email')} />,
      cell: ({ row }) => <Span className="text-sm font-medium">{row.original.email}</Span>,
    },
    {
      accessorKey: 'status',
      header: ({ header }) => <DataTableColumnHeader header={header} title={t('columns.status')} />,
      cell: ({ row }) => {
        const status = row.original.status
        const statusKey = `status${status.charAt(0).toUpperCase()}${status.slice(1)}` as
          | 'statusPending'
          | 'statusInvited'
          | 'statusActivated'
          | 'statusRejected'
        return (
          <Badge variant={statusVariantMap[status] || 'secondary'} size="sm" dot>
            {t(statusKey)}
          </Badge>
        )
      },
    },
    {
      accessorKey: 'addedAt',
      header: ({ header }) => (
        <DataTableColumnHeader header={header} title={t('columns.addedAt')} />
      ),
      cell: ({ row }) => <Span className="text-sm">{formatDate(row.original.addedAt)}</Span>,
    },
    {
      accessorKey: 'invitedAt',
      header: ({ header }) => (
        <DataTableColumnHeader header={header} title={t('columns.invitedAt')} />
      ),
      cell: ({ row }) => <Span className="text-sm">{formatDate(row.original.invitedAt)}</Span>,
    },
    {
      id: 'actions',
      header: t('columns.actions'),
      cell: ({ row }) => {
        if (row.original.status !== 'pending') return null
        return (
          <Button variant="outline" size="sm" onClick={() => handleInvite(row.original.email)}>
            {t('invite')}
          </Button>
        )
      },
    },
  ]

  return (
    <Div className="space-y-4">
      <Div className="flex items-center gap-3">
        <Select value={selectedApp} onValueChange={setSelectedApp}>
          <SelectTrigger className="w-[200px]">
            <SelectValue placeholder={t('selectApp')} />
          </SelectTrigger>
          <SelectContent>
            {APPS.map(app => (
              <SelectItem key={app} value={app}>
                {app}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </Div>

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

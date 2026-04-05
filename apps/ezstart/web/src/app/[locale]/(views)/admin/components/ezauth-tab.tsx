'use client'

import { callApi } from '@ezstart/fetch-client'
import { logger } from '@ezstart/logger'
import {
  Badge,
  Button,
  Card,
  CardContent,
  CardHeader,
  type ColumnDef,
  DataTable,
  Div,
  H2,
  Icon,
  P,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Spinner,
} from '@ezstart/ui/components'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useTranslations } from 'next-intl'
import { useState } from 'react'
import { toast } from 'sonner'

const APPS = ['ezbill', 'ezstart', 'green-pulse', 'fengshui', 'asc-tcd', 'ezpay', 'gacha-analyzer']

interface WaitlistEntry {
  email: string
  status: 'pending' | 'invited' | 'activated' | 'rejected'
  accessCode: string | null
  invitedAt: string | null
  activatedAt: string | null
  addedAt: string
  notes: string
}

interface WaitlistStats {
  total: number
  pending: number
  invited: number
  activated: number
  rejected: number
}

interface WaitlistResponse {
  appName: string
  entries: WaitlistEntry[]
  pagination: {
    page: number
    limit: number
    total: number
    totalPages: number
  }
  stats: WaitlistStats
}

function StatusBadge({ status }: { status: WaitlistEntry['status'] }) {
  const variants: Record<string, 'default' | 'secondary' | 'destructive' | 'outline'> = {
    pending: 'outline',
    invited: 'secondary',
    activated: 'default',
    rejected: 'destructive',
  }
  return <Badge variant={variants[status] || 'outline'}>{status}</Badge>
}

function WaitlistStatsCards({ stats }: { stats: WaitlistStats }) {
  const t = useTranslations('admin.ezauth')

  const items = [
    { label: t('stats.total'), value: stats.total, variant: 'default' as const },
    { label: t('stats.pending'), value: stats.pending, variant: 'outline' as const },
    { label: t('stats.invited'), value: stats.invited, variant: 'secondary' as const },
    { label: t('stats.activated'), value: stats.activated, variant: 'default' as const },
    { label: t('stats.rejected'), value: stats.rejected, variant: 'destructive' as const },
  ]

  return (
    <Div className="grid grid-cols-2 sm:grid-cols-5 gap-3 mb-6">
      {items.map(item => (
        <Card key={item.label} variant="outline">
          <CardContent className="p-3 text-center">
            <P className="text-2xl font-bold">{item.value}</P>
            <Badge variant={item.variant} className="mt-1">
              {item.label}
            </Badge>
          </CardContent>
        </Card>
      ))}
    </Div>
  )
}

export function EZAuthTab() {
  const t = useTranslations('admin.ezauth')
  const queryClient = useQueryClient()
  const [selectedApp, setSelectedApp] = useState<string>(APPS[0] ?? 'ezbill')
  const [page, setPage] = useState(1)
  const limit = 20

  const { data, isLoading, error } = useQuery({
    queryKey: ['admin', 'waitlist', selectedApp, page, limit],
    queryFn: async () => {
      const response = await callApi<WaitlistResponse>(`/admin/${selectedApp}`, {
        appName: 'ezauth',
        query: { page: String(page), limit: String(limit) },
      })

      if (response.ok && response.data) {
        return response.data
      }

      throw new Error(`Failed to fetch waitlist (${response.status})`)
    },
    staleTime: 30000,
  })

  const inviteMutation = useMutation({
    mutationFn: async (email: string) => {
      const response = await callApi(`/admin/${selectedApp}/${email}/invite`, {
        appName: 'ezauth',
        method: 'POST',
      })

      if (!response.ok) {
        throw new Error(response.error || 'Failed to invite user')
      }

      return response.data
    },
    onSuccess: (_data, email) => {
      toast.success(t('inviteSuccess', { email }))
      queryClient.invalidateQueries({ queryKey: ['admin', 'waitlist', selectedApp] })
    },
    onError: (err: Error) => {
      logger.error('Invite error:', err)
      toast.error(t('inviteError', { message: err.message }))
    },
  })

  const entries = data?.entries ?? []
  const stats = data?.stats ?? { total: 0, pending: 0, invited: 0, activated: 0, rejected: 0 }
  const pagination = data?.pagination ?? { page: 1, limit, total: 0, totalPages: 0 }

  const columns: ColumnDef<WaitlistEntry>[] = [
    {
      accessorKey: 'email',
      header: t('columns.email'),
      cell: ({ row }) => <P className="text-sm font-medium">{row.original.email}</P>,
    },
    {
      accessorKey: 'status',
      header: t('columns.status'),
      cell: ({ row }) => <StatusBadge status={row.original.status} />,
    },
    {
      accessorKey: 'addedAt',
      header: t('columns.date'),
      cell: ({ row }) => (
        <P className="text-sm text-muted-foreground">
          {new Date(row.original.addedAt).toLocaleDateString()}
        </P>
      ),
    },
    {
      id: 'actions',
      header: t('columns.actions'),
      cell: ({ row }) => {
        const entry = row.original
        if (entry.status === 'pending') {
          return (
            <Button
              size="sm"
              variant="outline"
              onClick={() => inviteMutation.mutate(entry.email)}
              disabled={inviteMutation.isPending}
            >
              <Icon name="lucide:Mail" className="mr-1" />
              {t('invite')}
            </Button>
          )
        }
        return (
          <P className="text-xs text-muted-foreground">
            {entry.status === 'invited' && entry.invitedAt
              ? t('invitedOn', { date: new Date(entry.invitedAt).toLocaleDateString() })
              : entry.status}
          </P>
        )
      },
      enableSorting: false,
    },
  ]

  return (
    <Div className="space-y-4">
      <Card>
        <CardHeader>
          <Div className="flex items-center justify-between flex-wrap gap-4">
            <H2>{t('title')}</H2>
            <Select value={selectedApp} onValueChange={v => { setSelectedApp(v); setPage(1) }}>
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
        </CardHeader>
        <CardContent>
          {isLoading && <Spinner size="lg" />}

          {error && (
            <Div className="bg-destructive/10 text-destructive px-4 py-3 rounded-md">
              <P className="font-medium">{t('errorLoading')}</P>
              <P className="text-sm mt-1">
                {error instanceof Error ? error.message : String(error)}
              </P>
            </Div>
          )}

          {!isLoading && !error && (
            <>
              <WaitlistStatsCards stats={stats} />

              <DataTable
                columns={columns}
                data={entries}
                filterColumn="email"
                filterPlaceholder={t('columns.email')}
                pageSize={limit}
                hidePagination
              />

              {/* Server-side pagination */}
              <Div className="flex items-center justify-between">
                <P className="text-sm text-muted-foreground">
                  {t('showing', {
                    count: entries.length,
                    total: pagination.total,
                  })}
                </P>
                <Div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={pagination.page === 1}
                    onClick={() => setPage(p => p - 1)}
                  >
                    {t('previous')}
                  </Button>
                  <P className="text-sm py-2 px-3">
                    {t('pageOf', {
                      page: pagination.page,
                      totalPages: pagination.totalPages || 1,
                    })}
                  </P>
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={pagination.page >= pagination.totalPages}
                    onClick={() => setPage(p => p + 1)}
                  >
                    {t('next')}
                  </Button>
                </Div>
              </Div>
            </>
          )}
        </CardContent>
      </Card>
    </Div>
  )
}

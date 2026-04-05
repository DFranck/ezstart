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
  Spinner,
} from '@ezstart/ui/components'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useTranslations } from 'next-intl'
import { useState } from 'react'
import { toast } from 'sonner'

interface Payment {
  _id: string
  paymentId: string
  type: 'donation' | 'purchase' | 'subscription' | 'invoice'
  amount: number
  currency: string
  status: 'pending' | 'completed' | 'failed' | 'refunded' | 'cancelled'
  projectId: string
  customerEmail?: string
  createdAt: string
}

interface PaymentsResponse {
  data: Payment[]
  meta: {
    total: number
    limit: number
    offset: number
  }
}

function PaymentStatusBadge({ status }: { status: Payment['status'] }) {
  const variants: Record<string, 'default' | 'secondary' | 'destructive' | 'outline'> = {
    pending: 'outline',
    completed: 'default',
    failed: 'destructive',
    refunded: 'secondary',
    cancelled: 'destructive',
  }
  return <Badge variant={variants[status] || 'outline'}>{status}</Badge>
}

function StatsCards({
  payments,
  total,
}: {
  payments: Payment[]
  total: number
}) {
  const t = useTranslations('admin.ezpay')

  const totalRevenue = payments
    .filter(p => p.status === 'completed')
    .reduce((sum, p) => sum + p.amount, 0)

  const totalRefunds = payments.filter(p => p.status === 'refunded').length

  const items = [
    {
      label: t('stats.totalRevenue'),
      value: `${(totalRevenue / 100).toFixed(2)} EUR`,
      icon: 'lucide:DollarSign' as const,
    },
    {
      label: t('stats.totalTransactions'),
      value: String(total),
      icon: 'lucide:CreditCard' as const,
    },
    {
      label: t('stats.totalRefunds'),
      value: String(totalRefunds),
      icon: 'lucide:RotateCcw' as const,
    },
  ]

  return (
    <Div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
      {items.map(item => (
        <Card key={item.label} variant="outline">
          <CardContent className="p-4">
            <Div className="flex items-center gap-3">
              <Icon name={item.icon} className="w-5 h-5 text-muted-foreground" />
              <Div>
                <P className="text-sm text-muted-foreground">{item.label}</P>
                <P className="text-xl font-bold">{item.value}</P>
              </Div>
            </Div>
          </CardContent>
        </Card>
      ))}
    </Div>
  )
}

export function EZPayTab() {
  const t = useTranslations('admin.ezpay')
  const queryClient = useQueryClient()
  const [offset, setOffset] = useState(0)
  const limit = 20

  const { data, isLoading, error } = useQuery({
    queryKey: ['admin', 'payments', offset, limit],
    queryFn: async () => {
      const response = await callApi<PaymentsResponse>('/payments', {
        appName: 'ezpay',
        query: { limit: String(limit), offset: String(offset) },
      })

      if (response.ok && response.data) {
        return response.data
      }

      throw new Error(`Failed to fetch payments (${response.status})`)
    },
    staleTime: 30000,
  })

  const refundMutation = useMutation({
    mutationFn: async (paymentId: string) => {
      const response = await callApi(`/payments/${paymentId}/refund`, {
        appName: 'ezpay',
        method: 'POST',
      })

      if (!response.ok) {
        throw new Error(response.error || 'Failed to refund payment')
      }

      return response.data
    },
    onSuccess: () => {
      toast.success(t('refundSuccess'))
      queryClient.invalidateQueries({ queryKey: ['admin', 'payments'] })
    },
    onError: (err: Error) => {
      logger.error('Refund error:', err)
      toast.error(t('refundError', { message: err.message }))
    },
  })

  // Handle the response format: EZPay returns { success, data: [...], meta: {...} }
  // callApi wraps it so response.data = { data: [...], meta: {...} }
  // But EZPay uses sendSuccess which returns { success: true, data: payments, meta }
  // So the actual payments array might be at data.data or just data depending on the wrapper
  const rawData = data as unknown as { data?: Payment[]; meta?: { total: number; limit: number; offset: number } } | Payment[]
  let payments: Payment[] = []
  let meta = { total: 0, limit, offset: 0 }

  if (Array.isArray(rawData)) {
    payments = rawData
  } else if (rawData && Array.isArray(rawData.data)) {
    payments = rawData.data
    meta = rawData.meta ?? meta
  } else if (rawData && !Array.isArray(rawData)) {
    // Direct response from sendSuccess wrapping
    const any = rawData as Record<string, unknown>
    if (Array.isArray(any.payments)) {
      payments = any.payments as Payment[]
    }
    if (any.meta) {
      meta = any.meta as typeof meta
    }
  }

  const currentPage = Math.floor(offset / limit) + 1
  const totalPages = Math.ceil(meta.total / limit) || 1

  const columns: ColumnDef<Payment>[] = [
    {
      accessorKey: 'paymentId',
      header: t('columns.id'),
      cell: ({ row }) => (
        <P className="text-xs font-mono text-muted-foreground">
          {row.original.paymentId?.slice(0, 12) ?? row.original._id.slice(0, 12)}...
        </P>
      ),
    },
    {
      accessorKey: 'type',
      header: t('columns.type'),
      cell: ({ row }) => <Badge variant="outline">{row.original.type}</Badge>,
    },
    {
      accessorKey: 'amount',
      header: t('columns.amount'),
      cell: ({ row }) => (
        <P className="font-medium">
          {(row.original.amount / 100).toFixed(2)} {row.original.currency?.toUpperCase()}
        </P>
      ),
    },
    {
      accessorKey: 'status',
      header: t('columns.status'),
      cell: ({ row }) => <PaymentStatusBadge status={row.original.status} />,
    },
    {
      accessorKey: 'projectId',
      header: t('columns.project'),
      cell: ({ row }) => (
        <P className="text-sm text-muted-foreground">{row.original.projectId}</P>
      ),
    },
    {
      accessorKey: 'createdAt',
      header: t('columns.date'),
      cell: ({ row }) => (
        <P className="text-sm text-muted-foreground">
          {new Date(row.original.createdAt).toLocaleDateString()}
        </P>
      ),
    },
    {
      id: 'actions',
      header: t('columns.actions'),
      cell: ({ row }) => {
        const payment = row.original
        if (payment.status === 'completed') {
          return (
            <Button
              size="sm"
              variant="destructive"
              onClick={() => refundMutation.mutate(payment._id)}
              disabled={refundMutation.isPending}
            >
              <Icon name="lucide:RotateCcw" className="mr-1" />
              {t('refund')}
            </Button>
          )
        }
        return <P className="text-xs text-muted-foreground">{payment.status}</P>
      },
      enableSorting: false,
    },
  ]

  return (
    <Div className="space-y-4">
      <Card>
        <CardHeader>
          <H2>{t('title')}</H2>
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
              <StatsCards payments={payments} total={meta.total} />

              <DataTable
                columns={columns}
                data={payments}
                pageSize={limit}
                hidePagination
              />

              {/* Server-side pagination */}
              <Div className="flex items-center justify-between">
                <P className="text-sm text-muted-foreground">
                  {t('showing', {
                    count: payments.length,
                    total: meta.total,
                  })}
                </P>
                <Div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={offset === 0}
                    onClick={() => setOffset(o => Math.max(0, o - limit))}
                  >
                    {t('previous')}
                  </Button>
                  <P className="text-sm py-2 px-3">
                    {t('pageOf', { page: currentPage, totalPages })}
                  </P>
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={offset + limit >= meta.total}
                    onClick={() => setOffset(o => o + limit)}
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

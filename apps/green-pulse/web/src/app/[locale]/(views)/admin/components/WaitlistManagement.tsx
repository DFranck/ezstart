'use client'

import React, { useState } from 'react'
import { useAuthStore } from '@ezstart/auth-sdk'
import { callApi } from '@ezstart/fetch-client'
import {
  Badge,
  Button,
  Card,
  CardContent,
  CardHeader,
  Div,
  H3,
  Icon,
  P,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@ezstart/ui/components'
import { runWithFeedback, toast } from '@ezstart/ui/utils'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useTranslations } from 'next-intl'

type WaitlistEntry = {
  _id: string
  email: string
  status: 'pending' | 'invited' | 'activated' | 'rejected'
  accessCode: string | null
  invitedAt: Date | null
  activatedAt: Date | null
  addedAt: Date
  notes: string
}

type WaitlistResponse = {
  entries: WaitlistEntry[]
  stats: {
    total: number
    pending: number
    invited: number
    activated: number
    rejected: number
  }
}

export function WaitlistManagement() {
  const t = useTranslations('admin.waitlist')
  const { user } = useAuthStore()
  const queryClient = useQueryClient()
  const [filter, setFilter] = useState<'all' | 'pending' | 'invited' | 'activated' | 'rejected'>(
    'pending'
  )

  // Fetch waitlist
  const { data, isLoading, error } = useQuery<WaitlistResponse>({
    queryKey: ['waitlist', 'green-pulse'],
    queryFn: async () => {
      const response = await callApi<WaitlistResponse>('/admin/green-pulse', {
        appName: 'ezauth',
      })

      if (!response.ok || !response.data) {
        throw new Error(`Failed to fetch waitlist: ${response.status}`)
      }

      return response.data
    },
    enabled: !!user,
  })

  // Approve mutation (invite)
  const approveMutation = useMutation({
    mutationFn: async (email: string) => {
      const response = await callApi(`/admin/green-pulse/${encodeURIComponent(email)}/invite`, {
        appName: 'ezauth',
        method: 'POST',
        body: { notes: 'Approved via admin panel' },
      })
      if (!response.ok) throw new Error('Failed to approve')
      return response.data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['waitlist'] })
    },
  })

  // Reject mutation (update user to remove beta-tester role if needed)
  const rejectMutation = useMutation({
    mutationFn: async (email: string) => {
      // For now, just update status in waitlist
      // TODO: If user exists, remove beta-tester role
      const response = await callApi(`/admin/green-pulse/${encodeURIComponent(email)}/reject`, {
        appName: 'ezauth',
        method: 'POST',
      })
      if (!response.ok) throw new Error('Failed to reject')
      return response.data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['waitlist'] })
    },
  })

  const handleApprove = async (email: string) => {
    await runWithFeedback({
      action: () => approveMutation.mutateAsync(email),
      toastLoading: { message: 'Approving...' },
      toastSuccess: { message: `✅ ${email} approved! Access code generated.` },
      toastError: { message: 'Failed to approve' },
    })
  }

  const handleReject = async (email: string) => {
    await runWithFeedback({
      action: () => rejectMutation.mutateAsync(email),
      toastLoading: { message: 'Rejecting...' },
      toastSuccess: { message: `❌ ${email} rejected` },
      toastError: { message: 'Failed to reject' },
    })
  }

  const filteredEntries =
    data?.entries.filter(entry => (filter === 'all' ? true : entry.status === filter)) || []

  const getStatusBadge = (status: WaitlistEntry['status']) => {
    const variants = {
      pending: 'secondary',
      invited: 'default',
      activated: 'default',
      rejected: 'destructive',
    } as const

    const labels = {
      pending: `⏳ ${t('status.pending')}`,
      invited: `✉️ ${t('status.invited')}`,
      activated: `✅ ${t('status.activated')}`,
      rejected: `❌ ${t('status.rejected')}`,
    }

    return <Badge variant={variants[status]}>{labels[status]}</Badge>
  }

  if (isLoading) {
    return (
      <Card>
        <CardContent className="py-12 text-center">
          <Icon name="lucide:Loader2" className="w-8 h-8 mx-auto animate-spin" />
          <P className="text-muted-foreground mt-2">{t('loading')}</P>
        </CardContent>
      </Card>
    )
  }

  if (error) {
    return (
      <Card>
        <CardContent className="py-12 text-center">
          <Icon name="lucide:AlertCircle" className="w-12 h-12 mx-auto text-destructive mb-2" />
          <P className="text-destructive font-medium">{t('loadFailed')}</P>
          <P className="text-sm text-muted-foreground mt-2">
            {error instanceof Error ? error.message : 'Unknown error'}
          </P>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <Div className="flex items-center justify-between">
          <Div>
            <H3 className="flex items-center gap-2">
              <Icon name="lucide:UserPlus" />
              {t('management')}
            </H3>
            <P className="text-sm text-muted-foreground mt-1">{t('manageDescription')}</P>
          </Div>
          <Div className="flex gap-2">
            <Badge variant="outline">{t('total', { count: data?.stats.total || 0 })}</Badge>
            <Badge variant="secondary">{t('pending', { count: data?.stats.pending || 0 })}</Badge>
            <Badge variant="default">{t('activated', { count: data?.stats.activated || 0 })}</Badge>
          </Div>
        </Div>
      </CardHeader>
      <CardContent>
        {/* Filter tabs */}
        <Div className="flex gap-2 mb-4 flex-wrap">
          {(['all', 'pending', 'invited', 'activated', 'rejected'] as const).map(f => {
            const filterLabels = {
              all: t('all'),
              pending: t('filterPending'),
              invited: t('filterInvited'),
              activated: t('filterActivated'),
              rejected: t('filterRejected'),
            }
            return (
              <Button
                key={f}
                size="sm"
                variant={filter === f ? 'default' : 'outline'}
                onClick={() => setFilter(f)}
              >
                {filterLabels[f]}
                {f !== 'all' && ` (${data?.stats[f] || 0})`}
              </Button>
            )
          })}
        </Div>

        {/* Table */}
        {filteredEntries.length === 0 ? (
          <Div className="text-center py-12">
            <Icon name="lucide:Inbox" className="w-12 h-12 mx-auto text-muted-foreground mb-2" />
            <P className="text-muted-foreground">{t('noEntries')}</P>
          </Div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t('headers.email')}</TableHead>
                <TableHead>{t('headers.status')}</TableHead>
                <TableHead>{t('headers.added')}</TableHead>
                <TableHead>{t('headers.accessCode')}</TableHead>
                <TableHead className="text-right">{t('headers.actions')}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredEntries.map((entry, index) => (
                <TableRow key={entry._id || `waitlist-${index}`}>
                  <TableCell className="font-medium">{entry.email}</TableCell>
                  <TableCell>{getStatusBadge(entry.status)}</TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {new Date(entry.addedAt).toLocaleDateString()}
                  </TableCell>
                  <TableCell className="font-mono text-xs">
                    {entry.accessCode ? (
                      <Badge
                        variant="outline"
                        className="cursor-pointer"
                        onClick={() => {
                          navigator.clipboard.writeText(entry.accessCode!)
                          toast.success(t('actions.codeCopied'))
                        }}
                      >
                        {entry.accessCode}
                      </Badge>
                    ) : (
                      <span className="text-muted-foreground">-</span>
                    )}
                  </TableCell>
                  <TableCell className="text-right">
                    <Div className="flex gap-2 justify-end">
                      {entry.status === 'pending' && (
                        <React.Fragment key={`actions-${entry._id}`}>
                          <Button
                            size="sm"
                            onClick={() => handleApprove(entry.email)}
                            disabled={approveMutation.isPending}
                          >
                            <Icon name="lucide:Check" className="mr-1" />
                            {t('actions.approve')}
                          </Button>
                          <Button
                            size="sm"
                            variant="destructive"
                            onClick={() => handleReject(entry.email)}
                            disabled={rejectMutation.isPending}
                          >
                            <Icon name="lucide:X" className="mr-1" />
                            {t('actions.reject')}
                          </Button>
                        </React.Fragment>
                      )}
                      {entry.status === 'invited' && (
                        <Badge variant="outline" key={`invited-${entry._id}`}>
                          ✉️ {t('actions.waitingRegistration')}
                        </Badge>
                      )}
                      {entry.status === 'activated' && (
                        <Badge variant="default" key={`activated-${entry._id}`}>
                          ✅ {t('actions.activeUser')}
                        </Badge>
                      )}
                      {entry.status === 'rejected' && (
                        <Badge variant="destructive" key={`rejected-${entry._id}`}>
                          ❌ {t('status.rejected')}
                        </Badge>
                      )}
                    </Div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  )
}

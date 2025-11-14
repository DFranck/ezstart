'use client'

import { getApiUrl } from '@ezstart/config'
import { useAuthStore } from '@ezstart/auth-sdk'
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
import { useState } from 'react'

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
  const { user } = useAuthStore()
  const queryClient = useQueryClient()
  const [filter, setFilter] = useState<'all' | 'pending' | 'invited' | 'activated' | 'rejected'>('pending')

  // Get token from localStorage
  const getToken = () => {
    if (typeof window === 'undefined') return null
    const storage = localStorage.getItem('ezauth-storage')
    if (!storage) return null
    try {
      const parsed = JSON.parse(storage)
      return parsed.state?.token || null
    } catch {
      return null
    }
  }

  // Fetch waitlist
  const { data, isLoading } = useQuery<WaitlistResponse>({
    queryKey: ['waitlist', 'green-pulse'],
    queryFn: async () => {
      const token = getToken()
      const apiUrl = getApiUrl('ezauth')
      const response = await fetch(`${apiUrl}/api/admin/green-pulse`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      })
      if (!response.ok) throw new Error('Failed to fetch waitlist')
      return response.json()
    },
    enabled: !!user,
  })

  // Approve mutation (invite)
  const approveMutation = useMutation({
    mutationFn: async (email: string) => {
      const token = getToken()
      const apiUrl = getApiUrl('ezauth')
      const response = await fetch(`${apiUrl}/api/admin/green-pulse/${encodeURIComponent(email)}/invite`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ notes: 'Approved via admin panel' }),
      })
      if (!response.ok) throw new Error('Failed to approve')
      return response.json()
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['waitlist'] })
    },
  })

  // Reject mutation (update user to remove beta-tester role if needed)
  const rejectMutation = useMutation({
    mutationFn: async (email: string) => {
      const token = getToken()
      // For now, just update status in waitlist
      // TODO: If user exists, remove beta-tester role
      const apiUrl = getApiUrl('ezauth')
      const response = await fetch(`${apiUrl}/api/admin/green-pulse/${encodeURIComponent(email)}/reject`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
      })
      if (!response.ok) throw new Error('Failed to reject')
      return response.json()
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

  const filteredEntries = data?.entries.filter(entry =>
    filter === 'all' ? true : entry.status === filter
  ) || []

  const getStatusBadge = (status: WaitlistEntry['status']) => {
    const variants = {
      pending: 'secondary',
      invited: 'default',
      activated: 'default',
      rejected: 'destructive',
    } as const

    const labels = {
      pending: '⏳ Pending',
      invited: '✉️ Invited',
      activated: '✅ Activated',
      rejected: '❌ Rejected',
    }

    return (
      <Badge variant={variants[status]}>
        {labels[status]}
      </Badge>
    )
  }

  if (isLoading) {
    return (
      <Card>
        <CardContent className="py-12 text-center">
          <Icon name="lucide:Loader2" className="w-8 h-8 mx-auto animate-spin" />
          <P className="text-muted-foreground mt-2">Loading waitlist...</P>
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
              Beta Waitlist Management
            </H3>
            <P className="text-sm text-muted-foreground mt-1">
              Approve or reject beta access requests
            </P>
          </Div>
          <Div className="flex gap-2">
            <Badge variant="outline">
              Total: {data?.stats.total || 0}
            </Badge>
            <Badge variant="secondary">
              Pending: {data?.stats.pending || 0}
            </Badge>
            <Badge variant="default">
              Activated: {data?.stats.activated || 0}
            </Badge>
          </Div>
        </Div>
      </CardHeader>
      <CardContent>
        {/* Filter tabs */}
        <Div className="flex gap-2 mb-4 flex-wrap">
          {(['all', 'pending', 'invited', 'activated', 'rejected'] as const).map(f => (
            <Button
              key={f}
              size="sm"
              variant={filter === f ? 'default' : 'outline'}
              onClick={() => setFilter(f)}
            >
              {f.charAt(0).toUpperCase() + f.slice(1)}
              {f !== 'all' && ` (${data?.stats[f] || 0})`}
            </Button>
          ))}
        </Div>

        {/* Table */}
        {filteredEntries.length === 0 ? (
          <Div className="text-center py-12">
            <Icon name="lucide:Inbox" className="w-12 h-12 mx-auto text-muted-foreground mb-2" />
            <P className="text-muted-foreground">No entries found</P>
          </Div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Email</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Added</TableHead>
                <TableHead>Access Code</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredEntries.map(entry => (
                <TableRow key={entry._id}>
                  <TableCell className="font-medium">{entry.email}</TableCell>
                  <TableCell>{getStatusBadge(entry.status)}</TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {new Date(entry.addedAt).toLocaleDateString()}
                  </TableCell>
                  <TableCell className="font-mono text-xs">
                    {entry.accessCode ? (
                      <Badge variant="outline" className="cursor-pointer" onClick={() => {
                        navigator.clipboard.writeText(entry.accessCode!)
                        toast.success('Code copied!')
                      }}>
                        {entry.accessCode}
                      </Badge>
                    ) : (
                      <span className="text-muted-foreground">-</span>
                    )}
                  </TableCell>
                  <TableCell className="text-right">
                    <Div className="flex gap-2 justify-end">
                      {entry.status === 'pending' && (
                        <>
                          <Button
                            size="sm"
                            onClick={() => handleApprove(entry.email)}
                            disabled={approveMutation.isPending}
                            className="bg-green-600 hover:bg-green-700"
                          >
                            <Icon name="lucide:Check" className="mr-1" />
                            Approve
                          </Button>
                          <Button
                            size="sm"
                            variant="destructive"
                            onClick={() => handleReject(entry.email)}
                            disabled={rejectMutation.isPending}
                          >
                            <Icon name="lucide:X" className="mr-1" />
                            Reject
                          </Button>
                        </>
                      )}
                      {entry.status === 'invited' && (
                        <Badge variant="outline">
                          ✉️ Waiting for registration
                        </Badge>
                      )}
                      {entry.status === 'activated' && (
                        <Badge variant="default">
                          ✅ Active user
                        </Badge>
                      )}
                      {entry.status === 'rejected' && (
                        <Badge variant="destructive">
                          ❌ Rejected
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

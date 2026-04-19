'use client'

import {
  Badge,
  Button,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  Div,
  P,
  Spinner,
} from '@ezstart/ui/components'
import { BackButton } from '@ezstart/ui/components'
import { toast } from '@ezstart/ui/utils'
import { apiCall } from '@ezstart/api-sdk'
import { useAuthStore } from '@ezstart/auth-sdk'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useLocale, useTranslations } from 'next-intl'
import { useCallback } from 'react'

interface Session {
  id: string
  userAgent: string | null
  ip: string | null
  createdAt: string
  expiresAt: string
  isCurrent: boolean
}

export default function SessionsPage() {
  const t = useTranslations('sessions')
  const locale = useLocale()
  const queryClient = useQueryClient()
  const refreshToken = useAuthStore(state => state.refreshToken)

  const parseUserAgent = useCallback(
    (ua: string | null): string => {
      if (!ua) return t('unknownDevice')

      let browser = t('unknownBrowser')
      if (ua.includes('Firefox/')) browser = 'Firefox'
      else if (ua.includes('Edg/')) browser = 'Edge'
      else if (ua.includes('Chrome/')) browser = 'Chrome'
      else if (ua.includes('Safari/') && !ua.includes('Chrome')) browser = 'Safari'

      let os = t('unknownOS')
      if (ua.includes('Windows')) os = 'Windows'
      else if (ua.includes('Mac OS')) os = 'macOS'
      else if (ua.includes('Linux')) os = 'Linux'
      else if (ua.includes('Android')) os = 'Android'
      else if (ua.includes('iPhone') || ua.includes('iPad')) os = 'iOS'

      return t('deviceOn', { browser, os })
    },
    [t]
  )

  const formatDate = useCallback(
    (iso: string): string =>
      new Date(iso).toLocaleDateString(locale, {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      }),
    [locale]
  )

  // React Query: fetch sessions
  const {
    data: sessions = [],
    isLoading,
    isError,
    refetch,
  } = useQuery({
    queryKey: ['sessions'],
    queryFn: async () => {
      const headers: Record<string, string> = {}
      if (refreshToken) {
        headers['X-Refresh-Token'] = refreshToken
      }
      const data = await apiCall<{ sessions: Session[] } | Session[]>('/auth/sessions', {
        appName: 'ezauth',
        method: 'GET',
        headers,
      })
      if (Array.isArray(data)) return data
      return data?.sessions ?? []
    },
  })

  // Revoke single session
  const revokeMutation = useMutation({
    mutationFn: async (sessionId: string) => {
      await apiCall(`/auth/sessions/${sessionId}`, {
        appName: 'ezauth',
        method: 'DELETE',
      })
      return sessionId
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sessions'] })
    },
    onError: (err: Error) => {
      toast.error(err.message || t('revokeError'))
    },
  })

  // Revoke all sessions
  const revokeAllMutation = useMutation({
    mutationFn: () =>
      apiCall('/auth/sessions', {
        appName: 'ezauth',
        method: 'DELETE',
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sessions'] })
    },
    onError: (err: Error) => {
      toast.error(err.message || t('revokeAllError'))
    },
  })

  if (isLoading) {
    return (
      <Div className="flex flex-1 items-center justify-center min-h-[50vh]">
        <Spinner variant="primary" size="lg" />
      </Div>
    )
  }

  return (
    <Div className="flex flex-1 items-center justify-center px-2">
      <Card className="max-w-lg w-full relative">
        <Div className="absolute top-4 left-4">
          <BackButton />
        </Div>

        <CardHeader className="text-center pb-4">
          <CardTitle className="text-xl md:text-2xl font-bold">{t('title')}</CardTitle>
          <CardDescription>{t('description')}</CardDescription>
        </CardHeader>

        <CardContent className="space-y-4">
          {isError && (
            <Div className="space-y-3 text-center">
              <P size="sm" className="text-destructive">
                {t('fetchError')}
              </P>
              <Button variant="outline" size="sm" onClick={() => refetch()}>
                {t('retry')}
              </Button>
            </Div>
          )}

          {!isError && sessions.length === 0 && (
            <P size="sm" className="text-muted-foreground text-center">
              {t('noSessions')}
            </P>
          )}

          {sessions.map(session => (
            <Div
              key={session.id}
              className={`flex items-center justify-between border rounded-lg p-3 gap-3 ${
                session.isCurrent ? 'border-primary bg-primary/5 ring-1 ring-primary/20' : ''
              }`}
            >
              <Div className="flex-1 min-w-0">
                <Div className="flex items-center gap-2">
                  <P size="sm" className="font-medium truncate">
                    {parseUserAgent(session.userAgent)}
                  </P>
                  {session.isCurrent && (
                    <Badge variant="default" className="shrink-0 text-xs">
                      {t('currentSession')}
                    </Badge>
                  )}
                </Div>
                <P size="xs" className="text-muted-foreground">
                  {session.ip || t('unknownIp')}
                </P>
                <P size="xs" className="text-muted-foreground">
                  {t('createdAt', { date: formatDate(session.createdAt) })}
                </P>
              </Div>
              {!session.isCurrent && (
                <Button
                  variant="destructive"
                  size="sm"
                  onClick={() => revokeMutation.mutate(session.id)}
                  disabled={revokeMutation.isPending && revokeMutation.variables === session.id}
                >
                  {revokeMutation.isPending && revokeMutation.variables === session.id ? (
                    <Spinner size="sm" />
                  ) : (
                    t('revoke')
                  )}
                </Button>
              )}
            </Div>
          ))}

          {sessions.length > 1 && (
            <Button
              variant="outline"
              className="w-full"
              onClick={() => revokeAllMutation.mutate()}
              disabled={revokeAllMutation.isPending}
            >
              {revokeAllMutation.isPending ? <Spinner size="sm" /> : t('revokeAll')}
            </Button>
          )}
        </CardContent>
      </Card>
    </Div>
  )
}

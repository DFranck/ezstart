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
import { callApi } from '@ezstart/fetch-client'
import { useAuthStore } from '@ezstart/auth-sdk'
import { useTranslations } from 'next-intl'
import { useCallback, useEffect, useState } from 'react'

interface Session {
  id: string
  userAgent: string | null
  ip: string | null
  createdAt: string
  expiresAt: string
  isCurrent: boolean
}

function parseUserAgent(ua: string | null): string {
  if (!ua) return 'Unknown device'

  // Extract browser
  let browser = 'Unknown browser'
  if (ua.includes('Firefox/')) browser = 'Firefox'
  else if (ua.includes('Edg/')) browser = 'Edge'
  else if (ua.includes('Chrome/')) browser = 'Chrome'
  else if (ua.includes('Safari/') && !ua.includes('Chrome')) browser = 'Safari'

  // Extract OS
  let os = 'Unknown OS'
  if (ua.includes('Windows')) os = 'Windows'
  else if (ua.includes('Mac OS')) os = 'macOS'
  else if (ua.includes('Linux')) os = 'Linux'
  else if (ua.includes('Android')) os = 'Android'
  else if (ua.includes('iPhone') || ua.includes('iPad')) os = 'iOS'

  return `${browser} on ${os}`
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

export default function SessionsPage() {
  const t = useTranslations('sessions')
  const [sessions, setSessions] = useState<Session[]>([])
  const [loading, setLoading] = useState(true)
  const [revoking, setRevoking] = useState<string | null>(null)
  const [revokingAll, setRevokingAll] = useState(false)
  const [error, setError] = useState('')

  const refreshToken = useAuthStore(state => state.refreshToken)

  const fetchSessions = useCallback(async () => {
    try {
      setLoading(true)
      const headers: Record<string, string> = {}
      if (refreshToken) {
        headers['X-Refresh-Token'] = refreshToken
      }
      const response = await callApi('/auth/sessions', {
        appName: 'ezauth',
        method: 'GET',
        headers,
      })
      if (response.ok) {
        const data = response.data as { sessions: Session[] }
        setSessions(data.sessions)
      }
    } catch {
      setError(t('fetchError'))
    } finally {
      setLoading(false)
    }
  }, [t, refreshToken])

  useEffect(() => {
    fetchSessions()
  }, [fetchSessions])

  const handleRevoke = async (sessionId: string) => {
    setRevoking(sessionId)
    setError('')
    try {
      const response = await callApi(`/auth/sessions/${sessionId}`, {
        appName: 'ezauth',
        method: 'DELETE',
      })
      if (response.ok) {
        setSessions(prev => prev.filter(s => s.id !== sessionId))
      } else {
        setError(t('revokeError'))
      }
    } catch {
      setError(t('revokeError'))
    } finally {
      setRevoking(null)
    }
  }

  const handleRevokeAll = async () => {
    setRevokingAll(true)
    setError('')
    try {
      const response = await callApi('/auth/sessions', {
        appName: 'ezauth',
        method: 'DELETE',
      })
      if (response.ok) {
        setSessions([])
      } else {
        setError(t('revokeAllError'))
      }
    } catch {
      setError(t('revokeAllError'))
    } finally {
      setRevokingAll(false)
    }
  }

  if (loading) {
    return (
      <Div className="flex items-center justify-center min-h-[50vh]">
        <Spinner variant="primary" size="lg" />
      </Div>
    )
  }

  return (
    <Card className="max-w-lg w-full relative">
      <Div className="absolute top-4 left-4">
        <BackButton />
      </Div>

      <CardHeader className="text-center pb-4">
        <CardTitle className="text-xl md:text-2xl font-bold">{t('title')}</CardTitle>
        <CardDescription>{t('description')}</CardDescription>
      </CardHeader>

      <CardContent className="space-y-4">
        {error && (
          <Div className="bg-destructive/15 border border-destructive/50 text-destructive px-4 py-3 rounded-md text-sm">
            {error}
          </Div>
        )}

        {sessions.length === 0 && (
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
                onClick={() => handleRevoke(session.id)}
                disabled={revoking === session.id}
              >
                {revoking === session.id ? <Spinner size="sm" /> : t('revoke')}
              </Button>
            )}
          </Div>
        ))}

        {sessions.length > 1 && (
          <Button
            variant="outline"
            className="w-full"
            onClick={handleRevokeAll}
            disabled={revokingAll}
          >
            {revokingAll ? <Spinner size="sm" /> : t('revokeAll')}
          </Button>
        )}
      </CardContent>
    </Card>
  )
}

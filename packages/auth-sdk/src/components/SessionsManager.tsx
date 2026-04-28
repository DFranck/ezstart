'use client'

import { useCallback, useEffect, useState } from 'react'
import { Badge, Button, Div, Icon, P, Span, Spinner } from '@ezstart/ui/components'
import { apiCall } from '@ezstart/api-sdk'
import { logger } from './internal-logger.js'

// ─── Types ──────────────────────────────────────────────────────────────────

interface Session {
  id: string
  userAgent: string | null
  ip: string | null
  createdAt: string
  expiresAt: string
  isCurrent: boolean
}

export interface SessionsManagerTexts {
  title: string
  description: string
  current: string
  revoke: string
  revokeAll: string
  revoking: string
  noSessions: string
  browser: string
  ip: string
  createdAt: string
  expiresAt: string
  confirmRevoke: string
  fallbackError: string
  revokedSuccess: string
  revokedAllSuccess: string
  unknownDevice: string
  /** Localizable relative-time labels (e.g. "1m ago" / "il y a 1m"). */
  justNow: string
  /** Pattern with `{n}` placeholder, e.g. `"{n}m ago"` or `"il y a {n}m"`. */
  minutesAgo: string
  hoursAgo: string
  daysAgo: string
  /**
   * Locale code (BCP-47) used for `Intl.DateTimeFormat` of older sessions.
   * Falls back to the browser locale when omitted.
   */
  dateLocale?: string
  /** Suffix joining browser + OS, e.g. ` on ` or ` sur `. Defaults to ` on `. */
  deviceOnSeparator: string
}

export interface SessionsManagerProps {
  texts?: Partial<SessionsManagerTexts>
  /** Called after a session is revoked */
  onSessionRevoked?: () => void
}

// ─── Defaults ───────────────────────────────────────────────────────────────

const DEFAULT_TEXTS: SessionsManagerTexts = {
  title: 'Active Sessions',
  description: 'Manage your active sessions across devices.',
  current: 'Current',
  revoke: 'Revoke',
  revokeAll: 'Revoke all other sessions',
  revoking: 'Revoking...',
  noSessions: 'No active sessions found.',
  browser: 'Browser',
  ip: 'IP',
  createdAt: 'Started',
  expiresAt: 'Expires',
  confirmRevoke: 'Are you sure you want to revoke this session?',
  fallbackError: 'An error occurred. Please try again.',
  revokedSuccess: 'Session revoked successfully.',
  revokedAllSuccess: 'All other sessions revoked.',
  unknownDevice: 'Unknown device',
  justNow: 'Just now',
  minutesAgo: '{n}m ago',
  hoursAgo: '{n}h ago',
  daysAgo: '{n}d ago',
  deviceOnSeparator: ' on ',
}

// ─── Helpers ────────────────────────────────────────────────────────────────

function parseUserAgent(ua: string | null, separator: string, fallback: string): string {
  if (!ua) return fallback
  // Simple extraction — browser name + OS
  const browsers = ['Chrome', 'Firefox', 'Safari', 'Edge', 'Opera']
  const browser = browsers.find(b => ua.includes(b)) ?? 'Browser'

  const osPatterns: [RegExp, string][] = [
    [/Windows/i, 'Windows'],
    [/Mac OS/i, 'macOS'],
    [/Linux/i, 'Linux'],
    [/Android/i, 'Android'],
    [/iPhone|iPad/i, 'iOS'],
  ]
  const os = osPatterns.find(([pattern]) => pattern.test(ua))?.[1] ?? ''

  return os ? `${browser}${separator}${os}` : browser
}

function formatRelativeDate(dateStr: string, t: SessionsManagerTexts): string {
  try {
    const date = new Date(dateStr)
    const now = new Date()
    const diffMs = now.getTime() - date.getTime()
    const diffMins = Math.floor(diffMs / 60000)
    const diffHours = Math.floor(diffMs / 3600000)
    const diffDays = Math.floor(diffMs / 86400000)

    if (diffMins < 1) return t.justNow
    if (diffMins < 60) return t.minutesAgo.replace('{n}', String(diffMins))
    if (diffHours < 24) return t.hoursAgo.replace('{n}', String(diffHours))
    if (diffDays < 7) return t.daysAgo.replace('{n}', String(diffDays))
    return date.toLocaleDateString(t.dateLocale, {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    })
  } catch {
    return dateStr
  }
}

// ─── Component ──────────────────────────────────────────────────────────────

export function SessionsManager({ texts, onSessionRevoked }: SessionsManagerProps) {
  const t = { ...DEFAULT_TEXTS, ...texts }

  const [sessions, setSessions] = useState<Session[]>([])
  const [loading, setLoading] = useState(true)
  const [revokingId, setRevokingId] = useState<string | null>(null)
  const [revokingAll, setRevokingAll] = useState(false)
  const [error, setError] = useState('')

  const fetchSessions = useCallback(async () => {
    try {
      setLoading(true)
      const data = await apiCall<{ sessions: Session[] }>('/auth/sessions', {
        appName: 'ezauth',
        method: 'GET',
      })
      setSessions(data.sessions)
    } catch (err) {
      logger.warn('Failed to fetch sessions:', err)
      setError(err instanceof Error ? err.message : t.fallbackError)
    } finally {
      setLoading(false)
    }
  }, [t.fallbackError])

  useEffect(() => {
    fetchSessions()
  }, [fetchSessions])

  const handleRevoke = async (sessionId: string) => {
    setRevokingId(sessionId)
    setError('')
    try {
      await apiCall(`/auth/sessions/${sessionId}`, {
        appName: 'ezauth',
        method: 'DELETE',
      })
      setSessions(prev => prev.filter(s => s.id !== sessionId))
      onSessionRevoked?.()
    } catch (err) {
      setError(err instanceof Error ? err.message : t.fallbackError)
    } finally {
      setRevokingId(null)
    }
  }

  const handleRevokeAll = async () => {
    setRevokingAll(true)
    setError('')
    try {
      await apiCall('/auth/sessions', {
        appName: 'ezauth',
        method: 'DELETE',
      })
      // Keep only the current session
      setSessions(prev => prev.filter(s => s.isCurrent))
      onSessionRevoked?.()
    } catch (err) {
      setError(err instanceof Error ? err.message : t.fallbackError)
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

  const otherSessions = sessions.filter(s => !s.isCurrent)

  return (
    <Div className="space-y-4">
      {error && (
        <Div className="bg-destructive/15 border border-destructive/50 text-destructive px-4 py-3 rounded-md text-sm">
          {error}
        </Div>
      )}

      {sessions.length === 0 ? (
        <P className="text-sm text-muted-foreground text-center py-4">{t.noSessions}</P>
      ) : (
        <Div className="space-y-3">
          {sessions.map(session => (
            <Div
              key={session.id}
              className="flex items-center justify-between gap-3 rounded-lg border p-3"
            >
              <Div className="flex items-center gap-3 min-w-0">
                <Icon name="lucide:Monitor" className="h-5 w-5 shrink-0 text-muted-foreground" />
                <Div className="min-w-0">
                  <Div className="flex items-center gap-2">
                    <P className="text-sm font-medium text-foreground truncate">
                      {parseUserAgent(session.userAgent, t.deviceOnSeparator, t.unknownDevice)}
                    </P>
                    {session.isCurrent && (
                      <Badge variant="success" size="xs">
                        {t.current}
                      </Badge>
                    )}
                  </Div>
                  <Div className="flex flex-wrap gap-x-3 gap-y-0.5">
                    {session.ip && (
                      <Span className="text-xs text-muted-foreground">
                        {t.ip}: {session.ip}
                      </Span>
                    )}
                    <Span className="text-xs text-muted-foreground">
                      {t.createdAt}: {formatRelativeDate(session.createdAt, t)}
                    </Span>
                  </Div>
                </Div>
              </Div>

              {!session.isCurrent && (
                <Button
                  variant="destructive"
                  size="sm"
                  onClick={() => handleRevoke(session.id)}
                  disabled={revokingId === session.id}
                >
                  {revokingId === session.id ? <Spinner size="sm" /> : t.revoke}
                </Button>
              )}
            </Div>
          ))}
        </Div>
      )}

      {otherSessions.length > 0 && (
        <Button
          variant="outline"
          className="w-full"
          onClick={handleRevokeAll}
          disabled={revokingAll}
        >
          {revokingAll ? <Spinner size="sm" /> : t.revokeAll}
        </Button>
      )}
    </Div>
  )
}

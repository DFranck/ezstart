/**
 * Sentry provider client.
 *
 * Uses Sentry REST API to fetch error tracking stats.
 * Docs:
 * - https://docs.sentry.io/api/organizations/retrieve-event-counts-for-an-organization-v2/
 * - https://docs.sentry.io/api/events/list-an-organizations-issues/
 *
 * Auth: SENTRY_AUTH_TOKEN (scope: org:read, project:read, event:read).
 */

import { logger } from '@ezstart/logger/server'
import type { ProviderStatus, UsageMetric } from './types.js'
import { deriveHealth, withPercentage } from './types.js'

const SENTRY_API = 'https://sentry.io/api/0'
const DASHBOARD_URL_BASE = 'https://sentry.io/organizations'

// Sentry Developer (free) plan: 5,000 errors/month
const DEVELOPER_EVENTS_PER_MONTH = 5000

interface SentryStatsV2Response {
  groups?: Array<{
    totals?: Record<string, number>
    series?: Record<string, number[]>
  }>
  intervals?: string[]
}

interface SentryIssue {
  id: string
  status?: string
}

export async function fetchStatus(): Promise<ProviderStatus> {
  const token = process.env.SENTRY_AUTH_TOKEN
  const orgSlug = process.env.SENTRY_ORG_SLUG

  const dashboardUrl = orgSlug ? `${DASHBOARD_URL_BASE}/${orgSlug}/` : `${DASHBOARD_URL_BASE}/`

  const base: ProviderStatus = {
    provider: 'sentry',
    displayName: 'Sentry',
    plan: 'Developer',
    monthlyCostEstimate: 0,
    usage: [],
    status: 'unknown',
    lastSync: new Date().toISOString(),
    dashboardUrl,
  }

  if (!token) {
    return { ...base, error: 'Missing SENTRY_AUTH_TOKEN env var' }
  }
  if (!orgSlug) {
    return { ...base, error: 'Missing SENTRY_ORG_SLUG env var' }
  }

  const headers = { Authorization: `Bearer ${token}` }

  try {
    // 1. Open issues (unresolved)
    const issuesRes = await fetch(
      `${SENTRY_API}/organizations/${encodeURIComponent(orgSlug)}/issues/?query=is:unresolved&limit=100`,
      { headers }
    )
    if (!issuesRes.ok) {
      throw new Error(`Sentry /issues failed: ${issuesRes.status} ${issuesRes.statusText}`)
    }
    const issues = (await issuesRes.json()) as SentryIssue[]
    const openIssues = Array.isArray(issues) ? issues.length : 0

    // 2. Event counts for current month (stats_v2)
    const now = Date.now()
    const startOfMonth = new Date()
    startOfMonth.setUTCDate(1)
    startOfMonth.setUTCHours(0, 0, 0, 0)
    const start = Math.floor(startOfMonth.getTime() / 1000)
    const end = Math.floor(now / 1000)

    let eventsThisMonth = 0
    const statsUrl =
      `${SENTRY_API}/organizations/${encodeURIComponent(orgSlug)}/stats_v2/` +
      `?category=error&field=sum(quantity)&interval=1d&start=${start}&end=${end}`
    const statsRes = await fetch(statsUrl, { headers })
    if (statsRes.ok) {
      const statsJson = (await statsRes.json()) as SentryStatsV2Response
      for (const group of statsJson.groups ?? []) {
        const total = group.totals?.['sum(quantity)']
        if (typeof total === 'number') eventsThisMonth += total
      }
    } else {
      logger.warn('[providers/sentry] stats_v2 not available', {
        status: statsRes.status,
      })
    }

    const usage: UsageMetric[] = [
      withPercentage({
        label: 'Events this month',
        current: eventsThisMonth,
        limit: DEVELOPER_EVENTS_PER_MONTH,
        unit: 'events',
      }),
      {
        label: 'Open issues',
        current: openIssues,
        limit: null,
        unit: 'issues',
      },
    ]

    const status = deriveHealth(usage)

    return {
      ...base,
      usage,
      status,
      statusMessage: status === 'critical' ? 'Monthly event quota nearly reached' : undefined,
    }
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Unknown Sentry error'
    logger.warn('[providers/sentry] fetch failed', { err: msg })
    return { ...base, error: msg }
  }
}

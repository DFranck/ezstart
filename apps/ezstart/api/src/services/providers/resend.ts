/**
 * Resend provider client.
 *
 * Uses Resend REST API to fetch emails sent over the last 30 days.
 * Docs: https://resend.com/docs/api-reference
 *
 * Auth: RESEND_API_KEY.
 */

import { logger } from '@ezstart/logger/server'
import type { ProviderStatus, UsageMetric } from './types.js'
import { deriveHealth, withPercentage } from './types.js'

const RESEND_API = 'https://api.resend.com'
const DASHBOARD_URL = 'https://resend.com/emails'

// Resend Free plan: 100 emails/day, 3000/month
const FREE_EMAILS_PER_MONTH = 3000

interface ResendEmailListResponse {
  data?: Array<{ id: string; created_at?: string }>
}

export async function fetchStatus(): Promise<ProviderStatus> {
  const key = process.env.RESEND_API_KEY

  const base: ProviderStatus = {
    provider: 'resend',
    displayName: 'Resend',
    plan: 'Free',
    monthlyCostEstimate: 0,
    usage: [],
    status: 'unknown',
    lastSync: new Date().toISOString(),
    dashboardUrl: DASHBOARD_URL,
  }

  if (!key) {
    return { ...base, error: 'Missing RESEND_API_KEY env var' }
  }

  const headers = { Authorization: `Bearer ${key}` }

  try {
    const res = await fetch(`${RESEND_API}/emails?limit=100`, { headers })
    if (!res.ok) {
      throw new Error(`Resend /emails failed: ${res.status} ${res.statusText}`)
    }
    const json = (await res.json()) as ResendEmailListResponse
    const since = Date.now() - 30 * 24 * 60 * 60 * 1000
    const recent = (json.data ?? []).filter(e => {
      if (!e.created_at) return true
      return new Date(e.created_at).getTime() >= since
    })

    const usage: UsageMetric[] = [
      withPercentage({
        label: 'Emails sent (30d)',
        current: recent.length,
        limit: FREE_EMAILS_PER_MONTH,
        unit: 'emails',
      }),
    ]

    const status = deriveHealth(usage)

    return {
      ...base,
      usage,
      status,
      statusMessage: status === 'critical' ? 'Monthly quota nearly reached' : undefined,
    }
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Unknown Resend error'
    logger.warn('[providers/resend] fetch failed', { err: msg })
    return { ...base, error: msg }
  }
}

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

interface ResendDomainListResponse {
  data?: Array<{ id: string; name: string; status?: string }>
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
    if (res.ok) {
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
    }

    // 401/403 — key likely sending-only; try /domains as a lighter probe
    if (res.status === 401 || res.status === 403) {
      logger.info('[providers/resend] /emails denied, falling back to /domains', {
        status: res.status,
      })
      const domainsRes = await fetch(`${RESEND_API}/domains`, { headers })
      if (domainsRes.ok) {
        const domains = (await domainsRes.json()) as ResendDomainListResponse
        const count = domains.data?.length ?? 0
        const verified = (domains.data ?? []).filter(d => d.status === 'verified').length
        return {
          ...base,
          status: 'unknown',
          usage: [
            { label: 'Domains', current: count, limit: null, unit: 'domains' },
            { label: 'Verified', current: verified, limit: null, unit: 'domains' },
          ],
          statusMessage:
            'Resend key is sending-only. The /emails endpoint requires a full-access key. Create one at https://resend.com/api-keys with full permissions to see send stats.',
        }
      }
      return {
        ...base,
        status: 'unknown',
        statusMessage:
          'Resend key rejected (401). Create a full-access key at https://resend.com/api-keys.',
      }
    }

    throw new Error(`Resend /emails failed: ${res.status} ${res.statusText}`)
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Unknown Resend error'
    logger.warn('[providers/resend] fetch failed', { err: msg })
    return { ...base, error: msg }
  }
}

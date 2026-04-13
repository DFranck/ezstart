/**
 * OpenAI provider client.
 *
 * Uses the legacy-but-functional dashboard billing endpoints to read the
 * hard_limit (plan cap) and month-to-date usage in USD.
 *
 * Docs:
 * - https://platform.openai.com/docs/api-reference (usage endpoints are undocumented
 *   but widely used by the OpenAI dashboard itself)
 *
 * Auth: Bearer OPENAI_API_KEY.
 * Note: these endpoints may be deprecated by OpenAI at any time — fallback is
 * a graceful "unknown" status linking to the dashboard.
 */

import { logger } from '@ezstart/logger/server'
import type { ProviderStatus, UsageMetric } from './types.js'
import { deriveHealth, withPercentage } from './types.js'

const OPENAI_API = 'https://api.openai.com'
const DASHBOARD_URL = 'https://platform.openai.com/usage'

interface OpenAISubscription {
  hard_limit_usd?: number
  plan?: { title?: string; id?: string }
  has_payment_method?: boolean
}

interface OpenAIUsage {
  total_usage?: number // in cents
}

function formatDate(d: Date): string {
  const yyyy = d.getUTCFullYear()
  const mm = String(d.getUTCMonth() + 1).padStart(2, '0')
  const dd = String(d.getUTCDate()).padStart(2, '0')
  return `${yyyy}-${mm}-${dd}`
}

export async function fetchStatus(): Promise<ProviderStatus> {
  const apiKey = process.env.OPENAI_API_KEY

  const base: ProviderStatus = {
    provider: 'openai',
    displayName: 'OpenAI',
    plan: 'Pay-as-you-go',
    monthlyCostEstimate: 0,
    usage: [],
    status: 'unknown',
    lastSync: new Date().toISOString(),
    dashboardUrl: DASHBOARD_URL,
  }

  if (!apiKey) {
    return { ...base, error: 'Missing OPENAI_API_KEY env var' }
  }

  const headers = { Authorization: `Bearer ${apiKey}` }

  try {
    // 1. Subscription (plan + hard limit)
    const subRes = await fetch(`${OPENAI_API}/v1/dashboard/billing/subscription`, { headers })
    if (!subRes.ok) {
      logger.info('[providers/openai] subscription endpoint unavailable', {
        status: subRes.status,
      })
      return {
        ...base,
        statusMessage: 'Usage not available via API — check platform.openai.com',
      }
    }
    const sub = (await subRes.json()) as OpenAISubscription
    const hardLimit = sub.hard_limit_usd ?? null
    const planTitle = sub.plan?.title ?? (sub.has_payment_method ? 'Pay-as-you-go' : 'Free tier')

    // 2. Usage since the start of the month
    const now = new Date()
    const startOfMonth = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1))
    const endDate = new Date(now.getTime() + 24 * 60 * 60 * 1000) // tomorrow (exclusive)
    const usageUrl =
      `${OPENAI_API}/v1/dashboard/billing/usage` +
      `?start_date=${formatDate(startOfMonth)}&end_date=${formatDate(endDate)}`
    const usageRes = await fetch(usageUrl, { headers })
    let usdSpent = 0
    if (usageRes.ok) {
      const usageJson = (await usageRes.json()) as OpenAIUsage
      usdSpent = (usageJson.total_usage ?? 0) / 100 // cents → USD
    } else {
      logger.warn('[providers/openai] usage endpoint unavailable', {
        status: usageRes.status,
      })
    }

    const usage: UsageMetric[] = [
      withPercentage({
        label: 'Spend this month',
        current: Math.round(usdSpent * 100) / 100,
        limit: hardLimit,
        unit: 'USD',
      }),
    ]

    const status = deriveHealth(usage)

    return {
      ...base,
      plan: planTitle,
      monthlyCostEstimate: Math.round(usdSpent * 100) / 100,
      usage,
      status,
      statusMessage: status === 'critical' ? 'Monthly spend limit nearly reached' : undefined,
    }
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Unknown OpenAI error'
    logger.warn('[providers/openai] fetch failed', { err: msg })
    return { ...base, error: msg }
  }
}

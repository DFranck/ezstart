/**
 * Stripe provider client.
 *
 * Uses Stripe REST API directly (Bearer auth) to avoid adding a new SDK dep.
 * Docs: https://stripe.com/docs/api
 *
 * Auth: STRIPE_SECRET_KEY (already used by pay-sdk integrations).
 */

import { logger } from '@ezstart/logger/server'
import type { ProviderStatus, UsageMetric } from './types.js'
import { deriveHealth } from './types.js'

const STRIPE_API = 'https://api.stripe.com/v1'
const DASHBOARD_URL = 'https://dashboard.stripe.com/'

interface StripeBalanceTransaction {
  id: string
  amount: number
  currency: string
  type: string
  created: number
  net: number
}

interface StripeSubscriptionList {
  data?: Array<{ id: string; status: string }>
  has_more?: boolean
}

interface StripeAccount {
  id: string
  charges_enabled?: boolean
  details_submitted?: boolean
}

export async function fetchStatus(): Promise<ProviderStatus> {
  const key = process.env.STRIPE_SECRET_KEY

  const base: ProviderStatus = {
    provider: 'stripe',
    displayName: 'Stripe',
    plan: 'Pay-as-you-go',
    monthlyCostEstimate: 0,
    usage: [],
    status: 'unknown',
    lastSync: new Date().toISOString(),
    dashboardUrl: DASHBOARD_URL,
  }

  if (!key) {
    return { ...base, error: 'Missing STRIPE_SECRET_KEY env var' }
  }

  const headers = { Authorization: `Bearer ${key}` }
  const isTest = key.startsWith('sk_test_')

  try {
    // 1. Account info
    const accountRes = await fetch(`${STRIPE_API}/account`, { headers })
    if (!accountRes.ok) {
      throw new Error(`Stripe /account failed: ${accountRes.status} ${accountRes.statusText}`)
    }
    const account = (await accountRes.json()) as StripeAccount

    // 2. Balance transactions — last 30 days
    const since = Math.floor((Date.now() - 30 * 24 * 60 * 60 * 1000) / 1000)
    const txRes = await fetch(
      `${STRIPE_API}/balance_transactions?limit=100&created[gte]=${since}`,
      { headers }
    )
    if (!txRes.ok) {
      throw new Error(`Stripe /balance_transactions failed: ${txRes.status} ${txRes.statusText}`)
    }
    const txJson = (await txRes.json()) as { data?: StripeBalanceTransaction[] }
    const charges = (txJson.data ?? []).filter(t => t.type === 'charge')
    const grossCents = charges.reduce((sum, t) => sum + Math.max(0, t.amount), 0)
    const grossUsd = grossCents / 100

    // 3. Active subscriptions
    const subsRes = await fetch(`${STRIPE_API}/subscriptions?status=active&limit=100`, { headers })
    const subsJson = subsRes.ok ? ((await subsRes.json()) as StripeSubscriptionList) : { data: [] }
    const activeSubs = subsJson.data?.length ?? 0

    const usage: UsageMetric[] = [
      { label: 'Gross revenue (30d)', current: Math.round(grossUsd), limit: null, unit: 'USD' },
      { label: 'Payments (30d)', current: charges.length, limit: null, unit: 'payments' },
      { label: 'Active subscriptions', current: activeSubs, limit: null, unit: 'subs' },
    ]

    const status = account.charges_enabled ? deriveHealth(usage) : 'warning'

    return {
      ...base,
      plan: isTest ? 'Test mode' : 'Live (2.9% + 30¢)',
      // Stripe charges per-transaction — no monthly fee
      monthlyCostEstimate: Math.round(grossUsd * 0.029 + charges.length * 0.3),
      usage,
      status,
      statusMessage: !account.charges_enabled
        ? 'Charges not enabled — complete onboarding'
        : isTest
          ? 'Test mode — no real charges'
          : undefined,
    }
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Unknown Stripe error'
    logger.warn('[providers/stripe] fetch failed', { err: msg })
    return { ...base, error: msg }
  }
}

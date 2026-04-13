/**
 * Vercel provider client.
 *
 * Uses Vercel REST API to fetch plan + deployment usage.
 * Docs:
 * - https://vercel.com/docs/rest-api/endpoints/projects
 * - https://vercel.com/docs/rest-api/endpoints/deployments
 *
 * Auth: VERCEL_TOKEN (required), VERCEL_TEAM_ID (optional for team accounts).
 */

import { logger } from '@ezstart/logger/server'
import type { ProviderStatus, UsageMetric } from './types.js'
import { deriveHealth, withPercentage } from './types.js'

const VERCEL_API = 'https://api.vercel.com'
const DASHBOARD_URL = 'https://vercel.com/dashboard'

// Vercel Hobby plan monthly soft limits (source of truth: pricing page)
const HOBBY_DEPLOYMENTS_PER_DAY = 100
const HOBBY_DEPLOYMENTS_PER_MONTH = HOBBY_DEPLOYMENTS_PER_DAY * 30

interface VercelUser {
  user?: { username?: string; billing?: { plan?: string } }
  username?: string
  billing?: { plan?: string }
}

interface VercelDeploymentsResponse {
  deployments?: Array<{ uid?: string; createdAt?: number }>
  pagination?: { count?: number }
}

export async function fetchStatus(): Promise<ProviderStatus> {
  const token = process.env.VERCEL_TOKEN
  const teamId = process.env.VERCEL_TEAM_ID

  const base: ProviderStatus = {
    provider: 'vercel',
    displayName: 'Vercel',
    plan: 'Unknown',
    monthlyCostEstimate: 0,
    usage: [],
    status: 'unknown',
    lastSync: new Date().toISOString(),
    dashboardUrl: DASHBOARD_URL,
  }

  if (!token) {
    return { ...base, error: 'Missing VERCEL_TOKEN env var' }
  }

  const headers = { Authorization: `Bearer ${token}` }
  const teamQuery = teamId ? `?teamId=${encodeURIComponent(teamId)}` : ''

  try {
    // 1. Account info (plan)
    const userRes = await fetch(`${VERCEL_API}/v2/user`, { headers })
    if (!userRes.ok) {
      throw new Error(`Vercel /v2/user failed: ${userRes.status} ${userRes.statusText}`)
    }
    const userJson = (await userRes.json()) as VercelUser
    const plan = userJson.user?.billing?.plan ?? userJson.billing?.plan ?? 'hobby'
    const planDisplay = plan.charAt(0).toUpperCase() + plan.slice(1)

    // 2. Deployments in the last 30 days
    const since = Date.now() - 30 * 24 * 60 * 60 * 1000
    const deployRes = await fetch(
      `${VERCEL_API}/v6/deployments${teamQuery}${teamQuery ? '&' : '?'}since=${since}&limit=100`,
      { headers }
    )
    if (!deployRes.ok) {
      throw new Error(`Vercel /v6/deployments failed: ${deployRes.status} ${deployRes.statusText}`)
    }
    const deployJson = (await deployRes.json()) as VercelDeploymentsResponse
    const deploymentsCount = deployJson.deployments?.length ?? 0

    const isHobby = plan.toLowerCase().includes('hobby')
    const usage: UsageMetric[] = [
      withPercentage({
        label: 'Deployments (30d)',
        current: deploymentsCount,
        limit: isHobby ? HOBBY_DEPLOYMENTS_PER_MONTH : null,
        unit: 'deployments',
      }),
    ]

    const status = deriveHealth(usage)

    return {
      ...base,
      plan: planDisplay,
      monthlyCostEstimate: isHobby ? 0 : 20,
      usage,
      status,
      statusMessage: status === 'healthy' ? undefined : 'High deployment volume',
    }
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Unknown Vercel error'
    logger.warn('[providers/vercel] fetch failed', { err: msg })
    return { ...base, error: msg }
  }
}

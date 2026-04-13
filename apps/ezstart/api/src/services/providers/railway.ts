/**
 * Railway provider client.
 *
 * Uses Railway Public GraphQL API.
 * Docs: https://docs.railway.com/reference/public-api
 *
 * Auth: RAILWAY_TOKEN (project or account token).
 * Optional: RAILWAY_WORKSPACE_ID (for usage queries scoped to a workspace).
 */

import { logger } from '@ezstart/logger/server'
import type { ProviderStatus, UsageMetric } from './types.js'
import { deriveHealth } from './types.js'

const RAILWAY_API = 'https://backboard.railway.app/graphql/v2'
const DASHBOARD_URL = 'https://railway.app/dashboard'

interface RailwayGraphQLResponse<T> {
  data?: T
  errors?: Array<{ message: string }>
}

interface ProjectsQueryData {
  projects?: {
    edges?: Array<{ node?: { id: string; name: string } }>
  }
}

class RailwayAuthError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'RailwayAuthError'
  }
}

async function gqlTry<T>(
  query: string,
  headers: Record<string, string>
): Promise<RailwayGraphQLResponse<T>> {
  const res = await fetch(RAILWAY_API, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...headers },
    body: JSON.stringify({ query }),
  })
  if (!res.ok) {
    throw new Error(`Railway GraphQL HTTP ${res.status} ${res.statusText}`)
  }
  return (await res.json()) as RailwayGraphQLResponse<T>
}

async function gql<T>(token: string, query: string): Promise<T> {
  // Try both auth header formats (Railway accepts Bearer for account/API tokens,
  // Project-Access-Token for project tokens).
  const attempts: Array<Record<string, string>> = [
    { Authorization: `Bearer ${token}` },
    { 'Project-Access-Token': token },
  ]
  let lastAuthError: string | null = null
  for (const headers of attempts) {
    const json = await gqlTry<T>(query, headers)
    if (json.errors && json.errors.length > 0) {
      const combined = json.errors.map(e => e.message).join('; ')
      if (/not authorized|unauthorized|problem processing/i.test(combined)) {
        lastAuthError = combined
        continue // try next header format
      }
      throw new Error(`Railway GraphQL error: ${combined}`)
    }
    if (!json.data) throw new Error('Railway GraphQL returned no data')
    return json.data
  }
  throw new RailwayAuthError(lastAuthError ?? 'Railway not authorized')
}

export async function fetchStatus(): Promise<ProviderStatus> {
  const token = process.env.RAILWAY_TOKEN

  const base: ProviderStatus = {
    provider: 'railway',
    displayName: 'Railway',
    plan: 'Unknown',
    monthlyCostEstimate: 0,
    usage: [],
    status: 'unknown',
    lastSync: new Date().toISOString(),
    dashboardUrl: DASHBOARD_URL,
  }

  if (!token) {
    return { ...base, error: 'Missing RAILWAY_TOKEN env var' }
  }

  try {
    // Count projects accessible to this token. Use root-level `projects` so this
    // works for both user-scoped API tokens and team/workspace tokens (which don't
    // have access to the user-scoped `me` query).
    const query = `query { projects { edges { node { id name } } } }`
    const data = await gql<ProjectsQueryData>(token, query)
    const edges = data.projects?.edges ?? []
    const projectCount = edges.length

    const usage: UsageMetric[] = [
      { label: 'Projects', current: projectCount, limit: null, unit: 'projects' },
    ]

    const status = deriveHealth(usage)

    // Railway Developer plan is $5/mo flat + usage. We can't reliably query the
    // estimated bill without the billing API scope, so surface 0 and mention it.
    return {
      ...base,
      plan: 'Developer',
      monthlyCostEstimate: 5,
      usage,
      status,
      statusMessage: 'Estimated billing not available via public API',
    }
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Unknown Railway error'
    logger.warn('[providers/railway] fetch failed', { err: msg })
    if (err instanceof RailwayAuthError) {
      return {
        ...base,
        status: 'unknown',
        statusMessage:
          'RAILWAY_TOKEN is not authorized for the GraphQL API. If you copied it from ~/.railway/config.json, it is a session token. Create a proper API token at https://railway.app/account/tokens.',
      }
    }
    return { ...base, error: msg }
  }
}

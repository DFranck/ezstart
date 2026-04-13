/**
 * GitHub provider client.
 *
 * Uses GitHub REST API to fetch rate limit stats and (if the token has the
 * `user` and `read:billing` scopes) Actions minutes + Packages storage usage.
 *
 * Docs:
 * - https://docs.github.com/en/rest/rate-limit
 * - https://docs.github.com/en/rest/billing/billing
 *
 * Auth: Bearer GITHUB_TOKEN. Billing endpoints require a Personal Access
 * Token (classic) with `read:billing` scope or a fine-grained token with
 * the "Plan" read permission.
 */

import { logger } from '@ezstart/logger/server'
import type { ProviderStatus, UsageMetric } from './types.js'
import { deriveHealth, withPercentage } from './types.js'

const GITHUB_API = 'https://api.github.com'
const DASHBOARD_URL_BASE = 'https://github.com'

interface GitHubRateLimit {
  resources?: {
    core?: { limit?: number; remaining?: number; used?: number }
    search?: { limit?: number; remaining?: number; used?: number }
    graphql?: { limit?: number; remaining?: number; used?: number }
  }
}

interface GitHubActionsBilling {
  total_minutes_used?: number
  included_minutes?: number
}

interface GitHubPackagesBilling {
  total_gigabytes_bandwidth_used?: number
  included_gigabytes_bandwidth?: number
}

export async function fetchStatus(): Promise<ProviderStatus> {
  const token = process.env.GITHUB_TOKEN
  const username = process.env.GITHUB_USERNAME

  const dashboardUrl = username ? `${DASHBOARD_URL_BASE}/${username}` : DASHBOARD_URL_BASE

  const base: ProviderStatus = {
    provider: 'github',
    displayName: 'GitHub',
    plan: 'Free',
    monthlyCostEstimate: 0,
    usage: [],
    status: 'unknown',
    lastSync: new Date().toISOString(),
    dashboardUrl,
  }

  if (!token) {
    return { ...base, error: 'Missing GITHUB_TOKEN env var' }
  }

  const headers: Record<string, string> = {
    Authorization: `Bearer ${token}`,
    Accept: 'application/vnd.github+json',
    'X-GitHub-Api-Version': '2022-11-28',
  }

  try {
    // 1. Rate limit (always available)
    const rateRes = await fetch(`${GITHUB_API}/rate_limit`, { headers })
    if (!rateRes.ok) {
      throw new Error(`GitHub /rate_limit failed: ${rateRes.status} ${rateRes.statusText}`)
    }
    const rate = (await rateRes.json()) as GitHubRateLimit
    const core = rate.resources?.core
    const search = rate.resources?.search
    const graphql = rate.resources?.graphql

    const usage: UsageMetric[] = []

    if (core?.limit && typeof core.used === 'number') {
      usage.push(
        withPercentage({
          label: 'API core rate (hour)',
          current: core.used,
          limit: core.limit,
          unit: 'req',
        })
      )
    }
    if (search?.limit && typeof search.used === 'number') {
      usage.push(
        withPercentage({
          label: 'API search rate (min)',
          current: search.used,
          limit: search.limit,
          unit: 'req',
        })
      )
    }
    if (graphql?.limit && typeof graphql.used === 'number') {
      usage.push(
        withPercentage({
          label: 'API GraphQL rate (hour)',
          current: graphql.used,
          limit: graphql.limit,
          unit: 'req',
        })
      )
    }

    // 2. Actions minutes (requires read:billing scope; skip silently on 403/404)
    if (username) {
      const actionsRes = await fetch(
        `${GITHUB_API}/users/${encodeURIComponent(username)}/settings/billing/actions`,
        { headers }
      )
      if (actionsRes.ok) {
        const actions = (await actionsRes.json()) as GitHubActionsBilling
        if (
          typeof actions.total_minutes_used === 'number' &&
          typeof actions.included_minutes === 'number'
        ) {
          usage.push(
            withPercentage({
              label: 'Actions minutes (month)',
              current: actions.total_minutes_used,
              limit: actions.included_minutes || null,
              unit: 'min',
            })
          )
        }
      } else {
        logger.info('[providers/github] actions billing not available', {
          status: actionsRes.status,
        })
      }

      // 3. Packages bandwidth
      const pkgRes = await fetch(
        `${GITHUB_API}/users/${encodeURIComponent(username)}/settings/billing/packages`,
        { headers }
      )
      if (pkgRes.ok) {
        const pkg = (await pkgRes.json()) as GitHubPackagesBilling
        if (
          typeof pkg.total_gigabytes_bandwidth_used === 'number' &&
          typeof pkg.included_gigabytes_bandwidth === 'number'
        ) {
          usage.push(
            withPercentage({
              label: 'Packages bandwidth (month)',
              current: pkg.total_gigabytes_bandwidth_used,
              limit: pkg.included_gigabytes_bandwidth || null,
              unit: 'GB',
            })
          )
        }
      } else {
        logger.info('[providers/github] packages billing not available', {
          status: pkgRes.status,
        })
      }
    }

    const status = deriveHealth(usage)

    return {
      ...base,
      usage,
      status,
      statusMessage: status === 'critical' ? 'Rate limit or quota nearly exhausted' : undefined,
    }
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Unknown GitHub error'
    logger.warn('[providers/github] fetch failed', { err: msg })
    return { ...base, error: msg }
  }
}

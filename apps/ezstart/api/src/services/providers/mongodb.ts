/**
 * MongoDB Atlas provider client.
 *
 * Uses Atlas Admin API v2 (HTTP Digest auth).
 * Docs: https://www.mongodb.com/docs/atlas/reference/api-resources-spec/v2/
 *
 * Auth:
 * - MONGODB_ATLAS_PUBLIC_KEY
 * - MONGODB_ATLAS_PRIVATE_KEY
 * - MONGODB_ATLAS_PROJECT_ID (optional — will list all accessible projects if omitted)
 */

import { createHash, randomBytes } from 'crypto'
import { logger } from '@ezstart/logger/server'
import type { ProviderStatus, UsageMetric } from './types.js'
import { deriveHealth, withPercentage } from './types.js'

const ATLAS_API = 'https://cloud.mongodb.com/api/atlas/v2'
const DASHBOARD_URL = 'https://cloud.mongodb.com/'

interface AtlasCluster {
  name?: string
  providerSettings?: { instanceSizeName?: string }
  replicationSpecs?: Array<{
    regionConfigs?: Array<{
      electableSpecs?: { instanceSize?: string; diskSizeGB?: number }
      readOnlySpecs?: { instanceSize?: string }
      analyticsSpecs?: { instanceSize?: string }
    }>
  }>
  diskSizeGB?: number
  stateName?: string
  clusterType?: string
  // Serverless / Flex clusters (M0/M2/M5) use different shapes
  providerBackupEnabled?: boolean
  backingProviderName?: string
}

/**
 * Recursively search a cluster object for the first string value matching
 * the tier pattern `M\d+` (e.g. M0, M2, M10, M30). Useful when Atlas response
 * shapes differ across cluster types (dedicated vs flex vs serverless).
 */
function findTierString(obj: unknown, depth = 0): string | null {
  if (depth > 6 || obj == null) return null
  if (typeof obj === 'string') {
    return /^M\d+$/.test(obj) ? obj : null
  }
  if (Array.isArray(obj)) {
    for (const item of obj) {
      const hit = findTierString(item, depth + 1)
      if (hit) return hit
    }
    return null
  }
  if (typeof obj === 'object') {
    for (const value of Object.values(obj as Record<string, unknown>)) {
      const hit = findTierString(value, depth + 1)
      if (hit) return hit
    }
  }
  return null
}

interface AtlasProject {
  id: string
  name: string
}

// Plan -> estimated monthly USD (rough, cluster only, excluding data transfer)
const TIER_COST: Record<string, number> = {
  M0: 0,
  M2: 9,
  M5: 25,
  M10: 57,
  M20: 120,
  M30: 300,
}

/**
 * Minimal HTTP Digest authentication helper for Atlas Admin API v2.
 * Atlas responds with `WWW-Authenticate: Digest ...` on the first call;
 * we compute the response header and retry.
 */
async function digestFetch(url: string, publicKey: string, privateKey: string): Promise<Response> {
  const headers = { Accept: 'application/vnd.atlas.2023-02-01+json' }
  const first = await fetch(url, { headers })
  if (first.status !== 401) return first

  const challenge = first.headers.get('www-authenticate') || ''
  const params: Record<string, string> = {}
  challenge.replace(/(\w+)="([^"]+)"/g, (_m, k: string, v: string) => ((params[k] = v), ''))
  const realm = params.realm ?? ''
  const nonce = params.nonce ?? ''
  const qop = params.qop ?? 'auth'
  const algorithm = params.algorithm ?? 'MD5'
  const opaque = params.opaque

  const uri = new URL(url).pathname + new URL(url).search
  const cnonce = randomBytes(8).toString('hex')
  const nc = '00000001'

  const md5 = (s: string) => createHash('md5').update(s).digest('hex')
  const ha1 = md5(`${publicKey}:${realm}:${privateKey}`)
  const ha2 = md5(`GET:${uri}`)
  const response = md5(`${ha1}:${nonce}:${nc}:${cnonce}:${qop}:${ha2}`)

  const authHeader =
    `Digest username="${publicKey}", realm="${realm}", nonce="${nonce}", uri="${uri}", ` +
    `qop=${qop}, nc=${nc}, cnonce="${cnonce}", response="${response}", algorithm=${algorithm}` +
    (opaque ? `, opaque="${opaque}"` : '')

  return fetch(url, { headers: { ...headers, Authorization: authHeader } })
}

export async function fetchStatus(): Promise<ProviderStatus> {
  const publicKey = process.env.MONGODB_ATLAS_PUBLIC_KEY
  const privateKey = process.env.MONGODB_ATLAS_PRIVATE_KEY
  const configuredProjectId = process.env.MONGODB_ATLAS_PROJECT_ID

  const base: ProviderStatus = {
    provider: 'mongodb',
    displayName: 'MongoDB Atlas',
    plan: 'Unknown',
    monthlyCostEstimate: 0,
    usage: [],
    status: 'unknown',
    lastSync: new Date().toISOString(),
    dashboardUrl: DASHBOARD_URL,
  }

  if (!publicKey || !privateKey) {
    return {
      ...base,
      error: 'Missing MONGODB_ATLAS_PUBLIC_KEY or MONGODB_ATLAS_PRIVATE_KEY env var',
    }
  }

  try {
    // 1. Resolve project id
    let projectId = configuredProjectId
    if (!projectId) {
      const projectsRes = await digestFetch(`${ATLAS_API}/groups`, publicKey, privateKey)
      if (!projectsRes.ok) {
        throw new Error(`Atlas /groups failed: ${projectsRes.status} ${projectsRes.statusText}`)
      }
      const projectsJson = (await projectsRes.json()) as { results?: AtlasProject[] }
      const firstProject = projectsJson.results?.[0]
      if (!firstProject) throw new Error('No Atlas project found for this API key')
      projectId = firstProject.id
    }

    // 2. List clusters
    const clustersRes = await digestFetch(
      `${ATLAS_API}/groups/${projectId}/clusters`,
      publicKey,
      privateKey
    )
    if (!clustersRes.ok) {
      throw new Error(`Atlas /clusters failed: ${clustersRes.status} ${clustersRes.statusText}`)
    }
    const clustersJson = (await clustersRes.json()) as { results?: AtlasCluster[] }
    const clusters = clustersJson.results ?? []
    if (clusters.length === 0) {
      return { ...base, plan: 'No cluster', statusMessage: 'No clusters in project' }
    }

    // Debug: log first cluster shape once to help diagnose parsing issues
    if (clusters[0]) {
      logger.debug('[providers/mongodb] first cluster shape', {
        keys: Object.keys(clusters[0]),
        sample: JSON.stringify(clusters[0]).slice(0, 500),
      })
    }

    // Aggregate storage across clusters, tier = smallest (most limiting).
    // Start from null (no fallback that could mis-report as paid tier).
    let totalDiskGB = 0
    let minTier: string | null = null
    for (const c of clusters) {
      const tier =
        c.replicationSpecs?.[0]?.regionConfigs?.[0]?.electableSpecs?.instanceSize ??
        c.providerSettings?.instanceSizeName ??
        findTierString(c) ??
        null
      const disk =
        c.diskSizeGB ?? c.replicationSpecs?.[0]?.regionConfigs?.[0]?.electableSpecs?.diskSizeGB ?? 0
      totalDiskGB += disk
      if (tier) {
        const num = (s: string) => parseInt(s.replace(/[^0-9]/g, ''), 10)
        if (minTier === null || num(tier) < num(minTier)) minTier = tier
      }
    }

    // Fallback: no tier could be parsed from any cluster
    if (minTier === null) {
      return {
        ...base,
        plan: 'Unknown',
        status: 'unknown',
        statusMessage: 'Could not parse cluster tier from Atlas response',
        dashboardUrl: `https://cloud.mongodb.com/v2/${projectId}`,
      }
    }

    // Known storage limits per tier (GB)
    const STORAGE_LIMIT_GB: Record<string, number | null> = {
      M0: 0.512, // 512 MB
      M2: 2,
      M5: 5,
      M10: 10,
      M20: 20,
      M30: 40,
    }
    const storageLimit = STORAGE_LIMIT_GB[minTier] ?? null

    const usage: UsageMetric[] = [
      withPercentage({
        label: 'Storage',
        current: Number(totalDiskGB.toFixed(2)),
        limit: storageLimit,
        unit: 'GB',
      }),
      {
        label: 'Clusters',
        current: clusters.length,
        limit: null,
        unit: 'clusters',
      },
    ]

    const status = deriveHealth(usage)
    const cost = TIER_COST[minTier] ?? 0

    return {
      ...base,
      plan: minTier,
      monthlyCostEstimate: cost * clusters.length,
      usage,
      status,
      statusMessage:
        minTier === 'M0'
          ? 'Free tier — no automated backups'
          : status === 'critical'
            ? 'Storage nearly full'
            : undefined,
      dashboardUrl: `https://cloud.mongodb.com/v2/${projectId}`,
    }
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Unknown MongoDB Atlas error'
    logger.warn('[providers/mongodb] fetch failed', { err: msg })
    return { ...base, error: msg }
  }
}

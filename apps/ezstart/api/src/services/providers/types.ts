/**
 * Shared types for external provider status aggregation.
 *
 * Each provider client implements `fetchStatus(): Promise<ProviderStatus>`
 * and the aggregator composes them into a single payload served by
 * `GET /api/admin/services`.
 */

export type ProviderName =
  | 'vercel'
  | 'railway'
  | 'mongodb'
  | 'stripe'
  | 'resend'
  | 'anthropic'
  | 'openai'
  | 'gemini'
  | 'github'

export type ProviderHealth = 'healthy' | 'warning' | 'critical' | 'unknown'

export interface UsageMetric {
  /** Human-readable label, e.g. "Deployments this month", "Storage", "Emails sent" */
  label: string
  /** Current consumed value */
  current: number
  /** Plan limit. `null` = unlimited */
  limit: number | null
  /** Unit, e.g. "deployments", "MB", "emails", "req" */
  unit: string
  /** Optional precomputed percentage of limit used (0-100). Derived by client when possible. */
  percentage?: number
}

export interface ProviderStatus {
  provider: ProviderName
  /** "Vercel", "Railway", ... */
  displayName: string
  /** Plan name, e.g. "Hobby", "Developer", "M0", "Pro" */
  plan: string
  /** Estimated monthly cost in USD */
  monthlyCostEstimate: number
  usage: UsageMetric[]
  status: ProviderHealth
  /** Short human-readable status (e.g. "Rate limited", "Storage 85% full") */
  statusMessage?: string
  /** ISO 8601 timestamp of last successful sync */
  lastSync: string
  /** External dashboard URL for the provider */
  dashboardUrl: string
  /** If fetch failed, a human-readable reason (token missing, network, etc.) */
  error?: string
}

export interface ProviderStatusListResponse {
  providers: ProviderStatus[]
  /** Seconds remaining before the in-memory aggregator cache expires */
  cacheTtlSeconds: number
  /** ISO 8601 timestamp the cached payload was computed */
  generatedAt: string
}

/**
 * Helper for provider clients: compute `percentage` when a numeric limit exists.
 */
export function withPercentage(metric: UsageMetric): UsageMetric {
  if (metric.limit === null || metric.limit === 0) return metric
  const pct = Math.min(100, Math.round((metric.current / metric.limit) * 100))
  return { ...metric, percentage: pct }
}

/**
 * Derive an overall provider health from usage metrics.
 * - critical if any metric > 95%
 * - warning if any metric > 80%
 * - healthy otherwise
 */
export function deriveHealth(usage: UsageMetric[]): ProviderHealth {
  let worst: ProviderHealth = 'healthy'
  for (const m of usage) {
    if (m.percentage === undefined) continue
    if (m.percentage >= 95) return 'critical'
    if (m.percentage >= 80) worst = 'warning'
  }
  return worst
}

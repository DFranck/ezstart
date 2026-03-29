/**
 * Sentry API Client for fetching errors from all @ezstart projects
 *
 * Uses Sentry REST API to retrieve issues/events from the ezstart organization
 *
 * @see https://docs.sentry.io/api/
 */

import { logger } from '@ezstart/logger'
import { z } from 'zod'

/**
 * Sentry Issue Schema
 */
export const SentryIssueSchema = z.object({
  id: z.string(),
  title: z.string(),
  culprit: z.string().optional(),
  permalink: z.string(),
  project: z.object({
    id: z.string(),
    name: z.string(),
    slug: z.string(),
  }),
  level: z.enum(['error', 'warning', 'info', 'debug', 'fatal']),
  status: z.enum(['resolved', 'unresolved', 'ignored']),
  isUnhandled: z.boolean().optional(),
  count: z.string(), // Total occurrences
  userCount: z.number(), // Affected users
  firstSeen: z.string(), // ISO timestamp
  lastSeen: z.string(), // ISO timestamp
  metadata: z
    .object({
      type: z.string().optional(),
      value: z.string().optional(),
      filename: z.string().optional(),
      function: z.string().optional(),
    })
    .optional(),
  tags: z
    .array(
      z.object({
        key: z.string(),
        value: z.string(),
      })
    )
    .optional()
    .default([]),
})

export type SentryIssue = z.infer<typeof SentryIssueSchema>

/**
 * Sentry Event Schema (detailed error instance)
 */
export const SentryEventSchema = z.object({
  id: z.string(),
  eventID: z.string(),
  message: z.string(),
  title: z.string(),
  platform: z.string(),
  type: z.string(),
  metadata: z.any(),
  tags: z
    .array(
      z.object({
        key: z.string(),
        value: z.string(),
      })
    )
    .optional()
    .default([]),
  dateCreated: z.string(),
  user: z
    .object({
      id: z.string().optional(),
      email: z.string().optional(),
      username: z.string().optional(),
    })
    .optional(),
  contexts: z.any(),
  entries: z.array(
    z.object({
      type: z.string(),
      data: z.any(),
    })
  ),
})

export type SentryEvent = z.infer<typeof SentryEventSchema>

/**
 * Activity Log Entry (unified format for monitoring dashboard)
 */
export const ActivityLogSchema = z.object({
  id: z.string(),
  type: z.enum(['error', 'deployment', 'health_change', 'audit_update']),
  severity: z.enum(['critical', 'error', 'warning', 'info', 'success']),
  title: z.string(),
  message: z.string(),
  source: z.string(), // e.g., 'EZAuth API', 'Vercel', 'Sentry'
  project: z.string().optional(),
  timestamp: z.date(),
  metadata: z.record(z.any()).optional(),
  url: z.string().optional(), // Link to Sentry issue, deployment, etc.
})

export type ActivityLog = z.infer<typeof ActivityLogSchema>

/**
 * Sentry Client Configuration
 */
export interface SentryClientConfig {
  /**
   * Sentry organization slug
   * @default 'ezstart'
   */
  organizationSlug: string

  /**
   * Sentry Auth Token (from https://sentry.io/settings/account/api/auth-tokens/)
   * Requires scopes: org:read, project:read, event:read
   */
  authToken: string

  /**
   * Base URL for Sentry API
   * @default 'https://sentry.io/api/0'
   */
  baseUrl?: string
}

/**
 * Fetch Options for Issues
 */
export interface FetchIssuesOptions {
  /**
   * Specific project slug (e.g., 'ezauth-api')
   * If not provided, fetches from all projects
   */
  project?: string

  /**
   * Issue status filter
   * @default 'unresolved'
   */
  status?: 'resolved' | 'unresolved' | 'ignored' | 'all'

  /**
   * Maximum number of issues to fetch
   * @default 50
   */
  limit?: number

  /**
   * Fetch issues since (ISO timestamp or relative time like '24h')
   * @default '7d' (last 7 days)
   */
  since?: string
}

/**
 * Sentry API Client
 *
 * @example
 * ```typescript
 * const client = new SentryClient({
 *   organizationSlug: 'ezstart',
 *   authToken: process.env.SENTRY_AUTH_TOKEN!,
 * })
 *
 * // Fetch all unresolved errors
 * const issues = await client.fetchIssues()
 *
 * // Fetch errors from specific project
 * const ezauthErrors = await client.fetchIssues({ project: 'ezauth-api' })
 *
 * // Convert to activity logs
 * const activityLogs = client.issuesToActivityLogs(issues)
 * ```
 */
export class SentryClient {
  private config: Required<SentryClientConfig>

  constructor(config: SentryClientConfig) {
    this.config = {
      organizationSlug: config.organizationSlug,
      authToken: config.authToken,
      baseUrl: config.baseUrl || 'https://sentry.io/api/0',
    }
  }

  /**
   * Fetch issues from Sentry
   */
  async fetchIssues(options: FetchIssuesOptions = {}): Promise<SentryIssue[]> {
    const { project, status = 'unresolved', limit = 50, since = '7d' } = options

    let url = `${this.config.baseUrl}/organizations/${this.config.organizationSlug}/issues/`

    const params = new URLSearchParams({
      query: `is:${status === 'all' ? 'unresolved' : status}`,
      statsPeriod: since,
      limit: limit.toString(),
    })

    if (project) {
      params.append('project', project)
    }

    url += `?${params.toString()}`

    const response = await fetch(url, {
      headers: {
        Authorization: `Bearer ${this.config.authToken}`,
        'Content-Type': 'application/json',
      },
    })

    if (!response.ok) {
      const error = await response.text()
      throw new Error(`Sentry API error (${response.status}): ${error}`)
    }

    const data = await response.json()
    return z.array(SentryIssueSchema).parse(data)
  }

  /**
   * Fetch events for a specific issue
   */
  async fetchIssueEvents(issueId: string, limit = 10): Promise<SentryEvent[]> {
    const url = `${this.config.baseUrl}/issues/${issueId}/events/?limit=${limit}`

    const response = await fetch(url, {
      headers: {
        Authorization: `Bearer ${this.config.authToken}`,
        'Content-Type': 'application/json',
      },
    })

    if (!response.ok) {
      const error = await response.text()
      throw new Error(`Sentry API error (${response.status}): ${error}`)
    }

    const data = await response.json()
    return z.array(SentryEventSchema).parse(data)
  }

  /**
   * Convert Sentry issues to Activity Logs (unified format)
   */
  issuesToActivityLogs(issues: SentryIssue[]): ActivityLog[] {
    return issues.map(issue => ({
      id: `sentry-${issue.id}`,
      type: 'error' as const,
      severity: this.mapLevelToSeverity(issue.level),
      title: issue.title,
      message: issue.metadata?.value || issue.culprit || 'No message',
      source: issue.project.name,
      project: issue.project.slug,
      timestamp: new Date(issue.lastSeen),
      metadata: {
        count: issue.count,
        userCount: issue.userCount,
        firstSeen: issue.firstSeen,
        status: issue.status,
        tags: issue.tags,
      },
      url: issue.permalink,
    }))
  }

  /**
   * Map Sentry level to severity
   */
  private mapLevelToSeverity(level: SentryIssue['level']): ActivityLog['severity'] {
    switch (level) {
      case 'fatal':
        return 'critical'
      case 'error':
        return 'error'
      case 'warning':
        return 'warning'
      case 'info':
      case 'debug':
        return 'info'
      default:
        return 'error'
    }
  }

  /**
   * Fetch all projects in the organization
   */
  async fetchProjects(): Promise<Array<{ id: string; name: string; slug: string }>> {
    const url = `${this.config.baseUrl}/organizations/${this.config.organizationSlug}/projects/`

    const response = await fetch(url, {
      headers: {
        Authorization: `Bearer ${this.config.authToken}`,
        'Content-Type': 'application/json',
      },
    })

    if (!response.ok) {
      const error = await response.text()
      throw new Error(`Sentry API error (${response.status}): ${error}`)
    }

    const data = await response.json()
    return z
      .array(
        z.object({
          id: z.string(),
          name: z.string(),
          slug: z.string(),
        })
      )
      .parse(data)
  }
}

/**
 * Create Sentry Client from environment variables
 *
 * Requires:
 * - SENTRY_AUTH_TOKEN (from https://sentry.io/settings/account/api/auth-tokens/)
 * - SENTRY_ORG_SLUG (optional, defaults to 'ezstart')
 */
export function createSentryClient(): SentryClient | null {
  const authToken = process.env.SENTRY_AUTH_TOKEN

  if (!authToken) {
    logger.warn('[SentryClient] SENTRY_AUTH_TOKEN not provided. Sentry integration disabled.')
    return null
  }

  return new SentryClient({
    organizationSlug: process.env.SENTRY_ORG_SLUG || 'ezstart',
    authToken,
  })
}

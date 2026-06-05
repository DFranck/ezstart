import { logger } from '@ezstart/logger/server'
import { verifyEzstartSignature, type EzstartSignatureVerifyResult } from '@ezstart/api-core'
import crypto from 'crypto'
import type { ESGPayload, ESGReportStatus } from '@green-pulse/types'

/**
 * True when the current process is a deployed environment (prod / staging /
 * any non-`local` `DEPLOY_ENV`). Used to fail-closed on missing webhook secret
 * at boot: in deployed environments the API MUST refuse to start without a
 * configured `WEBHOOK_SIGNING_SECRET`; in local dev / test it warns and the
 * webhook handler returns 503 on every call.
 */
function isDeployedEnvironment(): boolean {
  if (process.env.NODE_ENV === 'production') return true
  const deployEnv = process.env.DEPLOY_ENV
  // DEPLOY_ENV: 'local' | 'staging' | 'production' (cf. .claude/rules/env.md).
  // Anything that is NOT `local` (or unset, dev default) is treated as deployed.
  return typeof deployEnv === 'string' && deployEnv !== '' && deployEnv !== 'local'
}

/**
 * Read the configured webhook signing secret. Returns the secret when present
 * and non-empty; returns `null` in dev/test when the env var is unset so the
 * caller can return a 503 (vs. silently signing with `''` and accepting any
 * attacker-forged signature — hacker A1b V1).
 *
 * In deployed environments this never returns `null`: {@link assertWebhookSecretConfigured}
 * is called at boot and throws before any request can reach here.
 */
function readWebhookSecret(): string | null {
  const secret = process.env.WEBHOOK_SIGNING_SECRET
  if (typeof secret !== 'string' || secret.length === 0) return null
  return secret
}

/**
 * Boot-time fail-closed check for `WEBHOOK_SIGNING_SECRET`.
 *
 * In deployed environments (production / staging / any `DEPLOY_ENV !== 'local'`)
 * this throws when the secret is missing — the API refuses to start, matching
 * the pattern used by ezpay (`EZPAY_SERVER_EZAUTH_KEY`) and stripe webhook
 * verifiers. In local dev / test, it logs a warning so the operator notices
 * but the API still boots (the route handler will return 503 on any call).
 *
 * Without this gate, an unset env var (rotation oversight, fresh staging,
 * misconfigured deploy) makes the empty-string fall through to
 * `crypto.createHmac('sha256', '')` which any attacker can reproduce →
 * full HMAC bypass.
 */
export function assertWebhookSecretConfigured(): void {
  if (readWebhookSecret() !== null) return
  if (isDeployedEnvironment()) {
    throw new Error(
      'WEBHOOK_SIGNING_SECRET is required in deployed environments (production/staging). ' +
        'Refusing to boot — an empty secret would let any attacker forge ESG webhook signatures.'
    )
  }
  logger.warn(
    '[esg.service] WEBHOOK_SIGNING_SECRET is unset in local/dev. ' +
      'ESG webhook handler will return 503 until configured.'
  )
}

// ESG SaaS Integration Service
class ESGService {
  private baseUrl: string
  private clientId: string
  private clientSecret: string
  private accessToken: string | null = null
  private tokenExpiry: Date | null = null

  constructor() {
    this.baseUrl = process.env.ESG_BASE_URL || 'https://api.esg-saas.example'
    this.clientId = process.env.ESG_CLIENT_ID || ''
    this.clientSecret = process.env.ESG_CLIENT_SECRET || ''
  }

  // Get OAuth2 token
  private async getToken(): Promise<string> {
    // Check if we have a valid token
    if (this.accessToken && this.tokenExpiry && this.tokenExpiry > new Date()) {
      return this.accessToken
    }

    try {
      const response = await fetch(`${this.baseUrl}/oauth/token`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          grant_type: 'client_credentials',
          client_id: this.clientId,
          client_secret: this.clientSecret,
        }),
      })

      if (!response.ok) {
        throw new Error(`OAuth failed: ${response.statusText}`)
      }

      const data = (await response.json()) as { access_token: string; expires_in: number }
      this.accessToken = data.access_token
      // Set expiry to 5 minutes before actual expiry
      this.tokenExpiry = new Date(Date.now() + (data.expires_in - 300) * 1000)

      return this.accessToken
    } catch (error) {
      logger.error('Failed to get ESG token:', error)
      throw new Error('ESG authentication failed')
    }
  }

  // Create or update project
  async createProject(payload: ESGPayload): Promise<{ project_id: string }> {
    const token = await this.getToken()

    const response = await fetch(`${this.baseUrl}/projects`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
        'Idempotency-Key': crypto.randomUUID(),
      },
      body: JSON.stringify({
        company: payload.company,
        sites: payload.sites,
        reporting_period: payload.period,
      }),
    })

    if (!response.ok) {
      throw new Error(`Failed to create project: ${response.statusText}`)
    }

    return response.json() as Promise<{ project_id: string }>
  }

  // Push activity data
  async pushActivityData(
    projectId: string,
    payload: ESGPayload
  ): Promise<{ data_id: string; status: string }> {
    const token = await this.getToken()

    const response = await fetch(`${this.baseUrl}/activity-data`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
        'Idempotency-Key': crypto.randomUUID(),
      },
      body: JSON.stringify({
        project_id: projectId,
        period: payload.period,
        scopes: payload.scopes,
        targets: payload.targets,
        evidence: payload.evidence,
      }),
    })

    if (!response.ok) {
      throw new Error(`Failed to push activity data: ${response.statusText}`)
    }

    return response.json() as Promise<{ data_id: string; status: string }>
  }

  // Generate report
  async generateReport(
    projectId: string,
    standard: string = 'GHG-Protocol'
  ): Promise<ESGReportStatus> {
    const token = await this.getToken()

    const response = await fetch(`${this.baseUrl}/reports`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        project_id: projectId,
        standard,
        format: 'pdf',
        include_recommendations: true,
      }),
    })

    if (!response.ok) {
      throw new Error(`Failed to generate report: ${response.statusText}`)
    }

    const data = (await response.json()) as { job_id: string }

    return {
      job_id: data.job_id,
      status: 'pending' as const,
      progress: 0,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }
  }

  // Get report status
  async getReportStatus(jobId: string): Promise<ESGReportStatus> {
    const token = await this.getToken()

    const response = await fetch(`${this.baseUrl}/reports/${jobId}/status`, {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${token}`,
      },
    })

    if (!response.ok) {
      throw new Error(`Failed to get report status: ${response.statusText}`)
    }

    const data = (await response.json()) as {
      status: 'pending' | 'processing' | 'completed' | 'failed'
      progress?: number
      report_url?: string
      error?: string
      created_at: string
      updated_at?: string
    }

    return {
      job_id: jobId,
      status: data.status,
      progress: data.progress || 0,
      report_url: data.report_url,
      error: data.error,
      created_at: data.created_at,
      updated_at: data.updated_at || new Date().toISOString(),
    }
  }

  // Process complete ESG workflow
  async processESGData(payload: ESGPayload): Promise<{
    project_id: string
    data_id: string
    job_id: string
  }> {
    try {
      // 1. Create/update project
      const { project_id } = await this.createProject(payload)
      logger.info(`✅ Project created/updated: ${project_id}`)

      // 2. Push activity data
      const { data_id } = await this.pushActivityData(project_id, payload)
      logger.info(`✅ Activity data pushed: ${data_id}`)

      // 3. Generate report
      const report = await this.generateReport(project_id)
      logger.info(`✅ Report generation started: ${report.job_id}`)

      return {
        project_id,
        data_id,
        job_id: report.job_id,
      }
    } catch (error) {
      logger.error('ESG processing failed:', error)
      throw error
    }
  }

  /**
   * Verify the HMAC-SHA256 signature of an incoming webhook payload.
   *
   * **Legacy bare-HMAC verifier** — retained for backwards compatibility
   * with senders that have not yet migrated to the timestamped
   * `X-EZStart-Signature` format (cf. {@link verifyTimestampedSignature}).
   * New integrators MUST use the timestamped verifier (replay-protected,
   * matches the pattern used by ezauth / ezpay / Stripe).
   *
   * Accepts either a `Buffer` (production path — `req.body` is the raw bytes
   * captured by `express.raw({ type: 'application/json' })` when the route is
   * listed in `rawBodyRoutes`) or a `string` (test/backwards-compat path).
   * The HMAC MUST be computed over the EXACT bytes sent on the wire — never
   * over `JSON.stringify(parsedObject)`, which would drift if the engine ever
   * changes its object key iteration order.
   *
   * Returns `false` (not `throw`) on signature length mismatch OR missing
   * secret, so the caller can return a uniform 401 without leaking timing
   * info via the error path.
   *
   * **Fail-closed on empty secret (hacker A1b — V1)**: if
   * `WEBHOOK_SIGNING_SECRET` is unset, this returns `false` immediately
   * rather than falling through to `crypto.createHmac('sha256', '')` —
   * which would let any unauthenticated attacker reproduce the signature
   * and forge any payload.
   */
  verifyWebhookSignature(payload: Buffer | string, signature: string): boolean {
    const secret = readWebhookSecret()
    if (secret === null) {
      // Fail-closed: never sign with `''`. Boot-time guard
      // (`assertWebhookSecretConfigured`) ensures we never reach this branch
      // in deployed environments — this is the dev/test 503 path.
      logger.error(
        '[esg.service] verifyWebhookSignature called with empty WEBHOOK_SIGNING_SECRET — refusing to verify'
      )
      return false
    }
    const expectedSignature = crypto.createHmac('sha256', secret).update(payload).digest('hex')

    const provided = Buffer.from(signature, 'utf8')
    const expected = Buffer.from(expectedSignature, 'utf8')
    // `timingSafeEqual` throws when the two buffers differ in length — guard
    // explicitly so a truncated/oversized header returns the same uniform
    // false the caller maps to 401.
    if (provided.length !== expected.length) {
      return false
    }
    return crypto.timingSafeEqual(provided, expected)
  }

  /**
   * Verify a timestamped `X-EZStart-Signature` header against the raw
   * webhook body. Implements replay protection (hacker A1b — V3) via a
   * 5-minute tolerance window, matching the Stripe / ezauth pattern.
   *
   * Header format: `t=<unix-seconds>,v1=<hex-hmac-sha256>` where the HMAC
   * is computed over `"{timestamp}.{rawBody}"`. The signed prefix prevents
   * an attacker who captures a legitimate signature from replaying it past
   * the tolerance window.
   *
   * Returns a discriminated result so the caller can log the failure mode
   * (`malformed` / `signature` / `replay`) but still answer with a single
   * opaque 401 to the network.
   *
   * **Fail-closed on empty secret**: when `WEBHOOK_SIGNING_SECRET` is unset
   * the result is `{ ok: false, reason: 'signature' }` — never `ok: true`.
   *
   * @param rawBody - Exact bytes received on the wire (Buffer or string).
   *   Will be passed UTF-8 decoded to the verifier.
   * @param header - Raw value of the `X-Esg-Signature` request header.
   * @param now - Optional clock override for tests (returns unix-seconds).
   */
  verifyTimestampedSignature(
    rawBody: Buffer | string,
    header: string | undefined,
    now?: () => number
  ): EzstartSignatureVerifyResult {
    const secret = readWebhookSecret()
    if (secret === null) {
      logger.error(
        '[esg.service] verifyTimestampedSignature called with empty WEBHOOK_SIGNING_SECRET — refusing to verify'
      )
      return { ok: false, reason: 'signature' }
    }
    const bodyString = Buffer.isBuffer(rawBody) ? rawBody.toString('utf8') : rawBody
    return verifyEzstartSignature({
      header,
      secret,
      rawBody: bodyString,
      now,
    })
  }
}

export const esgService = new ESGService()

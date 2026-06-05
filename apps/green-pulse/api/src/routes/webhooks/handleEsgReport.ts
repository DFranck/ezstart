/**
 * POST /api/webhooks/esg-report
 * Webhook for ESG report completion
 */

import crypto from 'node:crypto'
import { logger } from '@ezstart/logger/server'
import {
  Router,
  OpenAPIRegistry,
  createRouterWithDoc,
  sendSuccess,
  sendError,
  sendValidationError,
} from '@ezstart/api-core'
import {
  esgService,
  isLegacyHmacEnabled,
  ESG_LEGACY_HMAC_SUNSET_DATE,
} from '../../services/esg.service.js'
import {
  claimEsgWebhookEvent,
  markEsgWebhookEventProcessed,
  releaseEsgWebhookEventClaim,
} from '../../models/EsgWebhookEvent.js'
import { WebhookEventSchema, type WebhookEvent } from '@green-pulse/types'

export const handleEsgReportRegistry = new OpenAPIRegistry()
const router: import('express').Router = Router()
export const handleEsgReportRouter = createRouterWithDoc(
  handleEsgReportRegistry,
  router,
  '/esg-report'
)

// Handle report completion
async function handleReportCompleted(event: WebhookEvent) {
  logger.info(`✅ Report ${event.job_id} completed successfully`)

  // Here you would:
  // 1. Update database with report status
  // 2. Send email notification to user
  // 3. Update dashboard with new data

  const reportData = {
    job_id: event.job_id,
    status: 'completed',
    report_url: event.data.report_url,
    metrics: event.data.metrics || {},
    updated_at: new Date().toISOString(),
  }

  // TODO: Save to database
  logger.info('Report data to save:', reportData)

  // TODO: Send email notification
  // await emailService.sendReportCompletionEmail(userId, reportData)
}

// Handle report failure
async function handleReportFailed(event: WebhookEvent) {
  logger.info(`❌ Report ${event.job_id} failed: ${event.data.error}`)

  const reportData = {
    job_id: event.job_id,
    status: 'failed',
    error: event.data.error,
    updated_at: new Date().toISOString(),
  }

  // TODO: Save to database
  logger.info('Failed report data to save:', reportData)

  // TODO: Send failure notification
  // await emailService.sendReportFailureEmail(userId, reportData)
}

// Handle data processing completion
async function handleDataProcessed(event: WebhookEvent) {
  logger.info(`📊 Data processing ${event.job_id} completed`)

  // TODO: Update dashboard with processed metrics
  const processedData = {
    job_id: event.job_id,
    status: 'processed',
    metrics: event.data.metrics || {},
    updated_at: new Date().toISOString(),
  }

  logger.info('Processed data:', processedData)
}

/**
 * Derive a stable idempotency key for a verified ESG webhook delivery.
 *
 * Prefer the upstream-supplied `job_id` (natural ID, survives across
 * deliveries of the same logical event). Fall back to a SHA-256 hex digest
 * of the raw signed bytes when no `job_id` is present — guarantees every
 * byte-identical replay collapses to a single processed event, even when the
 * payload schema does not carry a natural id.
 *
 * @internal
 */
function deriveEventKey(event: WebhookEvent, rawBytes: Buffer): string {
  if (typeof event.job_id === 'string' && event.job_id.length > 0) {
    return `job:${event.job_id}:${event.event_type}`
  }
  const hash = crypto.createHash('sha256').update(rawBytes).digest('hex')
  return `sha256:${hash}`
}

handleEsgReportRouter.post(
  '/',
  async (req, res) => {
    try {
      // ---- 1. Content-Type gate (hacker A1b — V2) -----------------------
      // Only accept `application/json`. Any other Content-Type bypasses the
      // `express.raw({ type: 'application/json' })` capture and would land
      // on the unsafe re-serialization fallback (the engine-drift bug that
      // WEBHOOK-RAWBODY-002 fixed). Reject early with 415 — there is no
      // legitimate sender that delivers ESG webhooks as form-encoded.
      const contentType = req.headers['content-type']
      if (typeof contentType !== 'string' || !contentType.includes('application/json')) {
        return sendError(res, 'Content-Type must be application/json', 415)
      }

      // ---- 2. Raw body gate (covers hacker A1b — E1) --------------------
      // After the Content-Type check above and the `rawBodyRoutes`
      // registration in `index.ts`, the production path ALWAYS reaches
      // here with a Buffer. Anything else (undefined / parsed object /
      // string) means the express plumbing was bypassed — refuse with 400
      // rather than crash later in `crypto.update(undefined)`.
      if (!Buffer.isBuffer(req.body)) {
        return sendError(res, 'Invalid request body (raw bytes required)', 400)
      }
      const rawBytes = req.body

      // ---- 3. Signature header presence ---------------------------------
      const signatureHeader = req.headers['x-esg-signature']
      if (typeof signatureHeader !== 'string' || signatureHeader.length === 0) {
        return sendError(res, 'Invalid webhook signature', 401)
      }

      // ---- 4. Parse JSON from the verified-shape raw bytes --------------
      // Done BEFORE signature verification so a malformed body returns 400
      // (vs. 401), but the bytes used for the HMAC are still the raw
      // wire-format buffer — we never re-serialize the parsed object.
      let parsedJson: unknown
      try {
        parsedJson = JSON.parse(rawBytes.toString('utf8'))
      } catch {
        return sendError(res, 'Invalid JSON body', 400)
      }

      // ---- 5. Signature verification ------------------------------------
      // Dual-mode (transition period): if the header carries a timestamp
      // (`t=<unix>,v1=<hex>`) we enforce replay protection via the
      // EZStart-Signature protocol — Stripe-pattern 5-minute tolerance
      // window. If the header is a bare hex digest, the legacy bare-HMAC
      // verifier is gated behind `ESG_LEGACY_HMAC_ENABLED` (hacker A1b.5
      // V4) — off by default in production/staging, on in local dev.
      const looksTimestamped = signatureHeader.includes('t=') && signatureHeader.includes('v1=')
      if (looksTimestamped) {
        const result = esgService.verifyTimestampedSignature(rawBytes, signatureHeader)
        if (!result.ok) {
          // Log the discriminated reason for observability but answer with
          // a single opaque 401 — don't leak which check failed to the
          // network (timing / probing surface).
          logger.warn(`ESG webhook rejected: ${result.reason}`)
          return sendError(res, 'Invalid webhook signature', 401)
        }
      } else {
        // Legacy bare-HMAC path. Captured signatures can be replayed
        // indefinitely (no timestamp, no replay window) — that's why this
        // path is gated. New integrators MUST send the timestamped v1
        // header (cf. ESG-WEBHOOK-LEGACY-SUNSET in BACKLOG, sunset
        // 2026-12-01).
        if (!isLegacyHmacEnabled()) {
          // Audit-trail the attempt so we can spot legacy callers still in
          // flight when the gate is disabled (typical: staging rollout
          // testing the cutover BEFORE prod sunset, or a stale integrator
          // re-delivering after migration).
          const remoteIp =
            (req.headers['x-forwarded-for'] as string | undefined)?.split(',')[0]?.trim() ??
            req.ip ??
            'unknown'
          const userAgent = req.headers['user-agent'] ?? 'unknown'
          logger.warn(
            `[LEGACY HMAC BLOCKED] Bare-HMAC webhook rejected (sunset ${ESG_LEGACY_HMAC_SUNSET_DATE}, gate ESG_LEGACY_HMAC_ENABLED=false). ip=${remoteIp} userAgent=${userAgent}`
          )
          return sendError(
            res,
            'Legacy HMAC format no longer accepted. Use v1 format: t=<unix>,v1=<hex>',
            401
          )
        }
        if (!esgService.verifyWebhookSignature(rawBytes, signatureHeader)) {
          return sendError(res, 'Invalid webhook signature', 401)
        }
        // Legacy gate is open — log loudly so the integrator (and operator)
        // sees the migration deadline on every successful legacy delivery.
        const remoteIp =
          (req.headers['x-forwarded-for'] as string | undefined)?.split(',')[0]?.trim() ??
          req.ip ??
          'unknown'
        const userAgent = req.headers['user-agent'] ?? 'unknown'
        logger.warn(
          `[LEGACY HMAC] Legacy bare-HMAC webhook accepted (sunset ${ESG_LEGACY_HMAC_SUNSET_DATE}). Migrate to v1 format (t=<unix>,v1=<hex>). ip=${remoteIp} userAgent=${userAgent}`
        )
      }

      // ---- 6. Validate payload shape ------------------------------------
      const validation = WebhookEventSchema.safeParse(parsedJson)
      if (!validation.success) {
        return sendValidationError(res, 'Invalid webhook payload', validation.error.errors, 400)
      }
      const event = validation.data

      // ---- 7. Idempotency claim (hacker A1b — E2 / A1b.5 — E4) ----------
      // At-least-once semantics: claim BEFORE dispatch, then either mark
      // processed (success) or release (failure). On crash mid-dispatch
      // the next retry sees a stale `claimedAt` and recovers — side-effect
      // is guaranteed to run at least once (handlers must be idempotent at
      // the business layer: upserts, dedup'd emails by job_id, etc.).
      const eventKey = deriveEventKey(event, rawBytes)
      let claimOutcome: Awaited<ReturnType<typeof claimEsgWebhookEvent>>
      try {
        claimOutcome = await claimEsgWebhookEvent(eventKey, { eventType: event.event_type })
      } catch (claimErr) {
        // Idempotency store unreachable — do NOT process blindly (would
        // re-run side-effects on retry) and do NOT ack (let upstream
        // retry once the store recovers).
        logger.error(
          'ESG webhook idempotency claim failed (store unreachable):',
          claimErr instanceof Error ? claimErr : String(claimErr)
        )
        return sendError(res, 'Idempotency store unavailable', 503)
      }
      if (claimOutcome === 'duplicate') {
        logger.info(`Duplicate ESG webhook ignored (already processed): ${eventKey}`)
        return sendSuccess(res, { message: 'Webhook already processed', duplicate: true })
      }
      if (claimOutcome === 'in-flight') {
        // Another worker is currently processing this event AND its claim
        // is still fresh. Return 503 so the upstream retries — at worst we
        // wait for the in-flight worker to finish (which will mark the row
        // processed) OR for the stale window to expire (which lets us
        // recover via `'recovered'`).
        logger.warn(`ESG webhook claim in-flight, returning 503 for retry: ${eventKey}`)
        return sendError(res, 'Event currently being processed, retry later', 503)
      }
      if (claimOutcome === 'recovered') {
        // Previous worker crashed mid-dispatch (hacker A1b.5 — E4). We
        // own the claim now; side-effects run again. Handlers MUST be
        // idempotent at the business layer.
        logger.warn(
          `[E4 RECOVERY] Re-dispatching ESG webhook after stale claim recovered: ${eventKey}`
        )
      }

      // ---- 8. Dispatch --------------------------------------------------
      // Wrap dispatch in try/catch so a thrown handler RELEASES the claim
      // (stamps `claimedAt = epoch`) — the next upstream retry then sees
      // an immediately-stale claim and recovers without waiting for the
      // 5-min window. On success we MARK the claim processed, closing
      // future duplicates.
      logger.info(`📥 Webhook received: ${event.event_type} for job ${event.job_id}`)
      try {
        switch (event.event_type) {
          case 'report.completed':
            await handleReportCompleted(event)
            break

          case 'report.failed':
            await handleReportFailed(event)
            break

          case 'data.processed':
            await handleDataProcessed(event)
            break

          default:
            logger.warn(`Unknown webhook event type: ${event.event_type}`)
        }
        await markEsgWebhookEventProcessed(eventKey)
      } catch (dispatchErr) {
        // Dispatch failed — release the claim so the next retry can pick
        // it up immediately. Re-throw so the outer catch maps to a 500
        // (the upstream will retry per its policy).
        try {
          await releaseEsgWebhookEventClaim(eventKey)
        } catch (releaseErr) {
          logger.error(
            '[E4 RECOVERY] Failed to release claim after dispatch error — claim will recover via stale window:',
            releaseErr instanceof Error ? releaseErr : String(releaseErr)
          )
        }
        throw dispatchErr
      }

      sendSuccess(res, { message: 'Webhook processed successfully' })
    } catch (error) {
      logger.error('Webhook processing error:', error)
      sendError(res, 'Failed to process webhook')
    }
  },
  {
    summary: 'Webhook for ESG report completion',
    tags: ['Webhooks'],
    bodySchema: WebhookEventSchema,
  }
)

export default router

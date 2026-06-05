/**
 * POST /api/webhooks/esg-report
 * Webhook for ESG report completion
 */

import { logger } from '@ezstart/logger/server'
import {
  Router,
  OpenAPIRegistry,
  createRouterWithDoc,
  sendSuccess,
  sendError,
  sendValidationError,
} from '@ezstart/api-core'
import { esgService } from '../../services/esg.service.js'
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

handleEsgReportRouter.post(
  '/',
  async (req, res) => {
    try {
      // Verify webhook signature
      const signature = req.headers['x-esg-signature'] as string
      if (!signature) {
        return sendError(res, 'Invalid webhook signature', 401)
      }

      // ---- Capture raw bytes + parse body --------------------------------
      // The route is registered in `rawBodyRoutes` (see `apps/green-pulse/
      // api/src/index.ts`) so `req.body` is a `Buffer` containing the EXACT
      // bytes the sender HMAC'd. We parse the JSON ourselves here — a
      // re-serialization via `JSON.stringify(req.body)` would be a future
      // engine upgrade time-bomb (any spec drift in V8/Bun/Deno key ordering
      // would silently break every signature verify). The raw bytes are
      // passed directly to `verifyWebhookSignature`.
      //
      // For backwards compatibility (e.g. tests that mount the router under
      // an `express.json()` parser) we accept a parsed object and re-derive
      // the bytes via JSON.stringify — but the production path always
      // reaches here with a Buffer thanks to `rawBodyRoutes`.
      let rawPayload: Buffer | string
      let parsedJson: unknown
      if (Buffer.isBuffer(req.body)) {
        rawPayload = req.body
        try {
          parsedJson = JSON.parse(req.body.toString('utf8'))
        } catch {
          return sendError(res, 'Invalid JSON body', 400)
        }
      } else if (typeof req.body === 'string') {
        rawPayload = req.body
        try {
          parsedJson = JSON.parse(req.body)
        } catch {
          return sendError(res, 'Invalid JSON body', 400)
        }
      } else {
        // Backwards-compat path (used by some tests that mount the router
        // behind `express.json()`). Production always uses raw body capture.
        parsedJson = req.body
        rawPayload = JSON.stringify(req.body)
      }

      if (!esgService.verifyWebhookSignature(rawPayload, signature)) {
        return sendError(res, 'Invalid webhook signature', 401)
      }

      const validation = WebhookEventSchema.safeParse(parsedJson)
      if (!validation.success) {
        return sendValidationError(res, 'Invalid webhook payload', validation.error.errors, 400)
      }

      const event = validation.data
      logger.info(`📥 Webhook received: ${event.event_type} for job ${event.job_id}`)

      // Handle different event types
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

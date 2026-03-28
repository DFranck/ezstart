/**
 * POST /api/webhooks/esg-report
 * Webhook for ESG report completion
 */

import { logger } from '@ezstart/logger/server'
import { Router, OpenAPIRegistry, createRouterWithDoc } from '@ezstart/express-core'
import { esgService } from '../../services/esg.service.js'
import { WebhookEventSchema } from '@green-pulse/types'

export const handleEsgReportRegistry = new OpenAPIRegistry()
const router: any = Router()
export const handleEsgReportRouter = createRouterWithDoc(
  handleEsgReportRegistry,
  router,
  '/esg-report'
)

// Handle report completion
async function handleReportCompleted(event: any) {
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
async function handleReportFailed(event: any) {
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
async function handleDataProcessed(event: any) {
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
      const payload = JSON.stringify(req.body)

      if (!signature || !esgService.verifyWebhookSignature(payload, signature)) {
        return res.status(401).json({
          success: false,
          error: 'Invalid webhook signature',
          timestamp: new Date().toISOString(),
        })
      }

      const validation = WebhookEventSchema.safeParse(req.body)
      if (!validation.success) {
        return res.status(400).json({
          success: false,
          error: 'Invalid webhook payload',
          details: validation.error.errors,
          timestamp: new Date().toISOString(),
        })
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

      res.status(200).json({
        success: true,
        message: 'Webhook processed successfully',
        timestamp: new Date().toISOString(),
      })
    } catch (error) {
      logger.error('Webhook processing error:', error)
      res.status(500).json({
        success: false,
        error: 'Failed to process webhook',
        timestamp: new Date().toISOString(),
      })
    }
  },
  {
    summary: 'Webhook for ESG report completion',
    tags: ['Webhooks'],
    bodySchema: WebhookEventSchema,
  }
)

export default router

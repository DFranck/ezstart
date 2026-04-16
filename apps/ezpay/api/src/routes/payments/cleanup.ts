import { logger } from '@ezstart/logger/server'
import {
  Router,
  createRouterWithDoc,
  OpenAPIRegistry,
  sendSuccess,
  sendError,
} from '@ezstart/express-core'
import { getPaymentModel } from '../../models/Payment.js'
import { authMiddleware, populateUserFromToken, isAdminUser } from '../../middleware/auth.js'
import type { Request, Response, Router as ExpressRouter } from 'express'
import { z } from 'zod'

export const cleanupPaymentsRegistry = new OpenAPIRegistry()
const router: ExpressRouter = Router()
const docRouter = createRouterWithDoc(cleanupPaymentsRegistry, router)

// ========================================
// Zod Schemas
// ========================================

const cleanupQuerySchema = z.object({
  appName: z.string().optional().describe('Optional app name to scope deletion'),
})

const cleanupResponseSchema = z.object({
  success: z.boolean().describe('Whether the operation succeeded'),
  data: z
    .object({
      deletedCount: z.number().describe('Number of records deleted'),
    })
    .optional()
    .describe('Cleanup result payload (present on success)'),
  error: z.string().optional().describe('Error message if operation failed'),
})

// ========================================
// Route Handler
// ========================================

const cleanupPaymentsHandler = async (req: Request, res: Response) => {
  try {
    const isAdmin = isAdminUser(req)
    if (!isAdmin) {
      return sendError(res, 'Admin access required', 403)
    }

    const validation = cleanupQuerySchema.safeParse(req.query)
    if (!validation.success) {
      return sendError(res, 'Invalid query parameters', 400)
    }

    const { appName } = validation.data

    // CRITICAL: Only delete test data — production data must NEVER be deleted
    // Use $ne: true to match both liveMode: false AND old records where liveMode is undefined/null
    const query: Record<string, unknown> = { liveMode: { $ne: true } }
    if (appName) query.projectId = appName

    const Payment = await getPaymentModel()
    const result = await Payment.deleteMany(query)

    logger.info(
      `🗑️ Cleanup: ${result.deletedCount} test payments deleted${appName ? ` for ${appName}` : ''}`
    )

    sendSuccess(res, { deletedCount: result.deletedCount })
  } catch (error) {
    logger.error('Cleanup payments error:', error instanceof Error ? error : String(error))
    sendError(res, error instanceof Error ? error.message : 'Failed to cleanup payments')
  }
}

// ========================================
// Route with OpenAPI Documentation
// ========================================

docRouter.delete(
  '/payments/cleanup',
  authMiddleware,
  populateUserFromToken,
  cleanupPaymentsHandler,
  {
    summary: 'Delete all payment records (admin only)',
    tags: ['Payments'],
    querySchema: cleanupQuerySchema,
    responseSchema: cleanupResponseSchema,
  }
)

export { cleanupPaymentsRegistry as registry, router }
export default router

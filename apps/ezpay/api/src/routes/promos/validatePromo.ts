import { logger } from '@ezstart/logger/server'
import {
  Router,
  createRouterWithDoc,
  OpenAPIRegistry,
  sendSuccess,
  sendError,
  sendValidationError,
  createStrictRateLimiter,
} from '@ezstart/express-core'
import { validatePromo } from '../../services/promo.js'
import type { Request, Response, Router as ExpressRouter } from 'express'
import { z } from 'zod'

export const validatePromoRegistry = new OpenAPIRegistry()
const router: ExpressRouter = Router()
const docRouter = createRouterWithDoc(validatePromoRegistry, router)

// ========================================
// Zod Schemas
// ========================================

const validatePromoParamsSchema = z.object({
  code: z.string().min(1).describe('Promo code to validate'),
})

const validatePromoQuerySchema = z.object({
  appName: z.string().min(1).describe('App name to validate promo against'),
})

const validatePromoResponseSchema = z.object({
  success: z.boolean(),
  data: z.object({
    valid: z.boolean(),
    reason: z.string().optional(),
    discountType: z.enum(['percent', 'fixed']).optional(),
    discountValue: z.number().optional(),
    currency: z.string().optional(),
    duration: z.enum(['once', 'repeating', 'forever']).optional(),
  }),
})

// ========================================
// Route Handler
// ========================================

const validatePromoHandler = async (req: Request, res: Response) => {
  try {
    const paramsValidation = validatePromoParamsSchema.safeParse(req.params)
    if (!paramsValidation.success) {
      return sendValidationError(res, 'Invalid promo code', paramsValidation.error.errors)
    }

    const queryValidation = validatePromoQuerySchema.safeParse(req.query)
    if (!queryValidation.success) {
      return sendValidationError(res, 'appName query parameter is required', queryValidation.error.errors)
    }

    const { code } = paramsValidation.data
    const { appName } = queryValidation.data

    const result = await validatePromo(code, appName)

    if (!result.valid) {
      return sendSuccess(res, { valid: false, reason: result.reason })
    }

    const promo = result.promo!
    sendSuccess(res, {
      valid: true,
      discountType: promo.discountType,
      discountValue: promo.discountValue,
      currency: promo.currency,
      duration: promo.duration,
    })
  } catch (error) {
    logger.error('Validate promo error:', error instanceof Error ? error : String(error))
    sendError(res, error instanceof Error ? error.message : 'Failed to validate promo')
  }
}

// ========================================
// Route with OpenAPI Documentation
// ========================================

docRouter.get(
  '/promos/validate/:code',
  createStrictRateLimiter(),
  validatePromoHandler,
  {
    summary: 'Validate a promo code (public, rate limited)',
    tags: ['Promos'],
    responseSchema: validatePromoResponseSchema,
  }
)

export { validatePromoRegistry as registry, router }
export default router

/**
 * GET /api/forms/instances/:id
 * Get form instance by ID
 */

import { logger } from '@ezstart/logger/server'
import { Router, createRouterWithDoc, OpenAPIRegistry } from '@ezstart/express-core'
import { FormInstanceSchema, ApiResponseSchema } from '@green-pulse/types'
import { getFormInstanceModel } from '../../../models/FormInstance.js'

export const getFormInstanceByIdRegistry = new OpenAPIRegistry()
const router: any = Router()
export const getFormInstanceByIdRouter = createRouterWithDoc(
  getFormInstanceByIdRegistry,
  router,
  '/instances/:id'
)

getFormInstanceByIdRouter.get(
  '/',
  async (req, res) => {
    try {
      const FormInstance = await getFormInstanceModel()

      // @ts-expect-error - Mongoose type inference issue
      const instance = await FormInstance.findById(req.params.id).lean()

      if (!instance) {
        return res.status(404).json({
          success: false,
          error: 'Form instance not found',
          timestamp: new Date().toISOString(),
        })
      }

      res.json({
        success: true,
        data: instance,
        timestamp: new Date().toISOString(),
      })
    } catch (error) {
      logger.error('Error fetching form instance:', error)
      res.status(500).json({
        success: false,
        error: 'Failed to fetch form instance',
        timestamp: new Date().toISOString(),
      })
    }
  },
  {
    summary: 'Get form instance by ID',
    tags: ['Forms'],
    responseSchema: ApiResponseSchema(FormInstanceSchema),
  }
)

export default router

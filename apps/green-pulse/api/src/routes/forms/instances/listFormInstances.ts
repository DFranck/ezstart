/**
 * GET /api/forms/instances
 * List user's form instances
 */

import { Router, createRouterWithDoc, OpenAPIRegistry } from '@ezstart/express-core'
import { FormInstanceSchema, ApiResponseSchema } from '@green-pulse/types'
import { getFormInstanceModel } from '../../../models/FormInstance.js'

export const listFormInstancesRegistry = new OpenAPIRegistry()
const router: any = Router()
export const listFormInstancesRouter = createRouterWithDoc(
  listFormInstancesRegistry,
  router,
  '/instances'
)

listFormInstancesRouter.get(
  '/',
  async (req, res) => {
    try {
      const FormInstance = await getFormInstanceModel()

      const { userId, formConfigId, status } = req.query

      const query: any = {}
      if (userId) query.userId = userId
      if (formConfigId) query.formConfigId = formConfigId
      if (status) query.status = status

      // @ts-expect-error - Mongoose type inference issue
      const instances = await FormInstance.find(query).sort({ updatedAt: -1 }).lean()

      res.json({
        success: true,
        data: instances,
        timestamp: new Date().toISOString(),
      })
    } catch (error) {
      console.error('Error fetching form instances:', error)
      res.status(500).json({
        success: false,
        error: 'Failed to fetch form instances',
        timestamp: new Date().toISOString(),
      })
    }
  },
  {
    summary: 'List form instances',
    tags: ['Forms'],
    responseSchema: ApiResponseSchema(FormInstanceSchema.array()),
  }
)

export default router

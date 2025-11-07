/**
 * DELETE /api/forms/instances/:id
 * Delete form instance
 */

import { Router, createRouterWithDoc, OpenAPIRegistry } from '@ezstart/express-core'
import { FormInstanceSchema, ApiResponseSchema } from '@green-pulse/types'
import { getFormInstanceModel } from '../../../models/FormInstance.js'

export const deleteFormInstanceRegistry = new OpenAPIRegistry()
const router: any = Router()
export const deleteFormInstanceRouter = createRouterWithDoc(
  deleteFormInstanceRegistry,
  router,
  '/instances/:id'
)

deleteFormInstanceRouter.delete(
  '/',
  async (req, res) => {
    try {
      const FormInstance = await getFormInstanceModel()

      // @ts-expect-error - Mongoose type inference issue
      const instance = await FormInstance.findByIdAndDelete(req.params.id)

      if (!instance) {
        return res.status(404).json({
          success: false,
          error: 'Form instance not found',
          timestamp: new Date().toISOString(),
        })
      }

      res.json({
        success: true,
        data: { deleted: true },
        timestamp: new Date().toISOString(),
      })
    } catch (error) {
      console.error('Error deleting form instance:', error)
      res.status(500).json({
        success: false,
        error: 'Failed to delete form instance',
        timestamp: new Date().toISOString(),
      })
    }
  },
  {
    summary: 'Delete form instance',
    tags: ['Forms'],
    responseSchema: ApiResponseSchema(FormInstanceSchema),
  }
)

export default router

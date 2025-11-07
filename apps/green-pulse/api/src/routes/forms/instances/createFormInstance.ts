/**
 * POST /api/forms/instances
 * Create new form instance
 */

import { Router, createRouterWithDoc, OpenAPIRegistry } from '@ezstart/express-core'
import {
  FormInstanceSchema,
  CreateFormInstanceRequestSchema,
  ApiResponseSchema,
} from '@green-pulse/types'
import { getFormInstanceModel } from '../../../models/FormInstance.js'

export const createFormInstanceRegistry = new OpenAPIRegistry()
const router: any = Router()
export const createFormInstanceRouter = createRouterWithDoc(
  createFormInstanceRegistry,
  router,
  '/instances'
)

createFormInstanceRouter.post(
  '/',
  async (req, res) => {
    try {
      const validation = CreateFormInstanceRequestSchema.safeParse(req.body)
      if (!validation.success) {
        return res.status(400).json({
          success: false,
          error: 'Invalid request',
          details: validation.error.errors,
          timestamp: new Date().toISOString(),
        })
      }

      const FormInstance = await getFormInstanceModel()

      const newInstance = new FormInstance({
        ...validation.data,
        fields: {},
        status: 'draft',
        history: [
          {
            timestamp: new Date(),
            action: 'created',
            userId: validation.data.userId,
          },
        ],
      })
      await newInstance.save()

      res.status(201).json({
        success: true,
        data: newInstance,
        timestamp: new Date().toISOString(),
      })
    } catch (error) {
      console.error('Error creating form instance:', error)
      res.status(500).json({
        success: false,
        error: 'Failed to create form instance',
        timestamp: new Date().toISOString(),
      })
    }
  },
  {
    summary: 'Create new form instance',
    tags: ['Forms'],
    bodySchema: CreateFormInstanceRequestSchema,
    responseSchema: ApiResponseSchema(FormInstanceSchema),
  }
)

export default router

/**
 * POST /api/esg/projects
 * Create or update ESG project
 */

import { Router, OpenAPIRegistry, createRouterWithDoc } from '@ezstart/express-core'
import { esgService } from '../../services/esg.service.js'
import { ESGPayloadSchema } from '@green-pulse/types'

export const createProjectRegistry = new OpenAPIRegistry()
const router: any = Router()
export const createProjectRouter = createRouterWithDoc(
  createProjectRegistry,
  router,
  '/projects'
)

createProjectRouter.post(
  '/',
  async (req, res) => {
    try {
      const validation = ESGPayloadSchema.safeParse(req.body)
      if (!validation.success) {
        return res.status(400).json({
          success: false,
          error: 'Invalid ESG payload format',
          details: validation.error.errors,
          timestamp: new Date().toISOString(),
        })
      }

      const project = await esgService.createProject(validation.data)

      res.json({
        success: true,
        data: project,
        timestamp: new Date().toISOString(),
      })
    } catch (error) {
      console.error('Project creation error:', error)
      res.status(500).json({
        success: false,
        error: 'Failed to create ESG project',
        timestamp: new Date().toISOString(),
      })
    }
  },
  {
    summary: 'Create or update ESG project',
    tags: ['ESG'],
    bodySchema: ESGPayloadSchema,
  }
)

export default router

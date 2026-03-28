import { logger } from '@ezstart/logger/server'
import { createRouterWithDoc, OpenAPIRegistry, Router, sendSuccess, sendError } from '@ezstart/express-core'
import { z } from 'zod'
import { getThemeOverrideModel } from '../../models/ThemeOverride.js'

export const deleteThemeRegistry = new OpenAPIRegistry()

const router: any = Router()
const docRouter = createRouterWithDoc(deleteThemeRegistry, router, '/theme')

const DeleteThemeResponseSchema = z.object({
  success: z.boolean().describe('Whether the operation succeeded'),
  message: z.string().optional().describe('Success message'),
  error: z.string().optional().describe('Error message if failed'),
  timestamp: z.string().describe('Response ISO timestamp'),
})

// DELETE /api/theme - Delete theme overrides (reset to default)
docRouter.delete(
  '/',
  async (req, res) => {
    try {
      const ThemeOverride = await getThemeOverrideModel()

      // For now, we use a fixed appName 'green-pulse'
      const appName = 'green-pulse'

      const result = await ThemeOverride.deleteOne({ appName })

      if (result.deletedCount === 0) {
        return res.json({
          success: true,
          message: 'No theme overrides to delete',
          timestamp: new Date().toISOString(),
        })
      }

      res.json({
        success: true,
        message: 'Theme overrides deleted successfully',
        timestamp: new Date().toISOString(),
      })
    } catch (error) {
      logger.error('Error deleting theme:', error)
      res.status(500).json({
        success: false,
        error: 'Failed to delete theme',
        timestamp: new Date().toISOString(),
      })
    }
  },
  {
    summary: 'Delete theme overrides',
    tags: ['Theme'],
    responseSchema: DeleteThemeResponseSchema,
  }
)

export default router

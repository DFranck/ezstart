import { createRouterWithDoc, OpenAPIRegistry, Router } from '@ezstart/express-core'
import { z } from 'zod'
import { getThemeOverrideModel } from '../../models/ThemeOverride.js'

export const deleteThemeRegistry = new OpenAPIRegistry()

const router: any = Router()
const docRouter = createRouterWithDoc(deleteThemeRegistry, router, '/theme')

const DeleteThemeResponseSchema = z.object({
  success: z.boolean(),
  message: z.string().optional(),
  error: z.string().optional(),
  timestamp: z.string(),
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
      console.error('Error deleting theme:', error)
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

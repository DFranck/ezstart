import { logger } from '@ezstart/logger/server'
import { createRouterWithDoc, OpenAPIRegistry, Router, sendSuccess, sendError } from '@ezstart/express-core'
import { z } from 'zod'
import { getThemeOverrideModel } from '../../models/ThemeOverride.js'

export const getThemeRegistry = new OpenAPIRegistry()

const router: any = Router()
const docRouter = createRouterWithDoc(getThemeRegistry, router, '/theme')

const ThemeResponseSchema = z.object({
  success: z.boolean().describe('Whether the operation succeeded'),
  data: z
    .object({
      appName: z.string().describe('Application name'),
      overrides: z.record(z.string()).describe('CSS variable overrides map'),
      updatedAt: z.string().describe('Last update ISO timestamp'),
      updatedBy: z.string().optional().describe('User who last updated'),
    })
    .nullable()
    .describe('Theme data or null'),
  timestamp: z.string().describe('Response ISO timestamp'),
})

// GET /api/theme - Get theme overrides
docRouter.get(
  '/',
  async (req, res) => {
    try {
      const ThemeOverride = await getThemeOverrideModel()

      // For now, we use a fixed appName 'green-pulse'
      // In the future, this could be multi-tenant
      const appName = 'green-pulse'

      // @ts-ignore - Mongoose type overload issue with lean() + exec()
      const themeOverride = await ThemeOverride.findOne({ appName }).lean().exec()

      if (!themeOverride) {
        return sendSuccess(res, null)
      }

      // Convert Map to Object
      const overrides: Record<string, string> = {}
      if (themeOverride.overrides) {
        for (const [key, value] of Object.entries(themeOverride.overrides)) {
          overrides[key] = value as string
        }
      }

      sendSuccess(res, {
        appName: themeOverride.appName,
        overrides,
        updatedAt: themeOverride.updatedAt.toISOString(),
        updatedBy: themeOverride.updatedBy,
      })
    } catch (error) {
      logger.error('Error fetching theme:', error)
      sendError(res, 'Failed to fetch theme')
    }
  },
  {
    summary: 'Get theme overrides',
    tags: ['Theme'],
    responseSchema: ThemeResponseSchema,
  }
)

export default router

import { createRouterWithDoc, OpenAPIRegistry, Router } from '@ezstart/express-core'
import { z } from 'zod'
import { getThemeOverrideModel } from '../../models/ThemeOverride.js'

export const getThemeRegistry = new OpenAPIRegistry()

const router: any = Router()
const docRouter = createRouterWithDoc(getThemeRegistry, router, '/theme')

const ThemeResponseSchema = z.object({
  success: z.boolean(),
  data: z
    .object({
      appName: z.string(),
      overrides: z.record(z.string()),
      updatedAt: z.string(),
      updatedBy: z.string().optional(),
    })
    .nullable(),
  timestamp: z.string(),
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
        return res.json({
          success: true,
          data: null,
          timestamp: new Date().toISOString(),
        })
      }

      // Convert Map to Object
      const overrides: Record<string, string> = {}
      if (themeOverride.overrides) {
        for (const [key, value] of Object.entries(themeOverride.overrides)) {
          overrides[key] = value as string
        }
      }

      res.json({
        success: true,
        data: {
          appName: themeOverride.appName,
          overrides,
          updatedAt: themeOverride.updatedAt.toISOString(),
          updatedBy: themeOverride.updatedBy,
        },
        timestamp: new Date().toISOString(),
      })
    } catch (error) {
      console.error('Error fetching theme:', error)
      res.status(500).json({
        success: false,
        data: null,
        error: 'Failed to fetch theme',
        timestamp: new Date().toISOString(),
      })
    }
  },
  {
    summary: 'Get theme overrides',
    tags: ['Theme'],
    responseSchema: ThemeResponseSchema,
  }
)

export default router

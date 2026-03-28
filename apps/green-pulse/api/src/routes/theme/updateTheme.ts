import { logger } from '@ezstart/logger/server'
import { createRouterWithDoc, OpenAPIRegistry, Router } from '@ezstart/express-core'
import { z } from 'zod'
import { getThemeOverrideModel } from '../../models/ThemeOverride.js'

export const updateThemeRegistry = new OpenAPIRegistry()

const router: any = Router()
const docRouter = createRouterWithDoc(updateThemeRegistry, router, '/theme')

const UpdateThemeRequestSchema = z.object({
  overrides: z.record(z.string()),
})

const ThemeResponseSchema = z.object({
  success: z.boolean(),
  data: z
    .object({
      appName: z.string(),
      overrides: z.record(z.string()),
      updatedAt: z.string(),
    })
    .nullable(),
  error: z.string().optional(),
  timestamp: z.string(),
})

// PUT /api/theme - Update theme overrides
docRouter.put(
  '/',
  async (req, res) => {
    try {
      // Validate request body
      const validation = UpdateThemeRequestSchema.safeParse(req.body)

      if (!validation.success) {
        return res.status(400).json({
          success: false,
          data: null,
          error: 'Invalid request body',
          timestamp: new Date().toISOString(),
        })
      }

      const { overrides } = validation.data

      const ThemeOverride = await getThemeOverrideModel()

      // For now, we use a fixed appName 'green-pulse'
      const appName = 'green-pulse'

      // TODO: Get userId from auth middleware
      // const userId = req.user?.id

      // Upsert theme override
      // @ts-ignore - Mongoose type overload issue with lean option + exec()
      const themeOverride = await ThemeOverride.findOneAndUpdate(
        { appName },
        {
          appName,
          overrides,
          updatedAt: new Date(),
          // updatedBy: userId,
        },
        {
          upsert: true,
          new: true,
          lean: true,
        }
      ).exec()

      // Convert Map to Object
      const overridesObj: Record<string, string> = {}
      if (themeOverride?.overrides) {
        for (const [key, value] of Object.entries(themeOverride.overrides)) {
          overridesObj[key] = value as string
        }
      }

      res.json({
        success: true,
        data: {
          appName: themeOverride?.appName || appName,
          overrides: overridesObj,
          updatedAt: (themeOverride?.updatedAt || new Date()).toISOString(),
        },
        timestamp: new Date().toISOString(),
      })
    } catch (error) {
      logger.error('Error updating theme:', error)
      res.status(500).json({
        success: false,
        data: null,
        error: 'Failed to update theme',
        timestamp: new Date().toISOString(),
      })
    }
  },
  {
    summary: 'Update theme overrides',
    tags: ['Theme'],
    bodySchema: UpdateThemeRequestSchema,
    responseSchema: ThemeResponseSchema,
  }
)

export default router

import { logger } from '@ezstart/logger/server'
import { createRouterWithDoc, OpenAPIRegistry, Router, sendSuccess, sendError, sendValidationError } from '@ezstart/express-core'
import { z } from 'zod'
import { getThemeOverrideModel } from '../../models/ThemeOverride.js'

export const updateThemeRegistry = new OpenAPIRegistry()

const router: any = Router()
const docRouter = createRouterWithDoc(updateThemeRegistry, router, '/theme')

const UpdateThemeRequestSchema = z.object({
  overrides: z.record(z.string()).describe('CSS variable overrides map'),
})

const ThemeResponseSchema = z.object({
  success: z.boolean().describe('Whether the operation succeeded'),
  data: z
    .object({
      appName: z.string().describe('Application name'),
      overrides: z.record(z.string()).describe('CSS variable overrides map'),
      updatedAt: z.string().describe('Last update ISO timestamp'),
    })
    .nullable()
    .describe('Theme data or null'),
  error: z.string().optional().describe('Error message if failed'),
  timestamp: z.string().describe('Response ISO timestamp'),
})

// PUT /api/theme - Update theme overrides
docRouter.put(
  '/',
  async (req, res) => {
    try {
      // Validate request body
      const validation = UpdateThemeRequestSchema.safeParse(req.body)

      if (!validation.success) {
        return sendValidationError(res, 'Invalid request body', validation.error.errors)
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

      sendSuccess(res, {
        appName: themeOverride?.appName || appName,
        overrides: overridesObj,
        updatedAt: (themeOverride?.updatedAt || new Date()).toISOString(),
      })
    } catch (error) {
      logger.error('Error updating theme:', error)
      sendError(res, 'Failed to update theme')
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

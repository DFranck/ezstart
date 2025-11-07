import { z } from 'zod'

/**
 * OKLCH color format validation
 * Format: oklch(L C H) or oklch(L C H / A)
 * - L (Lightness): 0-1
 * - C (Chroma): 0-0.4 (typically)
 * - H (Hue): 0-360
 * - A (Alpha): 0-1 (optional)
 */
export const oklchColorSchema = z
  .string()
  .regex(
    /^oklch\([\d.]+ [\d.]+ [\d.]+(?:\s*\/\s*[\d.]+)?\)$/,
    'Invalid OKLCH format. Expected: oklch(L C H) or oklch(L C H / A)'
  )
  .refine(
    value => {
      const match = value.match(/oklch\(([\d.]+) ([\d.]+) ([\d.]+)/)
      if (!match || !match[1] || !match[2] || !match[3]) return false

      const l = Number(match[1])
      const c = Number(match[2])
      const h = Number(match[3])

      // Validate ranges
      return l >= 0 && l <= 1 && c >= 0 && c <= 0.5 && h >= 0 && h <= 360
    },
    {
      message: 'OKLCH values out of range (L: 0-1, C: 0-0.5, H: 0-360)',
    }
  )

/**
 * Hex color format validation
 */
export const hexColorSchema = z
  .string()
  .regex(/^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/, 'Invalid hex color format')

/**
 * CSS variable name validation
 */
export const cssVariableNameSchema = z
  .string()
  .regex(/^--[a-z0-9-]+$/, 'CSS variable must start with -- and contain only lowercase letters, numbers, and hyphens')

/**
 * Theme variable category
 */
export const themeVariableCategorySchema = z.enum([
  'primary',
  'secondary',
  'accent',
  'status',
  'platform',
  'custom',
])

/**
 * Single theme variable
 */
export const themeVariableSchema = z.object({
  name: cssVariableNameSchema,
  value: z.union([oklchColorSchema, hexColorSchema, z.string()]), // Allow any string as fallback
  category: themeVariableCategorySchema,
  description: z.string().optional(),
})

/**
 * Theme configuration (default theme)
 */
export const themeConfigSchema = z.object({
  variables: z.array(themeVariableSchema),
  metadata: z
    .object({
      appName: z.string(),
      version: z.string().optional(),
    })
    .optional(),
})

/**
 * Theme overrides (saved in DB)
 */
export const themeOverridesSchema = z.object({
  appName: z.string().min(1),
  overrides: z.record(cssVariableNameSchema, z.string()),
  updatedAt: z.string().datetime(),
  updatedBy: z.string().optional(),
})

/**
 * API response for GET /theme
 */
export const themeApiResponseSchema = z.object({
  success: z.boolean(),
  data: themeOverridesSchema.nullable(),
  error: z.string().optional(),
})

/**
 * API request for PUT /theme
 */
export const themeApiRequestSchema = z.object({
  overrides: z.record(cssVariableNameSchema, z.string()),
})

// Type exports
export type OklchColor = z.infer<typeof oklchColorSchema>
export type HexColor = z.infer<typeof hexColorSchema>
export type CssVariableName = z.infer<typeof cssVariableNameSchema>
export type ThemeVariableCategory = z.infer<typeof themeVariableCategorySchema>
export type ThemeVariable = z.infer<typeof themeVariableSchema>
export type ThemeConfig = z.infer<typeof themeConfigSchema>
export type ThemeOverrides = z.infer<typeof themeOverridesSchema>
export type ThemeApiResponse = z.infer<typeof themeApiResponseSchema>
export type ThemeApiRequest = z.infer<typeof themeApiRequestSchema>

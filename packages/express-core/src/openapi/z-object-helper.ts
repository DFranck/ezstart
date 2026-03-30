import { z } from '../types/zod.js'
import { ZodTypeAny } from 'zod'

/**
 * ✅ Crée un z.object + enregistre automatiquement son openapi(name)
 */
export function zObjectWithAutoOpenApi<T extends Record<string, ZodTypeAny>>(
  name: string,
  shape: T
) {
  const schema = z.object(shape)
  schema.openapi(name)
  return schema
}

export function withExample<T extends ZodTypeAny>(schema: T, example: unknown): T {
  // @ts-ignore zod-to-openapi ajoute .openapi()
  return schema.openapi({ example })
}

export const apiErrorSchema = z
  .object({
    success: z.literal(false).describe('Indicates the request failed'),
    error: z.string().describe('Human-readable error message'),
    details: z.any().optional().describe('Additional validation or error details'),
  })
  .describe('Standardized API error response')
  .openapi({
    example: {
      success: false,
      error: 'Example error',
      details: { field: 'Exemple field', message: 'Exemple message' },
    },
  })

/**
 * Shared success response wrapper for OpenAPI documentation.
 * Wraps a data schema with the standard { success, data, meta } envelope.
 */
export function apiSuccessSchema<T extends ZodTypeAny>(dataSchema: T, name: string) {
  return z
    .object({
      success: z.literal(true).describe('Indicates the request succeeded'),
      data: dataSchema.describe('Response payload'),
      meta: z
        .object({
          total: z.number().optional().describe('Total number of items (for paginated responses)'),
          limit: z.number().optional().describe('Maximum items per page'),
          offset: z.number().optional().describe('Number of items skipped'),
        })
        .optional()
        .describe('Pagination and response metadata'),
    })
    .describe('Standardized API success response')
    .openapi(name)
}

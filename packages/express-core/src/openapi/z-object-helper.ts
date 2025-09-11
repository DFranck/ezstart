import { z } from '@ezstart/types'
import { ZodTypeAny } from 'zod'

/**
 * ✅ Crée un z.object + enregistre automatiquement son openapi(name)
 */
export function zObjectWithAutoOpenApi<T extends Record<string, any>>(
  name: string,
  shape: T
) {
  const schema = z.object(shape);
  schema.openapi(name);
  return schema;
}

export function withExample<T extends ZodTypeAny>(
  schema: T,
  example: unknown
): T {
  // @ts-ignore zod-to-openapi ajoute .openapi()
  return schema.openapi({ example });
}

export const apiErrorSchema = z
  .object({
    error: z.string(),
    details: z.any().optional(),
  })
  .describe('API error')
  .openapi({
    example: {
      error: 'Example error',
      details: { field: 'Exemple field', message: 'Exemple message' },
    },
  });

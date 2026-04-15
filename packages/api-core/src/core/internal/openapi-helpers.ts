/**
 * @internal OpenAPI helpers shared by the doc-enabled router.
 *
 * - `stripIncompatible` unwraps `ZodEffects` and converts `nativeEnum`
 *   values that `@asteasolutions/zod-to-openapi` can't serialize directly.
 * - `openApiCompatible` wraps a schema, optionally registers it with
 *   `.openapi(name)` when the extension is present.
 */

import type { ZodTypeAny } from 'zod'
import { z } from 'zod'

/**
 * @internal Walk refine/transform schemas and convert `ZodNativeEnum` → `z.enum`
 * so `@asteasolutions/zod-to-openapi` can serialize them.
 */
export function stripIncompatible(schema: ZodTypeAny): ZodTypeAny {
  const def = (
    schema as ZodTypeAny & {
      _def?: { schema?: ZodTypeAny; typeName?: string; values?: Record<string, unknown> }
    }
  )?._def

  if (def?.schema) return stripIncompatible(def.schema)

  if (def?.typeName === 'ZodNativeEnum') {
    const values = Object.values(def.values ?? {}).filter(v => typeof v === 'string') as string[]
    if (values.length === 0) {
      throw new Error('ZodNativeEnum has no string values, cannot convert for OpenAPI')
    }
    const [first, ...rest] = values
    return z.enum([first, ...rest] as [string, ...string[]])
  }

  return schema
}

type OpenApiExtended = { openapi?: (name: string) => ZodTypeAny }

/**
 * @internal Strip then register a schema under `name` for OpenAPI emission.
 * Falls back gracefully when `.openapi()` isn't present on the schema.
 */
export function openApiCompatible<T extends ZodTypeAny>(schema: T, name: string): ZodTypeAny {
  const clean = stripIncompatible(schema)
  const withOpenApi = clean as ZodTypeAny & OpenApiExtended
  const registered = withOpenApi.openapi?.(name)
  return registered ?? clean
}

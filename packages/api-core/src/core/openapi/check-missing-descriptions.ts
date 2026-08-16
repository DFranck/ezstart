/**
 * `checkMissingDescriptions` — inspect a Zod schema (and the registries that
 * reference it) and emit a debug log for every field missing a `.describe()`
 * annotation.
 *
 * Useful to audit OpenAPI coverage: Swagger UI renders `description` fields,
 * so missing them shows up as blank columns. Run this helper at boot, right
 * after generating the OpenAPI document.
 *
 * Fully agnostic: takes an optional `logger` (any `ServerLogger`). Silent
 * no-op when no logger is provided.
 */

import type { OpenAPIRegistry } from '@asteasolutions/zod-to-openapi'
import type { ZodObject, ZodTypeAny } from 'zod'
import { silentLogger } from '../internal/logger.js'
import type { ServerLogger } from '../types.js'

type ZodObjectLike = ZodObject<Record<string, ZodTypeAny>>

function getTypeName(schema: ZodTypeAny): string | undefined {
  const def = (schema as ZodTypeAny & { _def?: { typeName?: string } })._def
  return def?.typeName
}

function getDescription(schema: ZodTypeAny): string | undefined {
  const def = (schema as ZodTypeAny & { _def?: { description?: string } })._def
  return def?.description
}

/**
 * Walk a single schema and log every top-level property missing a description.
 *
 * @example
 * ```ts
 * import { z } from 'zod'
 * import { checkMissingDescriptions } from '@ezstart/api-core'
 *
 * const schema = z.object({
 *   name: z.string(),               // missing description → logged
 *   email: z.string().describe('Email address'),
 * })
 *
 * checkMissingDescriptions(schema, 'User', console)
 * ```
 */
export function checkMissingDescriptions(
  schema: ZodTypeAny,
  name: string,
  logger: ServerLogger = silentLogger
): string[] {
  if (getTypeName(schema) !== 'ZodObject') return []

  const shape = (schema as ZodObjectLike).shape ?? {}
  const missing: string[] = []

  for (const key of Object.keys(shape)) {
    const field = shape[key] as ZodTypeAny
    const desc = getDescription(field)
    if (!desc || desc.trim().length === 0) {
      missing.push(key)
    }
  }

  if (missing.length > 0) {
    logger.debug(`[OpenAPI] ${name} - Missing descriptions for: ${missing.join(', ')}`)
  }

  return missing
}

/**
 * Scan every schema registered in one or more `OpenAPIRegistry` instances.
 *
 * Each registry tracks `components` (referenced schemas). This helper walks
 * them and delegates to `checkMissingDescriptions` per schema.
 *
 * @example
 * ```ts
 * import { OpenAPIRegistry } from '@asteasolutions/zod-to-openapi'
 * import { scanRegistriesForMissingDescriptions } from '@ezstart/api-core'
 *
 * const registry = new OpenAPIRegistry()
 * // ...registry.register('User', userSchema)
 *
 * scanRegistriesForMissingDescriptions([registry], console)
 * ```
 */
export function scanRegistriesForMissingDescriptions(
  registries: OpenAPIRegistry[],
  logger: ServerLogger = silentLogger
): Record<string, string[]> {
  const report: Record<string, string[]> = {}

  for (const registry of registries) {
    for (const definition of registry.definitions) {
      const record = definition as {
        type?: string
        componentType?: string
        name?: string
        schema?: ZodTypeAny
      }
      // Support both legacy (`{ type: 'component', componentType: 'schemas' }`)
      // and current (`{ type: 'schema' }`) shapes of zod-to-openapi.
      const isSchema =
        (record.type === 'component' && record.componentType === 'schemas') ||
        record.type === 'schema'
      if (!isSchema || !record.schema) continue
      // In the `schema` shape the name lives in the Zod schema's openapi meta
      // (`_def.openapi._internal.refId`). Fallback to the explicit `name` prop.
      const schemaWithMeta = record.schema as ZodTypeAny & {
        _def?: { openapi?: { _internal?: { refId?: string } } }
      }
      const name = record.name ?? schemaWithMeta._def?.openapi?._internal?.refId ?? undefined
      if (!name) continue
      const missing = checkMissingDescriptions(record.schema, name, logger)
      if (missing.length > 0) report[name] = missing
    }
  }

  return report
}

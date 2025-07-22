import { z } from '@ezstart/types';
import type { ZodTypeAny } from 'zod';

/**
 * Dépile les schémas incompatibles avec Swagger :
 * - ZodEffects => retourne le schema original
 * - ZodNativeEnum => converti en z.enum([...])
 */
export function stripIncompatible(schema: ZodTypeAny): ZodTypeAny {
  const def = (schema as any)?._def;

  // ✅ Si refine/transform -> dépile
  if (def?.schema) return stripIncompatible(def.schema);

  // ✅ Si nativeEnum → convertit en enum
  if (def?.typeName === 'ZodNativeEnum') {
    const values = Object.values(def.values).filter(
      (v) => typeof v === 'string'
    ) as string[];

    if (values.length === 0) {
      throw new Error(
        'ZodNativeEnum has no string values, cannot convert for OpenAPI'
      );
    }

    const [first, ...rest] = values;
    return z.enum([first, ...rest] as [string, ...string[]]);
  }

  return schema;
}

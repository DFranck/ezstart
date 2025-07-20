// packages/api-core/src/openapi.ts
import { extendZodWithOpenApi } from '@asteasolutions/zod-to-openapi';
import type { ZodTypeAny } from 'zod';
import { z as baseZod } from 'zod';

// ✅ Patch une seule fois
extendZodWithOpenApi(baseZod);

// ✅ On exporte le z patché
export const z = baseZod;
export function zObjectWithAutoOpenApi<T extends Record<string, any>>(
  name: string,
  shape: T
) {
  const schema = z.object(shape);
  schema.openapi(name); // <-- auto-enregistre immédiatement
  return schema;
}
export {
  OpenApiGeneratorV3,
  OpenAPIRegistry,
} from '@asteasolutions/zod-to-openapi';

/**
 * Dépile les schémas incompatibles pour Swagger :
 * - ZodEffects => on récupère le schema original
 * - ZodNativeEnum => converti en z.enum([...])
 */
function stripIncompatible(schema: ZodTypeAny): ZodTypeAny {
  const def = (schema as any)?._def;

  // ✅ Si refine/transform -> dépile
  if (def?.schema) return stripIncompatible(def.schema);

  // ✅ Si nativeEnum → on le convertit en z.enum([...])
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
    return baseZod.enum([first, ...rest] as [string, ...string[]]);
  }

  return schema;
}

/**
 * ✅ Convertit un schéma Zod pur en schéma Swagger-friendly :
 * - dépile ZodEffects
 * - convertit les nativeEnum
 * - ajoute .openapi(name)
 */
export function openApiCompatible<T extends ZodTypeAny>(
  schema: T,
  name: string
): T {
  const clean = stripIncompatible(schema);

  console.log('🔍 SCHEMA TYPE:', clean._def?.typeName);
  console.log('🔍 HAS OPENAPI?', typeof (clean as any).openapi);

  // @ts-ignore après patch openapi existe
  return clean.openapi?.(name) ?? clean;
}

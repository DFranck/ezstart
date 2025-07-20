import type { ZodTypeAny } from 'zod';
import { stripIncompatible } from './strip-incompatible';

/**
 * ✅ Rends un schéma Zod compatible Swagger :
 * - dépile les ZodEffects
 * - convertit les nativeEnum
 * - ajoute `.openapi(name)` si dispo
 */
export function openApiCompatible<T extends ZodTypeAny>(
  schema: T,
  name: string
): T {
  const clean = stripIncompatible(schema);

  // Debug (facultatif)
  console.log('🔍 SCHEMA TYPE:', clean._def?.typeName);
  console.log('🔍 HAS OPENAPI?', typeof (clean as any).openapi);

  // @ts-ignore après patch openapi existe
  return clean.openapi?.(name) ?? clean;
}

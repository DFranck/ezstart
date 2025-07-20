import type { ZodTypeAny } from 'zod';
import { checkMissingDescriptions } from './check-missing-descriptions';
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

  // 🔍 Vérifie si on a des champs sans `.describe()`
  checkMissingDescriptions(clean, name);

  // @ts-ignore après patch openapi existe
  return clean.openapi?.(name) ?? clean;
}

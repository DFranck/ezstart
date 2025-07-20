import { z } from './zod-extended';

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

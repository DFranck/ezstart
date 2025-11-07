import type { ZodObject, ZodTypeAny } from 'zod';

export function checkMissingDescriptions(schema: ZodTypeAny, name: string) {
  // Si ce n’est pas un ZodObject → on ignore
  if ((schema as any)?._def?.typeName !== 'ZodObject') return;

  const shape = (schema as ZodObject<any>)?.shape ?? {};
  const missing: string[] = [];

  for (const key in shape) {
    const field: any = shape[key];
    const desc = field._def?.description;

    if (!desc || desc.trim().length === 0) {
      missing.push(key);
    }
  }

  if (missing.length > 0) {
    console.warn(
      `⚠️ [OpenAPI] ${name} - Missing descriptions for: ${missing.join(', ')}`
    );
  }
}

import { ZodObject, ZodTypeAny } from 'zod';

export function zodToRouteParams(
  schema: ZodTypeAny
): ZodObject<any> | undefined {
  return schema instanceof ZodObject ? schema : undefined;
}

import { extendZodWithOpenApi } from '@asteasolutions/zod-to-openapi';
import { z as baseZod } from 'zod';

extendZodWithOpenApi(baseZod);

export const z = baseZod;
export type { infer as Infer, input as Input } from 'zod';

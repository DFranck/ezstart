import { z } from 'zod';

export const getListQuerySchema = z.object({
  includeDeleted: z.preprocess(
    (v) => v === '1' || v === 'true' || v === true,
    z.boolean().optional()
  ),
  deletedOnly: z.preprocess(
    (v) => v === '1' || v === 'true' || v === true,
    z.boolean().optional()
  ),
});

export const getPaginatedListQuerySchema = getListQuerySchema.extend({
  page: z.preprocess(
    (v) => (typeof v === 'string' ? parseInt(v, 10) : v),
    z.number().min(1).optional()
  ),
  limit: z.preprocess(
    (v) => (typeof v === 'string' ? parseInt(v, 10) : v),
    z.number().min(1).max(100).optional()
  ),
  from: z.string().optional(), // date ISO min
  to: z.string().optional(), // date ISO max
});

export type GetListQuery = z.infer<typeof getListQuerySchema>;
export type GetPaginatedListQuery = z.infer<typeof getPaginatedListQuerySchema>;

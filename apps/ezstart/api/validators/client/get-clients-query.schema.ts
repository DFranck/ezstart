import { z } from 'zod';

export const getClientsQuerySchema = z.object({
  includeDeleted: z.preprocess(
    (v) => v === '1' || v === 'true' || v === true,
    z.boolean().optional()
  ),
  deletedOnly: z.preprocess(
    (v) => v === '1' || v === 'true' || v === true,
    z.boolean().optional()
  ),
});

export type GetClientsQuery = z.infer<typeof getClientsQuerySchema>;

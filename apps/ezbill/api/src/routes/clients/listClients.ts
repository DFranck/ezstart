/**
 * GET /api/clients
 * List Clients (authenticated)
 */

/**
 * GET /api/clients
 * List Clients (authenticated)
 */

import {
  Router,
  createRouterWithDoc,
  OpenAPIRegistry,
} from '@ezstart/express-core';
import { clientSchema } from '@ezbill/types';
import { z } from 'zod';
import * as secureControllers from '../../controllers/client/client.secure-controllers.js';
import { authMiddleware } from '../../middleware/auth.js';

export const listClientsRegistry = new OpenAPIRegistry();
const router = Router();
export const listClientsRouter = createRouterWithDoc(
  listClientsRegistry,
  router,
  '/clients'
);

const paginatedClientsSchema = z.object({
  data: clientSchema.array(),
  pagination: z.object({
    page: z.number(),
    limit: z.number(),
    total: z.number(),
    totalPages: z.number(),
  }),
});

listClientsRouter.get(
  '/',
  authMiddleware,
  secureControllers.getSecureClientsController,
  {
    summary: 'List Clients (authenticated)',
    tags: ['Clients'],
    responseSchema: paginatedClientsSchema,
  }
);

export default router;

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
  data: clientSchema.array().describe('Array of client objects'),
  pagination: z.object({
    page: z.number().describe('Current page number'),
    limit: z.number().describe('Items per page'),
    total: z.number().describe('Total number of items'),
    totalPages: z.number().describe('Total number of pages'),
  }).describe('Pagination metadata'),
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

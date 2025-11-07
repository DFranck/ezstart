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
import * as secureControllers from '../../controllers/client/client.secure-controllers.js';
import { authMiddleware } from '../../middleware/auth.js';

export const listClientsRegistry = new OpenAPIRegistry();
const router = Router();
export const listClientsRouter = createRouterWithDoc(
  listClientsRegistry,
  router,
  '/clients'
);

listClientsRouter.get(
  '/',
  authMiddleware,
  secureControllers.getSecureClientsController,
  {
    summary: 'List Clients (authenticated)',
    tags: ['Clients'],
    responseSchema: clientSchema.array(),
  }
);

export default router;

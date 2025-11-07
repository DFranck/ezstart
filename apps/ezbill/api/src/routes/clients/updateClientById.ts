/**
 * PUT /api/clients/:id
 * Update Client (authenticated)
 */

import {
  Router,
  createRouterWithDoc,
  OpenAPIRegistry,
  validateParams,
} from '@ezstart/express-core';
import { billingClientSchema, paramsMongoIdSchema, clientSchema } from '@ezbill/types';
import * as secureControllers from '../../controllers/client/client.secure-controllers.js';
import { authMiddleware } from '../../middleware/auth.js';

export const updateClientByIdRegistry = new OpenAPIRegistry();
const router = Router();
export const updateClientByIdRouter = createRouterWithDoc(
  updateClientByIdRegistry,
  router,
  '/clients'
);

updateClientByIdRouter.put(
  '/:id',
  authMiddleware,
  validateParams(paramsMongoIdSchema),
  secureControllers.updateSecureClientController,
  {
    summary: 'Update Client (authenticated)',
    tags: ['Clients'],
    bodySchema: billingClientSchema,
    paramsSchema: paramsMongoIdSchema,
    responseSchema: clientSchema,
  }
);

export default router;

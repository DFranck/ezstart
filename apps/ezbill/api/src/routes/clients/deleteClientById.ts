/**
 * DELETE /api/clients/:id
 * Soft delete Client (authenticated)
 */

import {
  Router,
  createRouterWithDoc,
  OpenAPIRegistry,
  validateParams,
} from '@ezstart/express-core';
import { paramsMongoIdSchema } from '@ezbill/types';
import * as secureControllers from '../../controllers/client/client.secure-controllers.js';
import { authMiddleware } from '../../middleware/auth.js';

export const deleteClientByIdRegistry = new OpenAPIRegistry();
const router = Router();
export const deleteClientByIdRouter = createRouterWithDoc(
  deleteClientByIdRegistry,
  router,
  '/clients'
);

deleteClientByIdRouter.delete(
  '/:id',
  authMiddleware,
  validateParams(paramsMongoIdSchema),
  secureControllers.softDeleteSecureClientController,
  {
    summary: 'Soft delete Client (authenticated)',
    tags: ['Clients'],
    paramsSchema: paramsMongoIdSchema,
  }
);

export default router;

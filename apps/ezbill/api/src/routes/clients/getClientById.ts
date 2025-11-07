/**
 * GET /api/clients/:id
 * Get Client by ID (authenticated)
 */

import {
  Router,
  createRouterWithDoc,
  OpenAPIRegistry,
  validateParams,
} from '@ezstart/express-core';
import { paramsMongoIdSchema, clientSchema } from '@ezbill/types';
import * as secureControllers from '../../controllers/client/client.secure-controllers.js';
import { authMiddleware } from '../../middleware/auth.js';

export const getClientByIdRegistry = new OpenAPIRegistry();
const router = Router();
export const getClientByIdRouter = createRouterWithDoc(
  getClientByIdRegistry,
  router,
  '/clients'
);

getClientByIdRouter.get(
  '/:id',
  authMiddleware,
  validateParams(paramsMongoIdSchema),
  secureControllers.getSecureClientByIdController,
  {
    summary: 'Get Client by ID (authenticated)',
    tags: ['Clients'],
    paramsSchema: paramsMongoIdSchema,
    responseSchema: clientSchema,
  }
);

export default router;

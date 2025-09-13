import {
  createRouterWithDoc,
  OpenAPIRegistry,
  validateParams,
  validateQuery,
  Router,
} from '@ezstart/express-core';
import {
  billingClientSchema,
  clientSchema,
  getClientsQuerySchema,
  paramsMongoIdSchema,
} from '@ez-billing/types';
import * as secureControllers from '../controllers/client/client.secure-controllers.js';
import { authMiddleware } from '../middleware/auth.js';
import { z } from 'zod';

export const clientsRegistry = new OpenAPIRegistry();

const router = Router();
const docRouter = createRouterWithDoc(clientsRegistry, router, '/clients');

docRouter.post('/', authMiddleware, secureControllers.createSecureClientController, {
  summary: 'Create a Client (authenticated)',
  tags: ['Clients'],
  bodySchema: billingClientSchema,
  responseSchema: clientSchema,
  status: 201,
});

docRouter.get(
  '/',
  authMiddleware,
  secureControllers.getSecureClientsController,
  {
    summary: 'List Clients (authenticated)',
    tags: ['Clients'],
    responseSchema: clientSchema.array(),
  }
);

docRouter.get(
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

docRouter.put(
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

docRouter.delete(
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

docRouter.post(
  '/:id/restore',
  authMiddleware,
  validateParams(paramsMongoIdSchema),
  secureControllers.restoreSecureClientController,
  {
    summary: 'Restore Client (authenticated)',
    tags: ['Clients'],
    paramsSchema: paramsMongoIdSchema,
    responseSchema: clientSchema,
  }
);

docRouter.delete(
  '/:id/hard-delete',
  authMiddleware,
  validateParams(paramsMongoIdSchema),
  secureControllers.hardDeleteSecureClientController,
  {
    summary: 'Hard delete Client (authenticated)',
    tags: ['Clients'],
    paramsSchema: paramsMongoIdSchema,
  }
);

export default router;

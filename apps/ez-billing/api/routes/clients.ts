import {
  createRouterWithDoc,
  OpenAPIRegistry,
  validateParams,
  validateQuery,
} from '@ezstart/api-core';
import {
  billingClientSchema,
  clientSchema,
  getClientsQuerySchema,
  paramsMongoIdSchema,
} from '@ez-billing/types';
import express, { Router } from 'express';
import * as controllers from '../controllers/client/client.controllers';

export const clientsRegistry = new OpenAPIRegistry();

const router: Router = express.Router();
const docRouter = createRouterWithDoc(clientsRegistry, router);

docRouter.post('/', controllers.createClientController, {
  summary: 'Create a Client',
  tags: ['Clients'],
  bodySchema: billingClientSchema,
  responseSchema: clientSchema,
  status: 201,
});

docRouter.get(
  '/',
  validateQuery(getClientsQuerySchema),
  controllers.getClientsController,
  {
    summary: 'List Clients',
    tags: ['Clients'],
    querySchema: getClientsQuerySchema,
    responseSchema: clientSchema.array(),
  }
);

docRouter.get(
  '/:id',
  validateParams(paramsMongoIdSchema),
  controllers.getClientByIdController,
  {
    summary: 'Get Client by ID',
    tags: ['Clients'],
    paramsSchema: paramsMongoIdSchema,
    responseSchema: clientSchema,
  }
);

docRouter.put('/:id', controllers.updateClientController, {
  summary: 'Update Client',
  tags: ['Clients'],
  bodySchema: billingClientSchema,
  paramsSchema: paramsMongoIdSchema,
  responseSchema: clientSchema,
});

docRouter.delete('/:id', controllers.softDeleteClientController, {
  summary: 'Soft delete Client',
  tags: ['Clients'],
  paramsSchema: paramsMongoIdSchema,
});

docRouter.post('/:id/restore', controllers.restoreClientController, {
  summary: 'Restore Client',
  tags: ['Clients'],
  paramsSchema: paramsMongoIdSchema,
  responseSchema: clientSchema,
});

docRouter.delete(
  '/:id/hard-delete',
  controllers.hardDeleteClientController,
  {
    summary: 'Hard delete Client',
    tags: ['Clients'],
    paramsSchema: paramsMongoIdSchema,
  }
);

export default router;

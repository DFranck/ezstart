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
} from '@ezstart/types';
import express, { Router } from 'express';
import * as controllers from '../controllers/client/client.controllers';

export const clientsRegistry = new OpenAPIRegistry();

const router: Router = express.Router();
const docRouter = createRouterWithDoc(clientsRegistry, router);

docRouter.post('/clients/', controllers.createClientController, {
  summary: 'Create a Client',
  tags: ['Clients'],
  bodySchema: billingClientSchema,
  responseSchema: clientSchema,
  status: 201,
});

docRouter.get(
  '/clients/',
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
  '/clients/:id',
  validateParams(paramsMongoIdSchema),
  controllers.getClientByIdController,
  {
    summary: 'Get Client by ID',
    tags: ['Clients'],
    paramsSchema: paramsMongoIdSchema,
    responseSchema: clientSchema,
  }
);

docRouter.put('/clients/:id', controllers.updateClientController, {
  summary: 'Update Client',
  tags: ['Clients'],
  bodySchema: billingClientSchema,
  paramsSchema: paramsMongoIdSchema,
  responseSchema: clientSchema,
});

docRouter.delete('/clients/:id', controllers.softDeleteClientController, {
  summary: 'Soft delete Client',
  tags: ['Clients'],
  paramsSchema: paramsMongoIdSchema,
});

docRouter.post('/clients/:id/restore', controllers.restoreClientController, {
  summary: 'Restore Client',
  tags: ['Clients'],
  paramsSchema: paramsMongoIdSchema,
  responseSchema: clientSchema,
});

docRouter.delete(
  '/clients/:id/hard-delete',
  controllers.hardDeleteClientController,
  {
    summary: 'Hard delete Client',
    tags: ['Clients'],
    paramsSchema: paramsMongoIdSchema,
  }
);

export default router;

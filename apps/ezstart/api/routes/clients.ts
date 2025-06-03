import { getClientsQuerySchema } from '@ezstart/types/dist/schemas/client';
import express, { Router } from 'express';
import * as controllers from '../controllers/client/client.controllers';
import { validateQuery } from '../middlewares/validate-query';

const router: Router = express.Router();

router
  .post('/', controllers.createClientController)
  .get(
    '/',
    validateQuery(getClientsQuerySchema),
    controllers.getClientsController
  )
  .get('/:id', controllers.getClientByIdController)
  .put('/:id', controllers.updateClientController)
  .delete('/:id', controllers.softDeleteClientController)
  .post('/:id/restore', controllers.restoreClientController)
  .delete('/:id/hard-delete', controllers.hardDeleteClientController);

export default router;

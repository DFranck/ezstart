import express, { Router } from 'express';
import {
  createClientController,
  getClientByIdController,
  getClientsController,
  hardDeleteClientController,
  restoreClientController,
  softDeleteClientController,
  updateClientController,
} from '../controllers/client';
import { validateQuery } from '../middlewares/validate-query';
import { getClientsQuerySchema } from '../validators/client/get-clients-query.schema';

const router: Router = express.Router();

router
  .post('/', createClientController)
  .get('/', validateQuery(getClientsQuerySchema), getClientsController)
  .get('/:id', getClientByIdController)
  .put('/:id', updateClientController)
  .delete('/:id', softDeleteClientController)
  .post('/:id/restore', restoreClientController)
  .delete('/:id/hard-delete', hardDeleteClientController);

export default router;

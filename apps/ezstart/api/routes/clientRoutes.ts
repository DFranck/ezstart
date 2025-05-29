import express, { Router } from 'express';
import {
  createClientController,
  deleteClientController,
  getClientByIdController,
  getClientsController,
  updateClientController,
} from '../controllers/client';

const router: Router = express.Router();

router.post('/', createClientController);
router.get('/', getClientsController);
router.get('/:id', getClientByIdController);
router.put('/:id', updateClientController);
router.delete('/:id', deleteClientController);

export default router;

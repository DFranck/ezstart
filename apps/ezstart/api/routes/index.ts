import express, { Router } from 'express';
import clientRoutes from './client-routes';

const router: Router = express.Router();

router.use('/clients', clientRoutes);

export default router;

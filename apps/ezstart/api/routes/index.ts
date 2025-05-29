import express, { Router } from 'express';
import clientRoutes from './clientRoutes';

const router: Router = express.Router();

router.use('/clients', clientRoutes);

export default router;

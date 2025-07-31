import express, { Router } from 'express';
import gamesRoutes, { gamesRegistry } from './games';

const router: Router = express.Router();
export const globalRegistry = [gamesRegistry];

router.use('/games', gamesRoutes);

export default router;

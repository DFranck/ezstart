import express, { Router } from 'express';
import testsRoutes, { testsRegistry } from './test';

const router: Router = express.Router();
export const globalRegistry = [testsRegistry];

router.use('/tests', testsRoutes);

export default router;

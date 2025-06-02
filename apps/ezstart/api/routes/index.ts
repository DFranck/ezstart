import express, { Router } from 'express';
import clientRoutes from './clients';
import invoiceRoutes from './invoices';

const router: Router = express.Router();

router.use('/clients', clientRoutes).use('/invoices', invoiceRoutes);

export default router;

import express, { Router } from 'express';
import clientRoutes, { clientsRegistry } from './clients';
import invoiceRoutes from './invoices';
import quoteRoutes from './quotes';
import receiptRoutes from './receipts';

const router: Router = express.Router();
export const globalRegistry = [clientsRegistry];

router
  .use('/clients', clientRoutes)
  .use('/invoices', invoiceRoutes)
  .use('/quotes', quoteRoutes)
  .use('/receipts', receiptRoutes);

export default router;

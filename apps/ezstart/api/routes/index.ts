import express, { Router } from 'express';
import clientRoutes from './clients';
import invoiceRoutes from './invoices';
import quoteRoutes from './quotes';
import receiptRoutes from './receipts';
const router: Router = express.Router();

router
  .use('/clients', clientRoutes)
  .use('/invoices', invoiceRoutes)
  .use('/quotes', quoteRoutes)
  .use('/receipts', receiptRoutes);

export default router;

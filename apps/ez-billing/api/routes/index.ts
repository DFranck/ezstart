import express, { Router } from 'express';
import clientRoutes, { clientsRegistry } from './clients';
import companiesRoutes from './companies';
import invoiceRoutes, { invoiceRegistry } from './invoices';
import quoteRoutes, { quotesRegistry } from './quotes';
import receiptRoutes, { receiptRegistry } from './receipts';
import usersRoutes from './users';

const router: Router = express.Router();
export const globalRegistry = [
  clientsRegistry,
  invoiceRegistry,
  quotesRegistry,
  receiptRegistry,
];

router
  .use('/clients', clientRoutes)
  .use('/companies', companiesRoutes)
  .use('/invoices', invoiceRoutes)
  .use('/quotes', quoteRoutes)
  .use('/receipts', receiptRoutes)
  .use('/users', usersRoutes);

export default router;

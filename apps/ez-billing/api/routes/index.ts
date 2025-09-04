import express, { Router } from 'express';
import clientRoutes, { clientsRegistry } from './clients.js';
import companiesRoutes from './companies.js';
import invoiceRoutes, { invoiceRegistry } from './invoices.js';
import paymentMethodRoutes from './payment-methods.js';
import quoteRoutes, { quotesRegistry } from './quotes.js';
import receiptRoutes, { receiptRegistry } from './receipts.js';
import usersRoutes from './users.js';

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
  .use('/payment-methods', paymentMethodRoutes)
  .use('/quotes', quoteRoutes)
  .use('/receipts', receiptRoutes)
  .use('/users', usersRoutes);

export default router;

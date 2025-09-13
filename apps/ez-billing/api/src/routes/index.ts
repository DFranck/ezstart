import { Router } from '@ezstart/express-core';
import clientRoutes, { clientsRegistry } from './clients.js';
import companiesRoutes, { companiesRegistry } from './companies.js';
import invoiceRoutes, { invoiceRegistry } from './invoices.js';
import paymentMethodRoutes, { paymentMethodsRegistry } from './payment-methods.js';
import quoteRoutes, { quotesRegistry } from './quotes.js';
import receiptRoutes, { receiptRegistry } from './receipts.js';
import usersRoutes, { usersRegistry } from './users.js';

const router = Router();
export const globalRegistry = [
  clientsRegistry,
  companiesRegistry,
  invoiceRegistry,
  paymentMethodsRegistry,
  quotesRegistry,
  receiptRegistry,
  usersRegistry,
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

import { Router } from '@ezstart/express-core'
import aiRoutes from './ai/index.js'
import clientRoutes, { clientsRegistries } from './clients/index.js'
import companiesRoutes, { companiesRegistries } from './companies/index.js'
import invoiceRoutes, { invoicesRegistries } from './invoices/index.js'
import paymentMethodRoutes, { paymentMethodsRegistries } from './payment-methods/index.js'
import quoteRoutes, { quotesRegistries } from './quotes/index.js'
import receiptRoutes, { receiptsRegistries } from './receipts/index.js'
import usersRoutes, { usersRegistries } from './users/index.js'

const router: import('express').Router = Router()
export const globalRegistry = [
  ...clientsRegistries,
  ...companiesRegistries,
  ...invoicesRegistries,
  ...paymentMethodsRegistries,
  ...quotesRegistries,
  ...receiptsRegistries,
  ...usersRegistries,
]

router
  .use('/ai', aiRoutes)
  .use('/clients', clientRoutes)
  .use('/companies', companiesRoutes)
  .use('/invoices', invoiceRoutes)
  .use('/payment-methods', paymentMethodRoutes)
  .use('/quotes', quoteRoutes)
  .use('/receipts', receiptRoutes)
  .use('/users', usersRoutes)

export default router

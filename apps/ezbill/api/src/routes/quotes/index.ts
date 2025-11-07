/**
 * Quotes Feature Router
 *
 * Consolidates all quote-related actions into a single router.
 *
 * Routes:
 * - POST   /api/quotes                      -> createQuote
 * - GET    /api/quotes                      -> listQuotes
 * - GET    /api/quotes/:id                  -> getQuoteById
 * - PUT    /api/quotes/:id                  -> updateQuoteById
 * - DELETE /api/quotes/:id                  -> deleteQuoteById
 * - POST   /api/quotes/:id/restore          -> restoreQuoteById
 * - DELETE /api/quotes/:id/hard-delete      -> hardDeleteQuoteById
 * - POST   /api/quotes/:id/add-line-item    -> addLineItemToQuoteById
 * - POST   /api/quotes/:id/remove-line-item -> removeLineItemFromQuoteById
 * - POST   /api/quotes/:id/assign-client    -> assignClientToQuoteById
 * - POST   /api/quotes/:id/accept           -> acceptQuoteById
 * - POST   /api/quotes/:id/reject           -> rejectQuoteById
 * - POST   /api/quotes/:id/convert-to-invoice -> convertQuoteToInvoiceById
 */

import { Router } from '@ezstart/express-core';

// Import action routers
import createQuoteRouter, { createQuoteRegistry } from './createQuote.js';
import listQuotesRouter, { listQuotesRegistry } from './listQuotes.js';
import getQuoteByIdRouter, { getQuoteByIdRegistry } from './getQuoteById.js';
import updateQuoteByIdRouter, { updateQuoteByIdRegistry } from './updateQuoteById.js';
import deleteQuoteByIdRouter, { deleteQuoteByIdRegistry } from './deleteQuoteById.js';
import restoreQuoteByIdRouter, { restoreQuoteByIdRegistry } from './restoreQuoteById.js';
import hardDeleteQuoteByIdRouter, { hardDeleteQuoteByIdRegistry } from './hardDeleteQuoteById.js';
import addLineItemToQuoteByIdRouter, { addLineItemToQuoteByIdRegistry } from './addLineItemToQuoteById.js';
import removeLineItemFromQuoteByIdRouter, { removeLineItemFromQuoteByIdRegistry } from './removeLineItemFromQuoteById.js';
import assignClientToQuoteByIdRouter, { assignClientToQuoteByIdRegistry } from './assignClientToQuoteById.js';
import acceptQuoteByIdRouter, { acceptQuoteByIdRegistry } from './acceptQuoteById.js';
import rejectQuoteByIdRouter, { rejectQuoteByIdRegistry } from './rejectQuoteById.js';
import convertQuoteToInvoiceByIdRouter, { convertQuoteToInvoiceByIdRegistry } from './convertQuoteToInvoiceById.js';

// Export all registries as an array for OpenAPI documentation
export const quotesRegistries = [
  createQuoteRegistry,
  listQuotesRegistry,
  getQuoteByIdRegistry,
  updateQuoteByIdRegistry,
  deleteQuoteByIdRegistry,
  restoreQuoteByIdRegistry,
  hardDeleteQuoteByIdRegistry,
  addLineItemToQuoteByIdRegistry,
  removeLineItemFromQuoteByIdRegistry,
  assignClientToQuoteByIdRegistry,
  acceptQuoteByIdRegistry,
  rejectQuoteByIdRegistry,
  convertQuoteToInvoiceByIdRegistry,
];

// Consolidate all quote routers
const router: any = Router();

router
  .use('/', createQuoteRouter)
  .use('/', listQuotesRouter)
  .use('/', getQuoteByIdRouter)
  .use('/', updateQuoteByIdRouter)
  .use('/', deleteQuoteByIdRouter)
  .use('/', restoreQuoteByIdRouter)
  .use('/', hardDeleteQuoteByIdRouter)
  .use('/', addLineItemToQuoteByIdRouter)
  .use('/', removeLineItemFromQuoteByIdRouter)
  .use('/', assignClientToQuoteByIdRouter)
  .use('/', acceptQuoteByIdRouter)
  .use('/', rejectQuoteByIdRouter)
  .use('/', convertQuoteToInvoiceByIdRouter);

export default router;

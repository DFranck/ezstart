import {
  createQuoteSchema,
  GetQuotesQuery,
  Quote,
  updateQuoteSchema,
} from '@ezstart/types/schemas/billing/quote';
import {
  createQuoteService,
  getQuoteByIdService,
  getQuotesService,
  hardDeleteQuoteService,
  restoreQuoteService,
  softDeleteQuoteService,
  updateQuoteService,
} from '../../services/quote';
import { makeCreateController } from '../../utils/controller-factory/make-create-controller';
import { makeDeleteController } from '../../utils/controller-factory/make-delete-controller';
import { makeGetByIdController } from '../../utils/controller-factory/make-get-by-id-controller';
import { makeGetListController } from '../../utils/controller-factory/make-get-list-controller';
import { makeRestoreController } from '../../utils/controller-factory/make-restore-controller';
import { makeUpdateController } from '../../utils/controller-factory/make-update-controller';

export const createQuoteController = makeCreateController(
  createQuoteSchema,
  createQuoteService as (input: any) => Promise<Quote>,
  'Quote'
);

export const getQuotesController = makeGetListController<GetQuotesQuery, Quote>(
  getQuotesService,
  'Quote'
);

export const getQuoteByIdController = makeGetByIdController(
  getQuoteByIdService,
  'Quote'
);

export const hardDeleteQuoteController = makeDeleteController(
  hardDeleteQuoteService,
  'Quote',
  { statusCode: 200, sendBody: true }
);

export const softDeleteQuoteController = makeDeleteController(
  softDeleteQuoteService,
  'Quote'
);

export const restoreQuoteController = makeRestoreController(
  restoreQuoteService,
  'Quote'
);

export const updateQuoteController = makeUpdateController(
  updateQuoteSchema,
  updateQuoteService,
  'Quote'
);

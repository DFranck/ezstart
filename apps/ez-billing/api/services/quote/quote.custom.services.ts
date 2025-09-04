import { AddLineItem, Quote } from '@ez-billing/types';
import { QuoteModel } from '../../models/billing/quote.js';
import { toApiObject } from '../../utils/mongoose/to-api-object.js';

export async function assignClientToQuoteService(
  id: string,
  clientId: string
): Promise<Quote | null> {
  const doc = await QuoteModel.findByIdAndUpdate(
    id,
    { clientId },
    { new: true }
  );
  return doc ? toApiObject<Quote>(doc) : null;
}

export async function addLineItemToQuoteService(
  id: string,
  item: AddLineItem
): Promise<Quote | null> {
  const doc = await QuoteModel.findByIdAndUpdate(
    id,
    { $push: { items: item } },
    { new: true }
  );
  return doc ? toApiObject<Quote>(doc) : null;
}

export async function removeLineItemToQuoteService(
  id: string,
  itemId: string
): Promise<Quote | null> {
  const doc = await QuoteModel.findByIdAndUpdate(
    id,
    { $pull: { items: { _id: itemId } } },
    { new: true }
  );
  return doc ? toApiObject<Quote>(doc) : null;
}

export async function acceptQuoteService(id: string): Promise<Quote | null> {
  const doc = await QuoteModel.findByIdAndUpdate(
    id,
    { status: 'accepted' },
    { new: true }
  );
  return doc ? toApiObject<Quote>(doc) : null;
}

export async function rejectQuoteService(id: string): Promise<Quote | null> {
  const doc = await QuoteModel.findByIdAndUpdate(
    id,
    { status: 'rejected' },
    { new: true }
  );
  return doc ? toApiObject<Quote>(doc) : null;
}

import { AddLineItem, Quote } from '@ez-billing/types';
import { QuoteModel } from '../../models/billing/quote.js';
import { toApiObject } from '../../utils/mongoose/to-api-object.js';
import { calculateTotals } from '../../utils/calculate-totals.js';

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
  // First get the current quote to recalculate totals after adding item
  const existingDoc = await QuoteModel.findById(id);
  if (!existingDoc) return null;

  const newItems = [...existingDoc.items, item];
  const totals = calculateTotals(newItems, existingDoc.taxRate ?? 0);

  const doc = await QuoteModel.findByIdAndUpdate(
    id,
    { $push: { items: item }, ...totals },
    { new: true }
  );
  return doc ? toApiObject<Quote>(doc) : null;
}

export async function removeLineItemToQuoteService(
  id: string,
  itemId: string
): Promise<Quote | null> {
  // First get the current quote to recalculate totals after removing item
  const existingDoc = await QuoteModel.findById(id);
  if (!existingDoc) return null;

  const newItems = existingDoc.items.filter(item => item._id?.toString() !== itemId);
  const totals = calculateTotals(newItems, existingDoc.taxRate ?? 0);

  const doc = await QuoteModel.findByIdAndUpdate(
    id,
    { $pull: { items: { _id: itemId } }, ...totals },
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

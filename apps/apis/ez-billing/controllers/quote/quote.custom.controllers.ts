import {
  addLineItemSchema,
  assignClientSchema,
  mongoIdSchema,
  removeLineItemSchema,
} from '@ezstart/types';
import { Request, Response } from 'express';
import {
  acceptQuoteService,
  addLineItemToQuoteService,
  assignClientToQuoteService,
  rejectQuoteService,
  removeLineItemToQuoteService,
} from '../../services/quote';

export async function assignClientToQuoteController(
  req: Request,
  res: Response
) {
  const parseId = mongoIdSchema.safeParse(req.params.id);
  if (!parseId.success) {
    return res
      .status(400)
      .json({ error: 'Invalid quote ID', details: parseId.error.errors });
  }
  const parseClient = assignClientSchema.safeParse(req.body);
  if (!parseClient.success) {
    return res
      .status(400)
      .json({ error: 'Validation error', details: parseClient.error.errors });
  }
  const quote = await assignClientToQuoteService(
    parseId.data,
    parseClient.data.clientId
  );
  return res.status(200).json(quote);
}

export async function addLineItemToQuoteController(
  req: Request,
  res: Response
) {
  const parseId = mongoIdSchema.safeParse(req.params.id);
  if (!parseId.success) {
    return res
      .status(400)
      .json({ error: 'Invalid quote ID', details: parseId.error.errors });
  }
  const parseItem = addLineItemSchema.safeParse(req.body);
  if (!parseItem.success) {
    return res
      .status(400)
      .json({ error: 'Validation error', details: parseItem.error.errors });
  }
  const quote = await addLineItemToQuoteService(parseId.data, parseItem.data);
  return res.status(200).json(quote);
}

export async function removeLineItemFromQuoteController(
  req: Request,
  res: Response
) {
  const parseId = mongoIdSchema.safeParse(req.params.id);
  if (!parseId.success) {
    return res
      .status(400)
      .json({ error: 'Invalid quote ID', details: parseId.error.errors });
  }
  const parseItem = removeLineItemSchema.safeParse(req.body);
  if (!parseItem.success) {
    return res
      .status(400)
      .json({ error: 'Validation error', details: parseItem.error.errors });
  }
  const quote = await removeLineItemToQuoteService(
    parseId.data,
    parseItem.data.itemId
  );
  return res.status(200).json(quote);
}

// Special
export async function acceptQuoteController(req: Request, res: Response) {
  const parseId = mongoIdSchema.safeParse(req.params.id);
  if (!parseId.success) {
    return res
      .status(400)
      .json({ error: 'Invalid quote ID', details: parseId.error.errors });
  }
  const quote = await acceptQuoteService(parseId.data);
  return res.status(200).json(quote);
}

export async function rejectQuoteController(req: Request, res: Response) {
  const parseId = mongoIdSchema.safeParse(req.params.id);
  if (!parseId.success) {
    return res
      .status(400)
      .json({ error: 'Invalid quote ID', details: parseId.error.errors });
  }
  const quote = await rejectQuoteService(parseId.data);
  return res.status(200).json(quote);
}

import {
  addLineItemSchema,
  assignClientSchema,
  mongoIdSchema,
  removeLineItemSchema,
} from '@ezstart/types';
import { Request, Response } from 'express';
import {
  addLineItemToReceiptService,
  assignClientToReceiptService,
  markReceiptAsIssuedService,
  markReceiptAsRefundedService,
  removeLineItemToReceiptService,
} from '../../services/receipt';

export async function assignClientToReceiptController(
  req: Request,
  res: Response
) {
  const parseId = mongoIdSchema.safeParse(req.params.id);
  if (!parseId.success) {
    return res
      .status(400)
      .json({ error: 'Invalid receipt ID', details: parseId.error.errors });
  }
  const parseClient = assignClientSchema.safeParse(req.body);
  if (!parseClient.success) {
    return res
      .status(400)
      .json({ error: 'Validation error', details: parseClient.error.errors });
  }
  const receipt = await assignClientToReceiptService(
    parseId.data,
    parseClient.data.clientId
  );
  return res.status(200).json(receipt);
}

export async function addLineItemToReceiptController(
  req: Request,
  res: Response
) {
  const parseId = mongoIdSchema.safeParse(req.params.id);
  if (!parseId.success) {
    return res
      .status(400)
      .json({ error: 'Invalid receipt ID', details: parseId.error.errors });
  }
  const parseItem = addLineItemSchema.safeParse(req.body);
  if (!parseItem.success) {
    return res
      .status(400)
      .json({ error: 'Validation error', details: parseItem.error.errors });
  }
  const receipt = await addLineItemToReceiptService(
    parseId.data,
    parseItem.data
  );
  return res.status(200).json(receipt);
}

export async function removeLineItemFromReceiptController(
  req: Request,
  res: Response
) {
  const parseId = mongoIdSchema.safeParse(req.params.id);
  if (!parseId.success) {
    return res
      .status(400)
      .json({ error: 'Invalid receipt ID', details: parseId.error.errors });
  }
  const parseItem = removeLineItemSchema.safeParse(req.body);
  if (!parseItem.success) {
    return res
      .status(400)
      .json({ error: 'Validation error', details: parseItem.error.errors });
  }
  const receipt = await removeLineItemToReceiptService(
    parseId.data,
    parseItem.data.itemId
  );
  return res.status(200).json(receipt);
}

// Special
export async function markReceiptAsIssuedController(
  req: Request,
  res: Response
) {
  const parseId = mongoIdSchema.safeParse(req.params.id);
  if (!parseId.success) {
    return res
      .status(400)
      .json({ error: 'Invalid receipt ID', details: parseId.error.errors });
  }
  const receipt = await markReceiptAsIssuedService(parseId.data);
  return res.status(200).json(receipt);
}

export async function markReceiptAsRefundedController(
  req: Request,
  res: Response
) {
  const parseId = mongoIdSchema.safeParse(req.params.id);
  if (!parseId.success) {
    return res
      .status(400)
      .json({ error: 'Invalid receipt ID', details: parseId.error.errors });
  }
  const receipt = await markReceiptAsRefundedService(parseId.data);
  return res.status(200).json(receipt);
}

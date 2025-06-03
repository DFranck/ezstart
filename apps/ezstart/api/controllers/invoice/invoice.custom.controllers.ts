import {
  addLineItemSchema,
  assignClientSchema,
  removeLineItemSchema,
} from '@ezstart/types/schemas/billing/billing-actions';
import { mongoIdSchema } from '@ezstart/types/schemas/mongo-id';
import { Request, Response } from 'express';
import {
  addLineItemToInvoiceService,
  assignClientToInvoiceService,
  markInvoiceAsPaidService,
  removeLineItemToInvoiceService,
} from '../../services/invoice';

export async function addLineItemToInvoiceController(
  req: Request,
  res: Response
) {
  const parseId = mongoIdSchema.safeParse(req.params.id);
  if (!parseId.success) {
    return res
      .status(400)
      .json({ error: 'Invalid invoice ID', details: parseId.error.errors });
  }
  const parseItem = addLineItemSchema.safeParse(req.body);
  if (!parseItem.success) {
    return res
      .status(400)
      .json({ error: 'Validation error', details: parseItem.error.errors });
  }
  const invoice = await addLineItemToInvoiceService(
    parseId.data,
    parseItem.data
  );
  return res.status(200).json(invoice);
}
export async function assignClientToInvoiceController(
  req: Request,
  res: Response
) {
  const parseId = mongoIdSchema.safeParse(req.params.id);
  if (!parseId.success) {
    return res
      .status(400)
      .json({ error: 'Invalid invoice ID', details: parseId.error.errors });
  }
  const parseClient = assignClientSchema.safeParse(req.body);
  if (!parseClient.success) {
    return res
      .status(400)
      .json({ error: 'Validation error', details: parseClient.error.errors });
  }
  const invoice = await assignClientToInvoiceService(
    parseId.data,
    parseClient.data.clientId
  );
  return res.status(200).json(invoice);
}
export async function markInvoiceAsPaidController(req: Request, res: Response) {
  const parseId = mongoIdSchema.safeParse(req.params.id);
  if (!parseId.success) {
    return res
      .status(400)
      .json({ error: 'Invalid invoice ID', details: parseId.error.errors });
  }
  const invoice = await markInvoiceAsPaidService(parseId.data);
  return res.status(200).json(invoice);
}

export async function removeLineItemToInvoiceController(
  req: Request,
  res: Response
) {
  const parseId = mongoIdSchema.safeParse(req.params.id);
  if (!parseId.success) {
    return res
      .status(400)
      .json({ error: 'Invalid invoice ID', details: parseId.error.errors });
  }
  const parseItem = removeLineItemSchema.safeParse(req.body);
  if (!parseItem.success) {
    return res
      .status(400)
      .json({ error: 'Validation error', details: parseItem.error.errors });
  }
  const invoice = await removeLineItemToInvoiceService(
    parseId.data,
    parseItem.data.itemId
  );
  return res.status(200).json(invoice);
}

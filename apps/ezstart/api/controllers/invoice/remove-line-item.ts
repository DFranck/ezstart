import { removeLineItemSchema } from '@ezstart/types/schemas/billing/billing-actions';
import { invoiceIdSchema } from '@ezstart/types/schemas/billing/invoice';
import { Request, Response } from 'express';
import { removeLineItem } from '../../services';

export async function removeLineItemController(req: Request, res: Response) {
  const parseId = invoiceIdSchema.safeParse({ id: req.params.id });
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
  const invoice = await removeLineItem(parseId.data.id, parseItem.data.itemId);
  return res.status(200).json(invoice);
}

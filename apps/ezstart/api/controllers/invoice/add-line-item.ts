import { addLineItemSchema } from '@ezstart/types/schemas/billing/billing-actions';
import { invoiceIdSchema } from '@ezstart/types/schemas/billing/invoice';
import { Request, Response } from 'express';
import { addLineItem } from '../../services';

export async function addLineItemController(req: Request, res: Response) {
  const parseId = invoiceIdSchema.safeParse({ id: req.params.id });
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
  const invoice = await addLineItem(parseId.data.id, parseItem.data);
  return res.status(200).json(invoice);
}

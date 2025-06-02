import {
  invoiceIdSchema,
  updateInvoiceSchema,
} from '@ezstart/types/schemas/invoice';
import { Request, Response } from 'express';
import { updateInvoice } from '../../services';

export async function updateInvoiceController(req: Request, res: Response) {
  const parseId = invoiceIdSchema.safeParse({ id: req.params.id });
  if (!parseId.success) {
    return res
      .status(400)
      .json({ error: 'Invalid invoice ID', details: parseId.error.errors });
  }
  const parse = updateInvoiceSchema.safeParse(req.body);
  if (!parse.success) {
    return res
      .status(400)
      .json({ error: 'Validation error', details: parse.error.errors });
  }
  const invoice = await updateInvoice(parseId.data.id, parse.data);
  if (!invoice) {
    return res.status(404).json({ error: 'Invoice not found' });
  }
  return res.status(200).json(invoice);
}

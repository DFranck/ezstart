import { invoiceIdSchema } from '@ezstart/types/schemas/invoice';
import { Request, Response } from 'express';
import { restoreInvoice } from '../../services';

export async function restoreInvoiceController(req: Request, res: Response) {
  const parse = invoiceIdSchema.safeParse({ id: req.params.id });
  if (!parse.success) {
    return res
      .status(400)
      .json({ error: 'Invalid invoice ID', details: parse.error.errors });
  }
  const invoice = await restoreInvoice(parse.data.id);
  return res.status(200).json(invoice);
}

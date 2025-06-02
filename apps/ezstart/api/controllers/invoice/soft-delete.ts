import { invoiceIdSchema } from '@ezstart/types/schemas/invoice';
import { Request, Response } from 'express';
import { softDeleteInvoice } from '../../services';

export async function softDeleteInvoiceController(req: Request, res: Response) {
  const parse = invoiceIdSchema.safeParse({ id: req.params.id });
  if (!parse.success) {
    return res
      .status(400)
      .json({ error: 'Invalid ID', details: parse.error.errors });
  }
  const invoice = await softDeleteInvoice(parse.data.id);

  if (!invoice) {
    return res.status(404).json({ error: 'Invoice not found' });
  }

  return res.status(204).send();
}

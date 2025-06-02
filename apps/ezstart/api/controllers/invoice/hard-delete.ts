import { invoiceIdSchema } from '@ezstart/types/schemas/invoice';
import { Request, Response } from 'express';
import { hardDeleteInvoice } from '../../services';

export async function hardDeleteInvoiceController(req: Request, res: Response) {
  const parse = invoiceIdSchema.safeParse({ id: req.params.id });
  if (!parse.success) {
    return res
      .status(400)
      .json({ error: 'Invalid invoice ID', details: parse.error.errors });
  }
  const invoice = await hardDeleteInvoice(parse.data.id);
  if (!invoice) {
    return res.status(404).json({ error: 'Invoice not found' });
  } else {
    return res.status(200).json(invoice);
  }
}

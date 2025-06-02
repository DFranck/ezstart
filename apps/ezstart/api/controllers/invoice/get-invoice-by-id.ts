import { invoiceIdSchema } from '@ezstart/types/schemas/invoice';
import { Request, Response } from 'express';
import { getInvoiceById } from '../../services';

export async function getInvoiceByIdController(req: Request, res: Response) {
  const parse = invoiceIdSchema.safeParse({ id: req.params.id });
  if (!parse.success) {
    return res
      .status(400)
      .json({ error: 'Invalid invoice ID', details: parse.error.errors });
  }
  const invoice = await getInvoiceById(parse.data.id);
  if (!invoice) return res.status(404).json({ error: 'Invoice not found' });
  return res.status(200).json(invoice);
}

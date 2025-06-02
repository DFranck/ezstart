import { createInvoiceSchema } from '@ezstart/types/schemas/invoice';
import { Request, Response } from 'express';
import { createInvoice } from '../../services';

export async function createInvoiceController(req: Request, res: Response) {
  const parse = createInvoiceSchema.safeParse(req.body);
  if (!parse.success) {
    return res
      .status(400)
      .json({ error: 'Validation error', details: parse.error.errors });
  }
  try {
    const invoice = await createInvoice(parse.data);
    return res.status(201).json(invoice);
  } catch (err) {
    console.error('[createInvoiceController]', err);
    return res.status(201).json({ error: 'Failed to create invoice' });
  }
}

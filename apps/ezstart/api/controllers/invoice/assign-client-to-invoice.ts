import {
  assignClientSchema,
  invoiceIdSchema,
} from '@ezstart/types/schemas/invoice';
import { Request, Response } from 'express';
import { assignClientToInvoice } from '../../services';
export async function assignClientToInvoiceController(
  req: Request,
  res: Response
) {
  const parseId = invoiceIdSchema.safeParse({ id: req.params.id });
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
  const invoice = await assignClientToInvoice(
    parseId.data.id,
    parseClient.data.clientId
  );
  return res.status(200).json(invoice);
}

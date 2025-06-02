import { GetInvoicesQuery } from '@ezstart/types/schemas/billing/invoice';
import { Request, Response } from 'express';
import { getInvoices } from '../../services';

export async function getInvoicesController(req: Request, res: Response) {
  const query = req.validatedQuery as GetInvoicesQuery;
  try {
    const invoices = await getInvoices(query);
    res.json(invoices);
  } catch (err) {
    console.error('[getInvoicesController]', err);
    res.status(500).json({ error: 'Failed to get invoices' });
  }
}

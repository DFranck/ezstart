import { billingClientSchema } from '@ezstart/types';
import { Request, Response } from 'express';
import { createClient } from '../../services';

export async function createClientController(req: Request, res: Response) {
  const parsed = billingClientSchema.safeParse(req.body);
  if (!parsed.success) {
    return res
      .status(422)
      .json({ error: 'Invalid data', details: parsed.error.errors });
  }
  try {
    const client = await createClient(parsed.data);
    return res.status(201).json(client);
  } catch (err) {
    console.error('[createClientController]', err);
    return res.status(500).json({ error: 'Failed to create client' });
  }
}

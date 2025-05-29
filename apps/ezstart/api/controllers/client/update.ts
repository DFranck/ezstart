import { billingClientSchema } from '@ezstart/types/schemas/client';
import { Request, Response } from 'express';
import { updateClient } from '../../services';

export async function updateClientController(req: Request, res: Response) {
  const parsed = billingClientSchema.partial().safeParse(req.body);
  if (!parsed.success) {
    return res
      .status(422)
      .json({ error: 'Invalid data', details: parsed.error.errors });
  }
  try {
    const { id } = req.params;
    if (typeof id !== 'string' || !id.trim()) {
      return res.status(400).json({ error: 'Invalid request, id is required' });
    }

    const client = await updateClient(id, parsed.data);
    if (!client) {
      return res.status(404).json({ error: 'Client not found' });
    }
    return res.json(client);
  } catch (err) {
    return res.status(500).json({ error: 'Failed to update client' });
  }
}

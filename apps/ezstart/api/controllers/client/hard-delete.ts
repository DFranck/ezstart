import { clientIdSchema } from '@ezstart/types/schemas/client';
import { Request, Response } from 'express';
import { hardDeleteClient } from '../../services';

export async function hardDeleteClientController(req: Request, res: Response) {
  const parse = clientIdSchema.safeParse({ id: req.params.id });
  if (!parse.success) {
    return res
      .status(400)
      .json({ error: 'Invalid client ID', details: parse.error.errors });
  }
  const client = await hardDeleteClient(parse.data.id);
  if (!client) {
    return res.status(404).json({ error: 'Client not found' });
  } else {
    return res.status(200).json(client);
  }
}

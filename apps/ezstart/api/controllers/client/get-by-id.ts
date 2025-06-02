import { clientIdSchema } from '@ezstart/types/schemas/client';
import { Request, Response } from 'express';
import { getClientById } from '../../services';

export async function getClientByIdController(req: Request, res: Response) {
  const parse = clientIdSchema.safeParse({ id: req.params.id });
  if (!parse.success) {
    return res
      .status(400)
      .json({ error: 'Invalid client ID', details: parse.error.errors });
  }
  const client = await getClientById(parse.data.id);
  if (!client) return res.status(404).json({ error: 'Client not found' });
  return res.status(200).json(client);
}

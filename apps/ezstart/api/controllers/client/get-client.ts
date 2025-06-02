import { GetClientsQuery } from '@ezstart/types/dist/schemas/client';
import { Request, Response } from 'express';
import { getClients } from '../../services';

export async function getClientsController(req: Request, res: Response) {
  const query = req.validatedQuery as GetClientsQuery;
  try {
    const clients = await getClients(query);
    res.json(clients);
  } catch (err) {
    console.error('[getClientsController]', err);
    res.status(500).json({ error: 'Failed to fetch clients' });
  }
}

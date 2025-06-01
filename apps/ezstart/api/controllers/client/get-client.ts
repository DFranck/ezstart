import { Request, Response } from 'express';
import { getClients } from '../../services';
import { GetClientsQuery } from '../../validators/client/get-clients-query.schema';

export async function getClientsController(req: Request, res: Response) {
  const { includeDeleted, deletedOnly } = req.validatedQuery as GetClientsQuery;
  try {
    const clients = await getClients({ includeDeleted, deletedOnly });
    res.json(clients);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch clients' });
  }
}

import { Request, Response } from 'express';
import { getClients } from '../../services';

export async function getClientsController(req: Request, res: Response) {
  try {
    const clients = await getClients();
    return res.json(clients);
  } catch (err) {
    return res.status(500).json({ error: 'Failed to get clients' });
  }
}

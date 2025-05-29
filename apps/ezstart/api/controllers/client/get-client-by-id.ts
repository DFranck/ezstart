import { Request, Response } from 'express';
import { getClientById } from '../../services';

export async function getClientByIdController(req: Request, res: Response) {
  try {
    const { id } = req.params;
    if (typeof id !== 'string' || !id.trim()) {
      return res.status(400).json({ error: 'Invalid request, id is required' });
    }
    const client = await getClientById(id);
    if (!client) {
      return res.status(404).json({ error: 'Client not found' });
    }
    return res.json(client);
  } catch (err) {
    console.error('[getClientByIdController]', err);
    return res.status(500).json({ error: 'Failed to get client' });
  }
}

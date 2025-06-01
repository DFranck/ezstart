import { Request, Response } from 'express';
import { hardDeleteClient } from '../../services';

export async function hardDeleteClientController(req: Request, res: Response) {
  const { id } = req.params;
  try {
    if (typeof id !== 'string' || !id.trim()) {
      return res.status(400).json({ error: 'Invalid request, id is required' });
    }
    const client = await hardDeleteClient(id);
    if (!client) {
      return res.status(404).json({ error: 'Client not found' });
    }
    return res.status(200).json({ deleted: true, id });
  } catch (err) {
    console.error('[hardDeleteClientController]', err);
    return res.status(500).json({ error: 'Failed to hard delete client' });
  }
}

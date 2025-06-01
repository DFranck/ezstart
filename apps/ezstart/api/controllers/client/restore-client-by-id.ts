import { Request, Response } from 'express';
import { restoreClient } from '../../services';

export async function restoreClientController(req: Request, res: Response) {
  const { id } = req.params;
  try {
    if (typeof id !== 'string' || !id.trim()) {
      return res.status(400).json({ error: 'Invalid request, id is required' });
    }
    const client = await restoreClient(id);
    if (!client) {
      return res.status(404).json({ error: 'Client not found' });
    }
    return res.status(200).json(client);
  } catch (err) {
    console.error('[restoreClientController]', err);
    return res.status(500).json({ error: 'Failed to restore client' });
  }
}

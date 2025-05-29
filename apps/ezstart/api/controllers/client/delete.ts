import { Request, Response } from 'express';
import { deleteClient } from '../../services';

export async function deleteClientController(req: Request, res: Response) {
  try {
    const { id } = req.params;
    if (typeof id !== 'string' || !id.trim()) {
      return res.status(400).json({ error: 'Invalid request, id is required' });
    }

    const client = await deleteClient(id);
    if (!client) {
      return res.status(404).json({ error: 'Client not found' });
    }
    return res.status(204).send();
  } catch (err) {
    console.error('[deleteClientController]', err);
    return res.status(500).json({ error: 'Failed to delete client' });
  }
}

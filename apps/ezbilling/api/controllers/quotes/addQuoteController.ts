import type { Request, Response } from 'express';
import { addQuoteService } from '../../services/quotes';

export async function addQuoteController(req: Request, res: Response) {
  const quote = req.body;

  if (!quote.clientName || typeof quote.amount !== 'number') {
    return res.status(400).json({ error: 'Invalid quote data.' });
  }

  try {
    const result = await addQuoteService(req.body);
    res.status(201).json(result);
  } catch (err) {
    console.error('[addQuoteController] Error:', err);
    res.status(500).json({ error: 'Failed to add quote.' });
  }
}

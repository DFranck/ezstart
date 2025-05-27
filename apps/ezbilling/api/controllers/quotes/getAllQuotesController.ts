import type { Request, Response } from 'express';
import { getAllQuotesService } from '../../services/quotes';

export async function getAllQuotesController(_req: Request, res: Response) {
  try {
    const quotes = await getAllQuotesService();
    res.status(200).json(quotes);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch quotes.' });
  }
}

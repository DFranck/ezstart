import type { Request, Response } from 'express';
import {
  generateQuotePdfService,
  getAllQuotesService,
} from '../../services/quotes';

export async function generateQuotePdfController(req: Request, res: Response) {
  try {
    const quotes = await getAllQuotesService();
    const quote = quotes.find((q) => q.id === req.params.id);

    if (!quote) {
      return res.status(404).json({ error: 'Quote not found' });
    }

    const pdfBuffer = await generateQuotePdfService(quote);

    res.set({
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename=quote-${quote.id}.pdf`,
    });
    res.send(pdfBuffer);
  } catch (err) {
    console.error('[generateQuotePdfController]', err);
    res.status(500).json({ error: 'Failed to generate PDF' });
  }
}

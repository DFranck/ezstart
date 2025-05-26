import type { Quote } from '@ezstart/types';
import { randomUUID } from 'crypto';
import fs from 'fs/promises';
import path from 'path';
import { getAllQuotesService } from './getAllQuotesService';

const quotesFile = path.resolve(__dirname, '../../data/quotes.json');

export async function addQuoteService(
  quote: Omit<Quote, 'id'>
): Promise<Quote> {
  const quotes = await getAllQuotesService();
  const newQuote: Quote = {
    ...quote,
    id: randomUUID(),
  };
  quotes.unshift(newQuote);
  await fs.writeFile(quotesFile, JSON.stringify(quotes, null, 2));
  return newQuote;
}

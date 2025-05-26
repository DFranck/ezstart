import { randomUUID } from 'crypto';
import fs from 'fs/promises';
import path from 'path';
import { getAllQuotesService } from './getAllQuotesService';

const quotesFile = path.resolve(__dirname, '../../data/quotes.json');

export async function addQuoteService(quote: Omit<any, 'id'>): Promise<any> {
  const quotes = await getAllQuotesService();
  const newQuote: any = {
    ...quote,
    id: randomUUID(),
  };
  quotes.unshift(newQuote);
  await fs.writeFile(quotesFile, JSON.stringify(quotes, null, 2));
  return newQuote;
}

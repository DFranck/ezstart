import fs from 'fs/promises';
import path from 'path';

const quotesFile = path.resolve(__dirname, '../../data/quotes.json');

export async function getAllQuotesService(): Promise<any[]> {
  const data = await fs.readFile(quotesFile, 'utf-8');
  return JSON.parse(data);
}

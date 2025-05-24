import type { Quote, QuoteCreateInput } from '../types';
import { fetchWrapper } from '../utils/fetchWrapper';
import { getApiUrl } from '../utils/getApiUrl';

const apiBase = getApiUrl();

export async function getQuotes(): Promise<Quote[]> {
  return fetchWrapper<Quote[]>(`${apiBase}/api/quotes`);
}

export async function addQuote(quote: QuoteCreateInput): Promise<Quote> {
  return fetchWrapper<Quote>(`${apiBase}/api/quotes`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(quote),
  });
}

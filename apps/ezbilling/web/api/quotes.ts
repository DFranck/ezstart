import { fetchWrapper } from '@/utils/fetchWrapper';
import { getApiUrl } from '@/utils/getApiUrl';

const apiBase = getApiUrl();

export async function getQuotes(): Promise<any[]> {
  return fetchWrapper<any[]>(`${apiBase}/api/quotes`);
}

export async function addQuote(quote: any): Promise<any> {
  return fetchWrapper<any>(`${apiBase}/api/quotes`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(quote),
  });
}

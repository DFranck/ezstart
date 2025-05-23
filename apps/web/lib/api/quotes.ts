import type { Quote } from '@ezstart/types';

export async function getQuotes(): Promise<Quote[]> {
  const res = await fetch('http://localhost:5000/api/quotes');
  return res.json();
}

export async function addQuote(quote: Omit<Quote, 'id'>): Promise<Quote> {
  const res = await fetch('http://localhost:5000/api/quotes', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(quote),
  });
  return res.json();
}

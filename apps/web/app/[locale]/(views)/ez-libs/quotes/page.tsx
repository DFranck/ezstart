'use client';
import { getQuotes } from '@/lib/api/quotes';
import { Quote } from '@ezstart/types';
import { useEffect, useState } from 'react';
import { QuotesForm } from './components/QuotesForm';
import { QuotesList } from './components/QuotesList';

export default function QuotesPage() {
  const [quotes, setQuotes] = useState<Quote[]>([]);

  useEffect(() => {
    getQuotes().then(setQuotes);
  }, []);

  return (
    <main className='p-8 max-w-lg mx-auto'>
      <h1 className='text-2xl font-bold mb-4'>Quotes</h1>
      <QuotesForm onAdded={(q) => setQuotes((prev) => [q, ...prev])} />
      <QuotesList quotes={quotes} />
    </main>
  );
}

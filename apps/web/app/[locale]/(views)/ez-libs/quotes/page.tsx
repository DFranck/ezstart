'use client';

import { getQuotes, QuotesForm, QuotesList } from '@ezstart/ez-billing';
import { H1, Main } from '@ezstart/ez-tag';
import { Quote } from '@ezstart/types';
import { useEffect, useState } from 'react';
import { toast } from 'sonner';

export default function QuotesPage() {
  const [quotes, setQuotes] = useState<Quote[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    getQuotes().then((res) => {
      if (Array.isArray(res)) setQuotes(res);
      else {
        setQuotes([]);
        setError('Failed to load quotes.');
        toast.error('Failed to load quotes.');
      }
    });
  }, []);

  return (
    <Main>
      <H1>Quotes</H1>
      {error && <p className='text-red-500'>{error}</p>}

      <QuotesForm onAdded={(q) => setQuotes((prev) => [q, ...prev])} />
      <QuotesList quotes={quotes} />
    </Main>
  );
}

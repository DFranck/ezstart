'use client';
import type { Quote } from '@ezstart/types';

type Props = {
  quotes: Quote[];
};

export function QuotesList({ quotes }: Props) {
  if (!quotes.length) return <p className='text-gray-500'>No quotes yet.</p>;
  return (
    <ul className='space-y-2'>
      {quotes.map((q) => (
        <li key={q.id} className='border rounded p-2'>
          <span className='font-bold'>{q.clientName}</span> —{' '}
          <span>{q.amount} €</span>
        </li>
      ))}
    </ul>
  );
}

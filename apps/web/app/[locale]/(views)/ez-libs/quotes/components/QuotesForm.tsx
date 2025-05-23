'use client';
import type { Quote } from '@ezstart/types';
import { useState } from 'react';

type Props = {
  onAdded: (q: Quote) => void;
};

export function QuotesForm({ onAdded }: Props) {
  const [clientName, setClientName] = useState('');
  const [amount, setAmount] = useState('');

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const newQuote = { clientName, amount: Number(amount) };
    const res = await fetch('http://localhost:5000/api/quotes', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(newQuote),
    });
    const data: Quote = await res.json();
    onAdded(data);
    setClientName('');
    setAmount('');
  }

  return (
    <form onSubmit={handleSubmit} className='flex gap-2 mb-4'>
      <input
        type='text'
        required
        placeholder='Client Name'
        value={clientName}
        onChange={(e) => setClientName(e.target.value)}
        className='border rounded p-1'
      />
      <input
        type='number'
        required
        placeholder='Amount'
        value={amount}
        onChange={(e) => setAmount(e.target.value)}
        className='border rounded p-1 w-24'
      />
      <button
        type='submit'
        className='bg-blue-600 text-white px-3 py-1 rounded'
      >
        Add Quote
      </button>
    </form>
  );
}

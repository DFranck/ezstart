'use client';

import { Modal } from '@ezstart/ui/components';
import { useState } from 'react';

type Props = {
  quotes: any[];
};

export function QuotesList({ quotes }: Props) {
  const [selected, setSelected] = useState<any | null>(null);

  if (!quotes.length) return <p className='text-gray-500'>No quotes yet.</p>;

  return (
    <>
      <ul className='space-y-2'>
        {quotes.map((q) => (
          <li
            key={q.id}
            className='border rounded p-2 cursor-pointer hover:bg-muted transition'
            onClick={() => setSelected(q)}
          >
            <span className='font-bold'>{q.clientName}</span> —{' '}
            <span>{q.amount} €</span>
          </li>
        ))}
      </ul>
      <Modal open={!!selected} onClose={() => setSelected(null)}>
        {selected && (
          <div>
            {/* <QuotePdfTemplate quote={selected} /> */}
            test
            {/* Ici tu peux mettre un bouton "Télécharger PDF" plus tard */}
          </div>
        )}
      </Modal>
    </>
  );
}

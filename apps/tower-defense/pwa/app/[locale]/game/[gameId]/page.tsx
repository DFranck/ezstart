// app/[locale]/lobby/[gameId]/page.tsx
import { callApi } from '@ezstart/ui/utils';
import { notFound } from 'next/navigation';

export default async function GamePage({
  params,
}: {
  params: Promise<{ gameId: string }>;
}) {
  const { gameId } = await params;

  const res = await callApi(`/api/games/${gameId}`);
  if (!res.ok) return notFound();

  return (
    <div className='p-4'>
      <h1 className='text-2xl font-bold'>Game: {gameId}</h1>
    </div>
  );
}

// app/[locale]/lobby/components/StartGameButton.tsx
'use client';

import { useRouter } from 'next/navigation';

export function StartGameButton({ gameId }: { gameId: string }) {
  const router = useRouter();

  const start = async () => {
    await fetch(`${process.env.NEXT_PUBLIC_API_URL}/games/${gameId}/start`, {
      method: 'POST',
    });
    router.push(`/en/game/${gameId}`);
  };

  return (
    <button
      onClick={start}
      className='mt-4 px-4 py-2 bg-green-600 text-white rounded'
    >
      Start Game
    </button>
  );
}

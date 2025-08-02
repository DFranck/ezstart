'use client';

import { Button } from '@ezstart/ui/components';
import { callApi } from '@ezstart/ui/utils';
import { useRouter } from 'next/navigation';
import { useState } from 'react';

export function JoinGameButton({
  gameId,
  playerName,
}: {
  gameId: string;
  playerName: string;
}) {
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const joinGame = async () => {
    setLoading(true);
    try {
      const response = await callApi(`/api/games/${gameId}/join`, {
        method: 'POST',
        body: { playerName },
      });

      if (!response.ok) throw new Error('Failed to join game');

      router.push(`/lobby/${gameId}`);
    } catch (err) {
      console.error('[games:join]', err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Button onClick={joinGame} disabled={loading}>
      {loading ? 'Joining...' : 'Join Game'}
    </Button>
  );
}

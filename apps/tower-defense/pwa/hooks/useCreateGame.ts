// hooks/useCreateGame.ts
'use client';

import { CreateGamePayload, CreateGameResponse } from '@ezstart/types';
import { callApi } from '@ezstart/ui/utils';
import { useRouter } from 'next/navigation';
import { useState } from 'react';

export function useCreateGame() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  const createGame = async (playerName: CreateGamePayload) => {
    setLoading(true);
    try {
      const res = await callApi<CreateGameResponse>('/api/games', {
        method: 'POST',
        body: playerName,
      });

      if (!res.ok) throw new Error('Failed to create game');
      router.push(`/en/lobby/${res.data?.gameId}`);
    } finally {
      setLoading(false);
    }
  };

  return { createGame, loading };
}

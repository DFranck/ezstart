'use client';

import {
  Button,
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@ezstart/ui/components';
import { callApi } from '@ezstart/ui/utils';
import { useRouter } from 'next/navigation';
import { useState } from 'react';

type Props = {
  gameId: string;
  playerName: string;
};

export function JoinGameButton({ gameId, playerName }: Props) {
  const [loading, setLoading] = useState(false);
  const isDisabled = !playerName;
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

  if (isDisabled) {
    // Rendu spécial quand désactivé (Tooltip fonctionnel, pas de <button> dans <button>)
    return (
      <Tooltip>
        <TooltipTrigger asChild>
          {/* Le wrapper ne doit PAS être un bouton */}
          <span className='w-full block'>
            <Button disabled className='w-full'>
              Join the Game
            </Button>
          </span>
        </TooltipTrigger>
        <TooltipContent>Please enter a player name</TooltipContent>
      </Tooltip>
    );
  }

  // Rendu normal sans Tooltip si actif
  return (
    <Button onClick={joinGame} disabled={loading} className='w-full'>
      {loading ? 'Joining...' : 'Join the Game'}
    </Button>
  );
}

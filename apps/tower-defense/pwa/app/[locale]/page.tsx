'use client';

import { useCreateGame } from '@/hooks/useCreateGame';
import { mockPlayer, type Game } from '@ezstart/types';
import { Button, Main } from '@ezstart/ui/components';
import { callApi } from '@ezstart/ui/utils';
import { useEffect, useState } from 'react';
import { JoinGameButton } from './lobby/components/JoinGameButton';

export default function Page() {
  const { createGame } = useCreateGame();
  const player = mockPlayer();
  const [games, setGames] = useState<Game[]>([]);

  useEffect(() => {
    const fetchGames = async () => {
      const res = await callApi('/api/games');
      if (res.ok) {
        const waitingGames = (res.data as Game[]).filter(
          (game) => game.phase === 'waiting'
        );
        setGames(waitingGames);
      }
    };

    fetchGames();
  }, []);

  return (
    <Main className='text-center'>
      <h1 className='text-2xl font-bold mb-4'>Tower Defense</h1>

      <Button
        className='mb-8'
        onClick={() => createGame({ playerName: player.name })}
      >
        Create New Game
      </Button>

      {games.length === 0 ? (
        <p className='text-muted-foreground'>No open games. Create one!</p>
      ) : (
        <ul className='space-y-4'>
          {games.map((game) => (
            <li key={game._id} className='flex items-center justify-between'>
              <span className='font-mono text-sm'>Game ID: {game._id}</span>
              <JoinGameButton gameId={game._id} playerId={player._id} />
            </li>
          ))}
        </ul>
      )}
    </Main>
  );
}

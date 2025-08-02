'use client';

import CreateGameButton from '@/components/CreateGameButton';
import { Main, Section } from '@ezstart/ui/components';
import { isDebug } from '@ezstart/ui/lib';
import { callApi } from '@ezstart/ui/utils';
import { mockGames, type Game } from '@tower-defense/types';
import { useEffect, useState } from 'react';
import { JoinGameButton } from './lobby/components/JoinGameButton';

export default function Page() {
  const [playerName, setPlayerName] = useState('');
  const [games, setGames] = useState<Game[]>([]);

  useEffect(() => {
    const fetchGames = async () => {
      if (isDebug() === true) {
        setGames(mockGames);
      } else {
        const res = await callApi('/api/games');
        if (res.ok) {
          const waitingGames = (res.data as Game[]).filter(
            (game) => game.phase === 'waiting'
          );

          setGames(waitingGames);
        }
      }
    };

    fetchGames();
  }, []);

  return (
    <Main className='text-center'>
      <h1 className='text-2xl font-bold mb-4'>Tower Defense</h1>
      <Section size={'xs'}>
        <CreateGameButton
          playerName={playerName}
          setPlayerName={setPlayerName}
        />
      </Section>
      <Section size={'xs'}>
        {games.length === 0 ? (
          <p className='text-muted-foreground'>No open games. Create one!</p>
        ) : (
          <ul className='space-y-4'>
            {games.map((game) => (
              <li key={game._id} className='flex items-center justify-between'>
                <span className='font-mono text-sm'>Game ID: {game._id}</span>
                <JoinGameButton gameId={game._id} playerName={playerName} />
              </li>
            ))}
          </ul>
        )}
      </Section>
    </Main>
  );
}

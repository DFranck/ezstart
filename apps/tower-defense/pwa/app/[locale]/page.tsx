'use client';

import {
  H1,
  Icon,
  Input,
  LI,
  Main,
  P,
  Section,
  Span,
  Tooltip,
  TooltipContent,
  TooltipTrigger,
  UL,
} from '@ezstart/ui/components';
import { isDebug, logger } from '@ezstart/ui/lib';
import { callApi } from '@ezstart/ui/utils';
import { mockGames, type Game } from '@tower-defense/types';
import { useEffect, useState } from 'react';
import { JoinGameButton } from './lobby/components/JoinGameButton';

export default function Page() {
  const [playerName, setPlayerName] = useState('');
  const [games, setGames] = useState<Game[]>([]);
  const [isloading, setIsLoading] = useState(true);
  useEffect(() => {
    const fetchGames = async () => {
      setIsLoading(true);
      if (isDebug() === true) {
        setGames(mockGames);
      } else {
        const res = await callApi('/api/games');
        if (res.ok) {
          const waitingGames = (res.data as Game[]).filter(
            (game) => game.phase === 'waiting'
          );
          logger.debug('waitingGames', waitingGames);
          setGames(waitingGames);
        }
      }
      setIsLoading(false);
    };

    fetchGames();
  }, []);

  return (
    <Main>
      <Section size={'xl'}>
        <H1 className='md:text-center'>Tower Defense</H1>
        <Input
          className='w-fit'
          placeholder='Player name'
          value={playerName}
          onChange={(e) => setPlayerName(e.target.value)}
        />
      </Section>
      {isloading ? (
        <Icon name={'fa:FaSpinner'} spin />
      ) : (
        <Section size={'xs'}>
          {/* <CreateGameButton playerName={playerName} /> */}
          {!isloading && games.length === 0 ? (
            <P variant={'description'}>No open games. Create one!</P>
          ) : (
            <UL>
              {games.map((game) => (
                <LI key={game._id} size={'xs'}>
                  <Tooltip>
                    <TooltipTrigger>
                      <Span>{game.players.length}/8 players </Span>
                      <JoinGameButton
                        gameId={game._id}
                        playerName={playerName}
                      />
                    </TooltipTrigger>
                    <TooltipContent>
                      <UL>
                        {game.players.map((player) => (
                          <LI key={player._id} marker={'dash'}>
                            {player.name}
                          </LI>
                        ))}
                      </UL>
                    </TooltipContent>
                  </Tooltip>
                </LI>
              ))}
            </UL>
          )}
        </Section>
      )}
    </Main>
  );
}

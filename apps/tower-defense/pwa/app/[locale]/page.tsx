'use client';

import { useCreateGame } from '@/hooks/useCreateGame';
import { Button, Main } from '@ezstart/ui/components';
import { logger } from '@ezstart/ui/lib';

export default function Page() {
  const { createGame } = useCreateGame();

  return (
    <Main className='text-center overflow-hidden'>
      <Button
        onClick={() => {
          createGame({ playerName: 'Player 1' });
          logger.debug('Create game');
        }}
      >
        Play
      </Button>
    </Main>
  );
}

'use client';

import { useCreateGame } from '@/hooks/useCreateGame';
import { mockPlayer } from '@ezstart/types';
import { Button, Main } from '@ezstart/ui/components';

export default function Page() {
  const { createGame } = useCreateGame();
  const player = mockPlayer();
  return (
    <Main className='text-center overflow-hidden'>
      <Button onClick={() => createGame({ playerName: player.name })}>
        Play
      </Button>
    </Main>
  );
}

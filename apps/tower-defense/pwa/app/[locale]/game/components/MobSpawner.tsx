// game/components/MobSpawner.tsx

import { Game } from '@ezstart/types';

type MobSpawnerProps = {
  game: Game;
};

export function MobSpawner({ game }: MobSpawnerProps) {
  return (
    <div className='border p-4 rounded bg-muted'>
      <h2 className='text-lg font-bold mb-2'>Send Mobs</h2>
      <p className='text-sm text-muted-foreground'>
        Mob spawner UI coming soon...
      </p>
    </div>
  );
}

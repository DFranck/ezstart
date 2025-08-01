// game/components/TowerPlacer.tsx

import { Game } from '@ezstart/types';

type TowerPlacerProps = {
  game: Game;
};

export function TowerPlacer({ game }: TowerPlacerProps) {
  return (
    <div className='border p-4 rounded bg-muted'>
      <h2 className='text-lg font-bold mb-2'>Place Your Towers</h2>
      <p className='text-sm text-muted-foreground'>
        Tower placement UI coming soon...
      </p>
    </div>
  );
}

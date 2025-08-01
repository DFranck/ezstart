// game/components/PlayerStatsPanel.tsx

import { Game } from '@ezstart/types';

type PlayerStatsPanelProps = {
  game: Game;
};

export function PlayerStatsPanel({ game }: PlayerStatsPanelProps) {
  return (
    <div className='border p-4 rounded bg-muted'>
      <h2 className='text-lg font-bold mb-2'>Your Stats</h2>
      <ul className='text-sm text-muted-foreground'>
        <li>HP: {game.players[0]?.hp}</li>
        <li>Gold: {game.players[0]?.gold}</li>
        <li>Income: {game.players[0]?.income}</li>
      </ul>
    </div>
  );
}

'use client';
import { Game } from '@ezstart/types';

export function Hud({ game }: { game: Game }) {
  return (
    <div className='absolute top-0 right-0 p-4 bg-black bg-opacity-50'>
      <p>Phase: {game.phase}</p>
      <p>Gold: {game.players[0].gold}</p>
    </div>
  );
}

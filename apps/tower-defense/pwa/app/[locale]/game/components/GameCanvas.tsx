'use client';
import { Game } from '@ezstart/types';

export function GameCanvas({ game }: { game: Game }) {
  return (
    <div className='absolute top-0 left-0 w-full h-full bg-green-900'>
      <p className='absolute top-4 left-4 text-sm'>Tick: {game.tick}</p>
      {game.map.map((row, y) => (
        <div key={y} className='flex'>
          {row.map((cell, x) => (
            <div
              key={x}
              className={`w-8 h-8 border ${cell === 'grass' ? 'bg-green-500' : 'bg-gray-800'}`}
            />
          ))}
        </div>
      ))}
    </div>
  );
}

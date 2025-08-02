'use client';

import { Game } from '@ezstart/types';

export function Hud({ game }: { game: Game }) {
  const tick = game.tick;
  const phase = game.phase;
  const player = game.players[0]; // à remplacer par le joueur courant plus tard

  return (
    <div className='w-full z-50 text-sm md:text-base px-4 py-2 flex flex-wrap justify-between items-center gap-2'>
      <div className='font-bold'>Phase: {phase}</div>
      <div>Tick: {tick}</div>
      <div>Gold: {player.gold}</div>
      <div>HP: {player.hp}</div>
      {/* <div>Income: {player.income}</div>
      <div>Hand: {player.hand.length || 'empty'}</div>
      <div>Placed: {player.placedTowers.length || 'none'}</div>
      <div>Incoming: {player.incomingUnits.length || 'none'}</div> */}
    </div>
  );
}

'use client'

import { Game } from '@tower-defense/types'
import { GameMenu } from './GameMenu'
import { GameTimer } from './GameTimer'

export function Hud({ game }: { game: Game }) {
  const tick = game.tick
  const phase = game.phase
  const player = game.players[0] // à remplacer par le joueur courant plus tard

  return (
    <div className="w-full z-50 text-sm md:text-base px-4 py-2 flex flex-wrap justify-between items-center gap-2 relative">
      {/* Menu en première position sur mobile */}
      <div className="order-1 md:order-last">
        <GameMenu gameId={game._id} />
      </div>
      
      {/* Stats du jeu */}
      <div className="order-2 md:order-1 flex flex-wrap items-center gap-4">
        <div className="font-bold">Phase: {phase}</div>
        <GameTimer game={game} />
        <div>Gold: {player?.gold || 0}</div>
        <div>HP: {player?.hp || 0}</div>
        {/* <div>Income: {player.income}</div>
        <div>Hand: {player.hand.length || 'empty'}</div>
        <div>Placed: {player.placedTowers.length || 'none'}</div>
        <div>Incoming: {player.incomingUnits.length || 'none'}</div> */}
      </div>
    </div>
  )
}

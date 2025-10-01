'use client'

import { Div, Section } from '@ezstart/ui/components'
import { Game } from '@tower-defense/types'
import { GameMenu } from './GameMenu'
import { GameTimer } from './GameTimer'

export function Hud({ game }: { game: Game }) {
  const tick = game.tick
  const phase = game.phase
  const player = game.players[0] // à remplacer par le joueur courant plus tard

  return (
    <Section
      id="hud"
      size={'xs'}
      className="h-full block max-h-screen max-w-screen bg-red-500/50 absolute "
    >
      <Div layout={'row'} className="w-fit">
        <GameMenu gameId={game._id} />
        <GameTimer game={game} />
      </Div>
      {/* Stats du jeu */}
      <div className="order-2 md:order-1 flex flex-wrap items-center gap-4">
        {/* <div className="font-bold">Phase: {phase}</div> */}

        {/* <div>Gold: {player?.gold || 0}</div>
        <div>HP: {player?.hp || 0}</div> */}
        {/* <div>Income: {player.income}</div>
        <div>Hand: {player.hand.length || 'empty'}</div>
        <div>Placed: {player.placedTowers.length || 'none'}</div>
        <div>Incoming: {player.incomingUnits.length || 'none'}</div> */}
      </div>
    </Section>
  )
}

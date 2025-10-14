'use client'

import { useGame } from '@/contexts/GameContext'
import { useGameState } from '@/stores/useGameState'
import { usePlayerStore } from '@/stores/usePlayerStore'
import { Div, Icon, LI, Section, UL } from '@ezstart/ui/components'
import { GameMenu } from './GameMenu'
import { GameTimer } from './GameTimer'

export function Hud() {
  const { game } = useGame()
  const currentPlayer = usePlayerStore(s => s.player)
  const gold = useGameState(s => s.gold)

  // FIXME: Temporary fix to show HUD even without currentPlayer (allow emergency exit)
  if (!game) return null

  // Trouver les stats du joueur actuel dans le jeu
  const playerInGame = currentPlayer ? game.players.find(p => p.player?._id === currentPlayer._id) : null
  return (
    <Section
      id="hud"
      size={'xs'}
      className="h-full justify-between items-start max-h-screen max-w-screen absolute"
    >
      <Div layout={'row'} className="w-fit">
        <GameMenu gameId={game._id} />
        <GameTimer game={game} />
        <UL size={'xs'} layout="row" className="z-50">
          <LI>
            <Icon name="lucide:Heart" /> {playerInGame?.hp ?? 0}
          </LI>
          <LI className="font-bold text-yellow-600">
            <Icon name="lucide:Coins" className="text-yellow-500" /> {gold}
          </LI>
          <LI>
            <Icon name="lucide:TrendingUp" /> {playerInGame?.income ?? 0}/s
          </LI>
        </UL>
      </Div>
    </Section>
  )
}

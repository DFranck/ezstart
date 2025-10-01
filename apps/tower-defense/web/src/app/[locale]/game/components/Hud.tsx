'use client'

import { useGame } from '@/contexts/GameContext'
import { usePlayerStore } from '@/stores/usePlayerStore'
import { Div, Icon, LI, Section, UL } from '@ezstart/ui/components'
import { GameMenu } from './GameMenu'
import { GameTimer } from './GameTimer'
import { MobShop } from './MobShop'
import { TowerShop } from './TowerShop'

export function Hud() {
  const { game } = useGame()
  const currentPlayer = usePlayerStore(s => s.player)

  if (!game || !currentPlayer) return null

  // Trouver les stats du joueur actuel dans le jeu
  const playerInGame = game.players.find(p => p.player?._id === currentPlayer._id)
  return (
    <Section
      id="hud"
      size={'xs'}
      className="h-full justify-between items-start max-h-screen max-w-screen bg-red-500/50 absolute"
    >
      <Div layout={'row'} className="w-fit">
        <GameMenu gameId={game._id} />
        <GameTimer game={game} />
        <UL size={'xs'} layout="row" className="z-50">
          <LI>
            <Icon name="lucide:Heart" /> {playerInGame?.hp ?? 0}
          </LI>
          <LI>
            <Icon name="lucide:Coins" /> {playerInGame?.gold ?? 0}
          </LI>
          <LI>
            <Icon name="lucide:Coins" /> {playerInGame?.income ?? 0}
          </LI>
        </UL>
      </Div>
      <Div layout="col" className="bg-blue-500/50 z-50 w-full">
        <MobShop game={game} />
        <TowerShop game={game} />
      </Div>
    </Section>
  )
}

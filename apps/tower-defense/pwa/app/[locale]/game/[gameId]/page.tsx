import { callApi } from '@ezstart/ui/utils'
import { notFound } from 'next/navigation'

import { logger } from '@ezstart/ui/lib'
import { Game } from '@tower-defense/types'
import { GameCanvas } from '../components/GameCanvas'
import { Hud } from '../components/Hud'
import { MobSpawner } from '../components/MobSpawner'
import { PlayerStatsPanel } from '../components/PlayerStatsPanel'
import { TowerShop } from '../components/TowerShop'

export default async function GamePage(props: { params: { gameId: string } }) {
  const { params } = props
  const { gameId } = await Promise.resolve(params)

  // Fetch game data from API
  const res = await callApi(`/api/games/${gameId}`)
  if (!res.ok) return notFound()

  const game: Game = res.data
  logger.debug('game', game)
  return (
    // Fullscreen layout — vertical on mobile, horizontal on desktop
    <div className="flex flex-col h-screen w-full bg-green-500/50">
      {/* Full-width top HUD bar (fixed/relative) */}
      <Hud game={game} />

      {/* Game zone (canvas + interaction sidebar) — responsive layout */}
      <div className="flex flex-1 flex-col-reverse md:flex-row justify-center bg-red-500/50">
        {/* GameCanvas takes full height and expands */}
        <GameCanvas />
        {/* Interaction sidebar — below on mobile, right on desktop */}
        <div className="w-full md:w-[300px] flex flex-col gap-4 p-4 bg-yellow-500/50">
          <TowerShop game={game} />
          {/* <TowerPlacer game={game} /> */}
          <MobSpawner game={game} />
          <PlayerStatsPanel game={game} />
        </div>
      </div>
    </div>
  )
}

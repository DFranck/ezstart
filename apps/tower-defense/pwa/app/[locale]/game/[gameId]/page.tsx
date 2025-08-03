import { callApi } from '@ezstart/ui/utils'
import { notFound } from 'next/navigation'

import { logger } from '@ezstart/ui/lib'
import { Game } from '@tower-defense/types'
import { GameCanvasCanvas } from '../components/GameCanvasCanvas'
import { GameInitializer } from '../components/GameInitializer'
import { Hud } from '../components/Hud'
import { MobShop } from '../components/MobShop'
import { PlayerStatsPanel } from '../components/PlayerStatsPanel'
import { TowerShop } from '../components/TowerShop'

export default async function GamePage(props: { params: { gameId: string } }) {
  const { params } = props
  const { gameId } = await Promise.resolve(params)

  const res = await callApi(`/api/games/${gameId}`)
  if (!res.ok) return notFound()

  const game: Game = res.data
  logger.debug('game', game)
  return (
    <>
      <GameInitializer />
      <div className="flex flex-col h-screen w-full ">
        <Hud game={game} />

        <div className="flex flex-1 flex-col-reverse md:flex-row justify-center ">
          {/* <GameCanvas /> */}
          <GameCanvasCanvas />

          <div className="w-full md:w-[300px] flex flex-col gap-4 p-4 ">
            <TowerShop game={game} />
            <MobShop game={game} />
            <PlayerStatsPanel game={game} />
          </div>
        </div>
      </div>
    </>
  )
}

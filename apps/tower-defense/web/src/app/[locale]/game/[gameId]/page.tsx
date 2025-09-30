'use client'

import { callApi } from '@ezstart/ui/utils'
import { notFound, useParams } from 'next/navigation'

import { Game } from '@tower-defense/types'
import { useEffect, useState } from 'react'
import { GameCanvasCanvas } from '../components/GameCanvasCanvas'
import { GameInitializer } from '../components/GameInitializer'
import { Hud } from '../components/Hud'
import { MobShop } from '../components/MobShop'
import { PlayerStatsPanel } from '../components/PlayerStatsPanel'
import { TowerShop } from '../components/TowerShop'

export default function GamePage() {
  const params = useParams<{ gameId: string }>()
  const gameId = params.gameId
  const [game, setGame] = useState<Game | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)

  useEffect(() => {
    callApi(`/games/${gameId}`)
      .then(res => {
        if (res.ok) {
          const gameData = res.data as Game
          // Rediriger vers 404 si la game est finie
          if (gameData.phase === 'finished') {
            setError(true)
          } else {
            setGame(gameData)
          }
        } else {
          console.log('Game API error:', res.status)
          setError(true)
        }
      })
      .catch(() => setError(true))
      .finally(() => setLoading(false))
  }, [gameId])

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p>Loading game...</p>
        </div>
      </div>
    )
  }

  if (error || !game) {
    return notFound()
  }

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

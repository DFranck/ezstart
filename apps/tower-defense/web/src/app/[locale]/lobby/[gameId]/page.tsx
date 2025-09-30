'use client'

import { logger } from '@ezstart/ui/lib'
import { callApi } from '@ezstart/ui/utils'
import { LeaveGameButton } from '../../../../components/LeaveGameButton'
import { LobbyWrapper } from './LobbyWrapper'
import { useEffect, useState } from 'react'
import { notFound } from 'next/navigation'
import { Game } from '@tower-defense/types'

export default function LobbyPage({ params }: { params: Promise<{ gameId: string }> }) {
  const [gameId, setGameId] = useState<string | null>(null)
  const [game, setGame] = useState<Game | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)

  useEffect(() => {
    params.then(({ gameId }) => {
      setGameId(gameId)
      
      callApi(`/games/${gameId}`)
        .then(res => {
          if (res.ok) {
            setGame(res.data)
            logger.debug('game', res.data)
          } else {
            setError(true)
          }
        })
        .catch(() => setError(true))
        .finally(() => setLoading(false))
    })
  }, [params])

  if (loading) {
    return <div className="p-4 max-w-2xl mx-auto">Loading...</div>
  }

  if (error || !game || !gameId) {
    return notFound()
  }
  
  return (
    <div className="p-4 max-w-2xl mx-auto">
      <LobbyWrapper game={game} gameId={gameId} />
      
      <div className="mt-6 pt-4 border-t border-gray-200 dark:border-gray-700">
        <LeaveGameButton gameId={gameId} />
      </div>
    </div>
  )
}

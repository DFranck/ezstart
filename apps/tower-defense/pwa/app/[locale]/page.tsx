'use client'

import CreateGameButton from '@/components/CreateGameButton'
import { LoginSection } from '@/components/LoginSection'
import { usePlayerStore } from '@/stores/usePlayerStore'
import { extractPlayerId } from '@/utils/extractPlayerId'
import { Button, H1, Icon, LI, Main, P, Section, Span, UL } from '@ezstart/ui/components'
import { isDebug, logger } from '@ezstart/ui/lib'
import { callApi } from '@ezstart/ui/utils'
import { mockGames, type Game } from '@tower-defense/types'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useEffect, useState, useCallback } from 'react'
import { JoinGameButton } from '../../components/JoinGameButton'
import { usePolling } from '../../hooks/usePolling'
import { useErrorHandler } from '../../hooks/useErrorHandler'
import { ErrorDisplay } from '../../components/ErrorDisplay'

export default function Page() {
  const { player } = usePlayerStore()
  const router = useRouter()
  const [waitingGames, setWaitingGames] = useState<Game[]>([])
  const [isInitialLoading, setIsInitialLoading] = useState(true)
  
  const { errors, addError, clearError, clearAllErrors } = useErrorHandler({
    maxRetries: 2,
    retryDelay: 2000
  })

  // Fonction de récupération des jeux avec gestion d'erreurs
  const fetchGames = useCallback(async () => {
    try {
      if (isDebug()) {
        setWaitingGames(mockGames)
        return mockGames
      }

      const res = await callApi('/api/games?phase=waiting&phase=playing')
      if (!res.ok) {
        throw new Error('Failed to fetch games')
      }

      const allGames = res.data as Game[]
      const waitingGames = allGames.filter(game => game.phase === 'waiting')
      const playingGames = allGames.filter(game => game.phase === 'playing')

      logger.debug('playingGames', playingGames)
      logger.debug('waitingGames', waitingGames)
      logger.debug('Current player ID:', player?._id)

      // Vérifier si le joueur est dans une partie active
      const activeGame = playingGames.find(game =>
        game.players.some(p => extractPlayerId(p) === player?._id.toString())
      )

      if (activeGame) {
        logger.debug('Redirecting to active game', activeGame._id)
        router.push(`/game/${activeGame._id}`)
        return allGames
      }

      setWaitingGames(waitingGames)
      return allGames
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to fetch games'
      addError(errorMessage, true)
      throw error
    }
  }, [player?._id, router, addError])

  // Polling intelligent pour les mises à jour
  const { loading: isPolling } = usePolling(fetchGames, {
    interval: 10000, // Poll toutes les 10 secondes
    enabled: !!player?._id && !isInitialLoading,
    maxRetries: 2,
    onError: (error) => {
      addError(`Polling failed: ${error.message}`, true)
    },
    onSuccess: (data) => {
      if (data) {
        const waitingGames = data.filter((game: Game) => game.phase === 'waiting')
        setWaitingGames(waitingGames)
      }
    }
  })

  // Chargement initial
  useEffect(() => {
    if (!player?._id) {
      setIsInitialLoading(false)
      return
    }

    const initialLoad = async () => {
      try {
        await fetchGames()
      } catch (error) {
        // Erreur déjà gérée par fetchGames
      } finally {
        setIsInitialLoading(false)
      }
    }

    initialLoad()
  }, [player?._id, fetchGames])

  const isLoading = isInitialLoading || isPolling

  if (isInitialLoading) {
    return (
      <Main>
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="text-center">
            <Icon name={'fa:FaSpinner'} spin className="w-8 h-8 mb-4" />
            <p className="text-gray-600">Loading games...</p>
          </div>
        </div>
      </Main>
    )
  }

  return (
    <Main>
      <ErrorDisplay 
        errors={errors}
        onClearError={clearError}
        onClearAll={clearAllErrors}
        position="top-right"
        maxErrors={3}
      />
      
      <Section size={'xl'}>
        <H1 className="md:text-center">Tower Defense</H1>
        <LoginSection />
      </Section>
      
      <Section size={'xs'}>
        {player && <CreateGameButton playerId={player._id} />}
        
        {waitingGames.length === 0 ? (
          <div className="text-center py-8">
            <P variant={'description'}>No open lobbies. Create one!</P>
            {isPolling && (
              <div className="mt-2 text-sm text-gray-500 flex items-center justify-center gap-2">
                <Icon name="fa:FaSync" className="w-3 h-3 animate-spin" />
                Refreshing...
              </div>
            )}
          </div>
        ) : (
          <div>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold">Available Games</h2>
              {isPolling && (
                <div className="text-sm text-gray-500 flex items-center gap-2">
                  <Icon name="fa:FaSync" className="w-3 h-3 animate-spin" />
                  Auto-refreshing
                </div>
              )}
            </div>
            
            <UL>
              {waitingGames.map(game => {
                const alreadyJoined = game.players.some(p => extractPlayerId(p) === player?._id)
                const activePlayers = game.players.filter(p => p.status === 'active')
                
                logger.debug('alreadyJoined', alreadyJoined)
                
                return (
                  <LI key={game._id} size={'xs'} className="p-3 border rounded-lg hover:bg-gray-50 transition-colors">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-4">
                        <Span className="font-medium">
                          {activePlayers.length}/{game.players.length} players
                        </Span>
                        {activePlayers.length < game.players.length && (
                          <span className="text-xs text-yellow-600 bg-yellow-100 px-2 py-1 rounded">
                            {game.players.length - activePlayers.length} disconnected
                          </span>
                        )}
                      </div>
                      
                      {!alreadyJoined ? (
                        <JoinGameButton gameId={game._id} playerId={player?._id ?? ''} />
                      ) : (
                        <Button asChild>
                          <Link href={`/lobby/${game._id}`}>Return to lobby</Link>
                        </Button>
                      )}
                    </div>
                  </LI>
                )
              })}
            </UL>
          </div>
        )}
      </Section>
    </Main>
  )
}

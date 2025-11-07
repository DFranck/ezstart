'use client'

import CreateGameButton from '@/components/CreateGameButton'
import { LoginSection } from '@/components/LoginSection'
import { useGames } from '@/hooks/useGames'
import { usePlayerStore } from '@/stores/usePlayerStore'
import { Button, H1, Icon, LI, Main, P, Section, UL, SkeletonList } from '@ezstart/ui/components'
import { logger } from '@ezstart/logger'
import { Game } from '@tower-defense/types'
import Link from 'next/link'
import { useEffect } from 'react'
import { JoinGameButton } from '../../components/JoinGameButton'

export default function Page(): any {
  const { player } = usePlayerStore()

  const { waitingGames, allGames, isLoading, error, fetchGames, refreshGames } = useGames({
    autoRedirect: true,
    pollingInterval: 10000,
    enablePolling: !!player?._id,
  })

  // Chargement initial
  useEffect(() => {
    if (player?._id) {
      fetchGames(player?._id)
    }
  }, [player?._id, fetchGames])

  // Afficher le chargement seulement si l'utilisateur est connecté et qu'on charge
  if (player?._id && isLoading) {
    return (
      <Main>
        <Section size={'xl'}>
          <H1 className="md:text-center">Tower Defense</H1>
        </Section>
        <Section size={'xs'}>
          <SkeletonList items={3} showAvatar={false} variant="shimmer" />
        </Section>
      </Main>
    )
  }

  return (
    <Main>
      <Section size={'xl'}>
        <H1 className="md:text-center">Tower Defense</H1>
        <LoginSection />
      </Section>

      {player && (
        <Section size={'xs'}>
          <CreateGameButton playerId={player?._id} />

          {/* Games en cours où le joueur peut se reconnecter */}
          {(() => {
            const playingGames = allGames.filter(game => 
              game.phase === 'playing' && 
              game.players?.some(inGamePlayer => inGamePlayer?.player?._id === player?._id)
            )
            
            return playingGames.length > 0 && (
              <div className="mb-6">
                <h2 className="text-lg font-semibold mb-3 text-orange-600">Your Active Games</h2>
                <UL>
                  {playingGames.map((game: Game) => (
                    <LI
                      key={game._id}
                      size={'xs'}
                      className="p-3 border rounded-lg bg-orange-50 border-orange-200"
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <Icon name="fa:FaPlay" className="text-orange-600" />
                          <span className="font-medium">Game in progress</span>
                        </div>
                        <Button asChild variant="default">
                          <Link href={`/game/${game._id}`}>Reconnect</Link>
                        </Button>
                      </div>
                    </LI>
                  ))}
                </UL>
              </div>
            )
          })()}

          {waitingGames.length === 0 ? (
            <div className="text-center py-8">
              <P variant={'description'}>No open lobbies. Create one!</P>
              {isLoading && (
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
                {isLoading && (
                  <div className="text-sm text-gray-500 flex items-center gap-2">
                    <Icon name="fa:FaSync" className="w-3 h-3 animate-spin" />
                    Auto-refreshing
                  </div>
                )}
              </div>

              <UL>
                {waitingGames.map((game: Game) => {
                  const alreadyJoined =
                    game.players?.some(inGamePlayer => inGamePlayer?.player?._id === player?._id) ??
                    false

                  logger.debug('alreadyJoined', alreadyJoined)

                  return (
                    <LI
                      key={game._id}
                      size={'xs'}
                      className="p-3 border rounded-lg hover:bg-gray-50 transition-colors"
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-4"></div>

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
      )}
    </Main>
  )
}

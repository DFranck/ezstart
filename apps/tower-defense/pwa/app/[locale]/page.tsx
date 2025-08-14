'use client'

import CreateGameButton from '@/components/CreateGameButton'
import { LoginSection } from '@/components/LoginSection'
import { useGames } from '@/hooks/useGames'
import { usePlayerStore } from '@/stores/usePlayerStore'
import { Button, H1, Icon, LI, Main, P, Section, UL } from '@ezstart/ui/components'
import { logger } from '@ezstart/ui/lib'
import { Game } from '@tower-defense/types'
import Link from 'next/link'
import { useEffect } from 'react'
import { JoinGameButton } from '../../components/JoinGameButton'

export default function Page() {
  const { player } = usePlayerStore()

  const { waitingGames, isLoading, error, fetchGames, refreshGames } = useGames({
    autoRedirect: true,
    pollingInterval: 10000,
    enablePolling: !!player?._id,
  })

  // Chargement initial
  useEffect(() => {
    if (player?._id) {
      fetchGames(player._id)
    }
  }, [player?._id, fetchGames])

  // Afficher le chargement seulement si l'utilisateur est connecté et qu'on charge
  if (player?._id && isLoading) {
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
      <Section size={'xl'}>
        <H1 className="md:text-center">Tower Defense</H1>
        <LoginSection />
      </Section>

      {player && (
        <Section size={'xs'}>
          <CreateGameButton playerId={player._id} />

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
                    game.players?.some(playerInGame => playerInGame.player._id === player?._id) ??
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

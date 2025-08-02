'use client'

import CreateGameButton from '@/components/CreateGameButton'
import { LoginSection } from '@/components/LoginSection'
import { usePlayerStore } from '@/stores/usePlayerStore'
import { Button, H1, Icon, LI, Main, P, Section, Span, UL } from '@ezstart/ui/components'
import { isDebug, logger } from '@ezstart/ui/lib'
import { callApi } from '@ezstart/ui/utils'
import { mockGames, type Game } from '@tower-defense/types'
import Link from 'next/link'
import { useEffect, useState } from 'react'
import { JoinGameButton } from '../../components/JoinGameButton'

export default function Page() {
  const [waitingGames, setWaitingGames] = useState<Game[]>([])
  const { player } = usePlayerStore()
  const [isloading, setIsLoading] = useState(true)
  useEffect(() => {
    const fetchGames = async () => {
      setIsLoading(true)
      if (isDebug() === true) {
        setWaitingGames(mockGames)
      } else {
        const res = await callApi('/api/games')
        if (res.ok) {
          const waitingGames = (res.data as Game[]).filter(game => game.phase === 'waiting')
          logger.debug('waitingGames', waitingGames)
          setWaitingGames(waitingGames)
        }
      }
      setIsLoading(false)
    }

    fetchGames()
  }, [])

  return (
    <Main>
      <Section size={'xl'}>
        <H1 className="md:text-center">Tower Defense</H1>
        <LoginSection />
      </Section>
      {isloading ? (
        <Icon name={'fa:FaSpinner'} spin />
      ) : (
        <Section size={'xs'}>
          {player && <CreateGameButton playerId={player._id} />}
          {!isloading && waitingGames.length === 0 ? (
            <P variant={'description'}>No open lobbies. Create one!</P>
          ) : (
            <UL>
              {waitingGames.map(game => {
                const alreadyJoined = game.players.some(p => p.toString() === player?._id)
                return (
                  <LI key={game._id} size={'xs'}>
                    <Span>{game.players.length}/8 players </Span>
                    {!alreadyJoined ? (
                      <JoinGameButton gameId={game._id} playerId={player?._id ?? ''} />
                    ) : (
                      <Button asChild>
                        <Link href={`/lobby/${game._id}`}>Return to lobby</Link>
                      </Button>
                    )}
                  </LI>
                )
              })}
            </UL>
          )}
        </Section>
      )}
    </Main>
  )
}

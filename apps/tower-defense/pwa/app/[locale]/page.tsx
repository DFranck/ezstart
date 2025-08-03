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
import { useEffect, useState } from 'react'
import { JoinGameButton } from '../../components/JoinGameButton'

export default function Page() {
  const [waitingGames, setWaitingGames] = useState<Game[]>([])
  const { player } = usePlayerStore()
  const router = useRouter()
  const [isLoading, setIsLoading] = useState(true)
  useEffect(() => {
    if (!player?._id) return
    const fetchGames = async () => {
      setIsLoading(true)
      if (isDebug() === true) {
        setWaitingGames(mockGames)
      } else {
        const res = await callApi('/api/games?phase=waiting&phase=playing')
        if (res.ok) {
          const waitingGames = (res.data as Game[]).filter(game => game.phase === 'waiting')
          const playingGames = (res.data as Game[]).filter(game => game.phase === 'playing')
          logger.debug('playingGames', playingGames)
          logger.debug('waitingGames', waitingGames)
          logger.debug('Current player ID:', player?._id)
          logger.debug(
            'All player IDs in games:',
            playingGames.flatMap(game => game.players.map(p => extractPlayerId(p)))
          )

          const activeGame = playingGames.find(game =>
            game.players.some(p => extractPlayerId(p) === player?._id.toString())
          )
          if (activeGame) {
            logger.debug('Redirecting to game', activeGame._id)
            router.push(`/game/${activeGame._id}`)
            return
          }
          setWaitingGames(waitingGames)
        }
      }
      setIsLoading(false)
    }

    fetchGames()
  }, [player?._id])

  if (isLoading) {
    return (
      <Main>
        <Icon name={'fa:FaSpinner'} spin />
      </Main>
    )
  }

  return (
    <Main>
      <Section size={'xl'}>
        <H1 className="md:text-center">Tower Defense</H1>
        <LoginSection />
      </Section>
      <Section size={'xs'}>
        {player && <CreateGameButton playerId={player._id} />}
        {waitingGames.length === 0 ? (
          <P variant={'description'}>No open lobbies. Create one!</P>
        ) : (
          <UL>
            {waitingGames.map(game => {
              const alreadyJoined = game.players.some(p => extractPlayerId(p) === player?._id)
              logger.debug('alreadyJoined', alreadyJoined)
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
    </Main>
  )
}

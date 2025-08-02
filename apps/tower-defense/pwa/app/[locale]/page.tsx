'use client'

import CreateGameButton from '@/components/CreateGameButton'
import { LoginSection } from '@/components/LoginSection'
import { usePlayerStore } from '@/stores/usePlayerStore'
import {
  H1,
  Icon,
  LI,
  Main,
  P,
  Section,
  Span,
  Tooltip,
  TooltipContent,
  TooltipTrigger,
  UL,
} from '@ezstart/ui/components'
import { isDebug, logger } from '@ezstart/ui/lib'
import { callApi } from '@ezstart/ui/utils'
import { mockGames, type Game } from '@tower-defense/types'
import { useEffect, useState } from 'react'
import { JoinGameButton } from '../../components/JoinGameButton'

export default function Page() {
  const [games, setGames] = useState<Game[]>([])
  const { player } = usePlayerStore()
  const [isloading, setIsLoading] = useState(true)
  useEffect(() => {
    const fetchGames = async () => {
      setIsLoading(true)
      if (isDebug() === true) {
        setGames(mockGames)
      } else {
        const res = await callApi('/api/games')
        if (res.ok) {
          const waitingGames = (res.data as Game[]).filter(game => game.phase === 'waiting')
          logger.debug('waitingGames', waitingGames)
          setGames(waitingGames)
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
          {player && <CreateGameButton playerName={player.name} />}
          {!isloading || !player || games.length === 0 ? (
            <P variant={'description'}>No open games. Create one!</P>
          ) : (
            <UL>
              {games.map(game => (
                <LI key={game._id} size={'xs'}>
                  <Tooltip>
                    <TooltipTrigger>
                      <Span>{game.players.length}/8 players </Span>
                      <JoinGameButton gameId={game._id} playerName={player.name} />
                    </TooltipTrigger>
                    <TooltipContent>
                      <UL>
                        {game.players.map(player => (
                          <LI key={`${player.playerId}-${player.name}`} marker={'dash'}>
                            {player.name}
                          </LI>
                        ))}
                      </UL>
                    </TooltipContent>
                  </Tooltip>
                </LI>
              ))}
            </UL>
          )}
        </Section>
      )}
    </Main>
  )
}

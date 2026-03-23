'use client'

import { useParams, useRouter } from 'next/navigation'
import { useEffect } from 'react'
import type { GameType } from '@game-analyzer/types'

const VALID_GAMES: GameType[] = ['summoners-war', 'nikke']

export default function GameLayout({ children }: { children: React.ReactNode }) {
  const params = useParams()
  const router = useRouter()
  const game = params.game as string

  useEffect(() => {
    if (!VALID_GAMES.includes(game as GameType)) {
      router.replace('/')
    }
  }, [game, router])

  if (!VALID_GAMES.includes(game as GameType)) {
    return null
  }

  return <>{children}</>
}

'use client'

import { Button, Div } from '@ezstart/ui/components'
import { useTranslations } from 'next-intl'
import type { GameType } from '@game-analyzer/types'

interface GameSelectorProps {
  value: GameType | null
  onChange: (game: GameType) => void
}

const games: { type: GameType; icon: string }[] = [
  { type: 'summoners-war', icon: '⚔️' },
  { type: 'nikke', icon: '🔫' },
]

export function GameSelector({ value, onChange }: GameSelectorProps) {
  const t = useTranslations('games')

  return (
    <Div className="flex gap-3">
      {games.map((game) => (
        <Button
          key={game.type}
          variant={value === game.type ? 'default' : 'outline'}
          className="flex-1 py-6 text-base"
          onClick={() => onChange(game.type)}
        >
          <span className="mr-2 text-xl">{game.icon}</span>
          {t(game.type)}
        </Button>
      ))}
    </Div>
  )
}

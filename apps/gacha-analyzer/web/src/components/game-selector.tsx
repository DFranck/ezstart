'use client'

import { Button, Div, Span } from '@ezstart/ui/components'
import { useTranslations } from 'next-intl'
import Image from 'next/image'
import type { GameType } from '@gacha-analyzer/types'
import { GAME_CONFIG } from '@/config/games'

interface GameSelectorProps {
  value: GameType | null
  onChange: (game: GameType) => void
}

const games: { type: GameType }[] = [{ type: 'summoners-war' }, { type: 'nikke' }]

export function GameSelector({ value, onChange }: GameSelectorProps) {
  const t = useTranslations('games')

  return (
    <Div className="flex gap-3">
      {games.map(game => (
        <Button
          key={game.type}
          variant={value === game.type ? 'default' : 'outline'}
          className="flex-1 py-6 text-base"
          onClick={() => onChange(game.type)}
        >
          <Image
            src={GAME_CONFIG[game.type]!.logo}
            alt={t(game.type)}
            width={0}
            height={0}
            sizes="100vw"
            style={{ width: 'auto', height: 'auto' }}
            className="max-h-[24px] object-contain [filter:drop-shadow(0_0_6px_rgba(255,255,255,0.8))_drop-shadow(0_0_16px_rgba(255,255,255,0.3))]"
          />
          <Span className="sr-only">{t(game.type)}</Span>
        </Button>
      ))}
    </Div>
  )
}

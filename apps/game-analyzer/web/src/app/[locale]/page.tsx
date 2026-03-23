'use client'

import { Card, CardContent, Div, H1, P } from '@ezstart/ui/components'
import { useTranslations } from 'next-intl'
import Link from 'next/link'
import type { GameType } from '@game-analyzer/types'

const games: { type: GameType; icon: string }[] = [
  { type: 'summoners-war', icon: '⚔️' },
  { type: 'nikke', icon: '🔫' },
]

export default function HomePage() {
  const t = useTranslations()

  return (
    <Div className="container mx-auto px-4 py-8 max-w-2xl">
      {/* Header */}
      <Div className="text-center mb-8">
        <H1 className="text-3xl font-bold mb-2">{t('dashboard.title')}</H1>
        <P className="text-muted-foreground">{t('dashboard.subtitle')}</P>
      </Div>

      {/* Game Selection */}
      <Div className="mb-6">
        <P className="text-sm font-medium mb-3 text-center">{t('home.selectGame')}</P>
      </Div>

      <Div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {games.map((game) => (
          <Link key={game.type} href={`/${game.type}/scan`}>
            <Card className="hover:border-primary/50 transition-colors cursor-pointer h-full">
              <CardContent className="flex flex-col items-center justify-center py-8">
                <span className="text-4xl mb-3">{game.icon}</span>
                <P className="text-lg font-semibold">{t(`games.${game.type}`)}</P>
              </CardContent>
            </Card>
          </Link>
        ))}
      </Div>
    </Div>
  )
}

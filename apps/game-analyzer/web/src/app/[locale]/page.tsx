'use client'

import { Card, CardContent, Div, H1, P } from '@ezstart/ui/components'
import { useTranslations } from 'next-intl'
import Link from 'next/link'
import type { GameType } from '@game-analyzer/types'

const games: { type: GameType; icon: string; banner: string }[] = [
  { type: 'summoners-war', icon: '\u2694\uFE0F', banner: '/images/games/summoners-war-banner.svg' },
  { type: 'nikke', icon: '\uD83D\uDD2B', banner: '/images/games/nikke-banner.svg' },
]

export default function HomePage() {
  const t = useTranslations()

  return (
    <Div className="container mx-auto px-4 py-12 max-w-2xl">
      {/* Header — gaming style */}
      <Div className="text-center mb-10">
        <H1 className="text-4xl font-black mb-3 bg-gradient-to-r from-ga-roll-hero via-ga-roll-legend to-ga-tier-godlike bg-clip-text text-transparent">
          {t('dashboard.title')}
        </H1>
        <P className="text-muted-foreground text-lg">{t('dashboard.subtitle')}</P>
      </Div>

      {/* Game Selection */}
      <Div className="mb-6">
        <P className="text-sm font-medium mb-4 text-center text-muted-foreground">{t('home.selectGame')}</P>
      </Div>

      <Div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
        {games.map((game) => (
          <Link key={game.type} href={`/${game.type}/scan`}>
            <Card className="group hover:border-primary/60 hover:shadow-lg hover:shadow-primary/5 transition-all duration-200 cursor-pointer h-full border-2 border-transparent hover:scale-[1.02] overflow-hidden">
              <img src={game.banner} alt={t(`games.${game.type}`)} className="w-full h-32 object-cover group-hover:scale-105 transition-transform duration-200" />
              <CardContent className="flex flex-col items-center justify-center py-6 px-6">
                <P className="text-xl font-bold mb-2">{t(`games.${game.type}`)}</P>
                <P className="text-sm text-muted-foreground text-center">
                  {t(`home.gameDescription.${game.type}`)}
                </P>
              </CardContent>
            </Card>
          </Link>
        ))}
      </Div>
    </Div>
  )
}

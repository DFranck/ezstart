'use client'

import { Div, H1, P } from '@ezstart/ui/components'
import { useTranslations } from 'next-intl'
import Image from 'next/image'
import { Link } from '@/i18n/navigation'
import type { GameType } from '@gacha-analyzer/types'
import { GAME_CONFIG } from '@/config/games'

const games: { type: GameType }[] = [{ type: 'summoners-war' }, { type: 'nikke' }]

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
        <P className="text-sm font-medium mb-4 text-center text-muted-foreground">
          {t('home.selectGame')}
        </P>
      </Div>

      <Div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
        {games.map(game => (
          <Link key={game.type} href={`/${game.type}/scan`}>
            <Div className="group relative overflow-hidden rounded-lg border-2 border-transparent hover:border-primary/60 hover:shadow-lg hover:shadow-primary/5 transition-all duration-300 cursor-pointer h-full min-h-[220px]">
              {/* Background image */}
              <Image
                src={GAME_CONFIG[game.type]!.bg}
                alt={t(`games.${game.type}`)}
                fill
                className="object-cover transition-transform duration-500 group-hover:scale-110"
                sizes="(max-width: 640px) 100vw, 50vw"
                priority
              />
              {/* Dark overlay */}
              <Div className="absolute inset-0 bg-background/60 group-hover:bg-background/50 transition-colors duration-300" />
              {/* Text content */}
              <Div className="relative z-10 flex flex-col items-center justify-center h-full min-h-[220px] py-8 px-6 text-center">
                <Image
                  src={GAME_CONFIG[game.type]!.logo}
                  alt={t(`games.${game.type}`)}
                  width={0}
                  height={0}
                  sizes="100vw"
                  style={{ width: 'auto', height: 'auto' }}
                  className="max-w-[200px] max-h-[80px] object-contain mb-3 [filter:drop-shadow(0_0_6px_rgba(255,255,255,0.8))_drop-shadow(0_0_16px_rgba(255,255,255,0.3))]"
                />
                <P className="text-sm text-muted-foreground">
                  {t(`home.gameDescription.${game.type}`)}
                </P>
              </Div>
            </Div>
          </Link>
        ))}
      </Div>
    </Div>
  )
}

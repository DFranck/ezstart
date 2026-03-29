'use client'

import { useParams, usePathname, useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import { useTranslations } from 'next-intl'
import Image from 'next/image'
import type { GameType } from '@gacha-analyzer/types'
import { GAME_CONFIG } from '@/config/games'
import { Div, H1, Main } from '@ezstart/ui/components'

const VALID_GAMES: GameType[] = ['summoners-war', 'nikke']

/** Map last path segment to i18n key for the page title */
const PAGE_TITLE_KEYS: Record<string, string> = {
  scan: 'scan.title',
  bench: 'bench.title',
  data: 'nav.data',
  history: 'history.title',
  sources: 'nav.sources',
}

export default function GameLayout({ children }: { children: React.ReactNode }) {
  const params = useParams()
  const router = useRouter()
  const pathname = usePathname()
  const t = useTranslations()
  const game = params.game as string
  // Measure the actual header height to pull the banner flush against it.
  // pt-16 (64px) on <Main> is a fixed offset, but the header height varies
  // with scroll (py-4 at top vs py-2 when scrolled). The gap = 64 - headerHeight.
  const [headerHeight, setHeaderHeight] = useState(0)

  useEffect(() => {
    const header = document.querySelector('header')
    if (!header) return
    const update = () => setHeaderHeight(header.getBoundingClientRect().height)
    update()
    const observer = new ResizeObserver(update)
    observer.observe(header)
    return () => observer.disconnect()
  }, [])

  // Offset to absorb the gap between pt-16 (64px) and the actual header.
  // Positive → gap exists, pull banner up. Negative → banner behind header, no change.
  const bannerOffset = headerHeight > 0 ? 64 - headerHeight : 0

  useEffect(() => {
    if (!VALID_GAMES.includes(game as GameType)) {
      router.replace('/')
    }
  }, [game, router])

  if (!VALID_GAMES.includes(game as GameType)) {
    return null
  }

  const bgImage = GAME_CONFIG[game]?.bg

  // Extract last path segment to determine the page title
  const segments = pathname.split('/').filter(Boolean)
  const lastSegment = segments[segments.length - 1]
  const titleKey = lastSegment ? PAGE_TITLE_KEYS[lastSegment] : undefined
  const pageTitle = titleKey ? t(titleKey) : null

  return (
    <>
      {/* Decorative game banner with overlay title */}
      {bgImage && (
        <Div
          className="relative w-full h-[150px] sm:h-[200px] overflow-hidden transition-[margin] duration-200 ease-out"
          style={bannerOffset > 0 ? { marginTop: `-${bannerOffset}px` } : undefined}
        >
          <Image
            src={bgImage}
            alt=""
            fill
            className="object-cover object-center"
            sizes="100vw"
            priority
          />
          {/* Gradient overlay */}
          <Div className="absolute inset-0 bg-gradient-to-b from-background/20 via-background/40 to-background" />
          {/* H1 centred on the banner */}
          {pageTitle && (
            <Div className="absolute inset-0 flex items-center justify-center">
              <H1 className="text-3xl sm:text-4xl font-black text-foreground drop-shadow-lg">
                {pageTitle}
              </H1>
            </Div>
          )}
        </Div>
      )}
      {children}
    </>
  )
}

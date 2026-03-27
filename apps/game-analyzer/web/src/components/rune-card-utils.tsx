'use client'

import { useState } from 'react'
import { Div, P } from '@ezstart/ui/components'

// ── Set emoji fallbacks ──
const SET_EMOJIS: Record<string, string> = {
  violent: '\u2694\uFE0F', swift: '\uD83D\uDCA8', rage: '\uD83D\uDD25', fatal: '\uD83D\uDDE1\uFE0F',
  despair: '\uD83D\uDE35', blade: '\uD83D\uDD2A', focus: '\uD83C\uDFAF', guard: '\uD83D\uDEE1\uFE0F',
  energy: '\uD83D\uDC9A', endure: '\uD83E\uDDF1', shield: '\uD83D\uDD30', revenge: '\u21A9\uFE0F',
  will: '\u2728', nemesis: '\u26A1', vampire: '\uD83E\uDDDB', destroy: '\uD83D\uDCA5',
  fight: '\u2694\uFE0F', determination: '\uD83D\uDCAA', enhance: '\uD83D\uDC9B', accuracy: '\uD83C\uDFAF',
  tolerance: '\uD83D\uDE4F', cruel: '\uD83D\uDE08',
}

/** Set icon with PNG image and emoji fallback */
export function SetIcon({ set, className = 'w-5 h-5' }: { set: string; className?: string }) {
  const [imgError, setImgError] = useState(false)
  const emoji = SET_EMOJIS[set] ?? ''

  if (imgError) {
    return <P className="inline-block leading-none">{emoji}</P>
  }

  return (
    <img
      src={`/images/games/summoners-war/runes/${set}.png`}
      alt={set}
      className={`${className} inline-block`}
      onError={() => setImgError(true)}
    />
  )
}

/** Large set icon for gaming template */
export function SetIconLarge({ set, className = 'w-8 h-8' }: { set: string; className?: string }) {
  const [imgError, setImgError] = useState(false)
  const emoji = SET_EMOJIS[set] ?? ''

  if (imgError) {
    return <P className="text-2xl">{emoji}</P>
  }

  return (
    <img
      src={`/images/games/summoners-war/runes/${set}.png`}
      alt={set}
      className={`${className} inline-block`}
      onError={() => setImgError(true)}
    />
  )
}

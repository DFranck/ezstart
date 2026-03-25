'use client'

import { useState } from 'react'
import { Div, P, Skeleton } from '@ezstart/ui/components'
import { useTranslations } from 'next-intl'
import { useMonstersByBuild } from '@/hooks/use-monsters'

const MAX_VISIBLE = 12

const ELEMENT_COLORS: Record<string, string> = {
  fire: 'var(--ga-element-fire)',
  water: 'var(--ga-element-water)',
  wind: 'var(--ga-element-wind)',
  light: 'var(--ga-element-light)',
  dark: 'var(--ga-element-dark)',
}

interface MonsterSuggestionsProps {
  archetypes: string[]
}

export function MonsterSuggestions({ archetypes }: MonsterSuggestionsProps) {
  const tRune = useTranslations('rune')
  const { data: monsters, isLoading } = useMonstersByBuild(archetypes)
  const [expanded, setExpanded] = useState(false)

  if (isLoading) {
    return (
      <Div className="space-y-2">
        <Skeleton className="h-4 w-40" />
        <Div className="flex gap-2">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-8 w-8 rounded-full" />
          ))}
        </Div>
      </Div>
    )
  }

  if (!monsters?.length) return null

  const visibleMonsters = expanded ? monsters : monsters.slice(0, MAX_VISIBLE)
  const hiddenCount = monsters.length - MAX_VISIBLE

  return (
    <Div className="space-y-2">
      <P className="text-sm font-medium">{tRune('suggestedMonsters')}</P>
      <Div className="flex flex-wrap gap-2 items-center">
        {visibleMonsters.map(monster => (
          <Div
            key={monster.id}
            className="relative group"
            title={`${monster.name} (${monster.element} ${monster.naturalStars}\u2605)`}
          >
            <img
              src={monster.imageUrl}
              alt={monster.name}
              className="w-8 h-8 rounded-full border-2"
              style={{ borderColor: ELEMENT_COLORS[monster.element] }}
            />
            {/* Star badge */}
            <Div className="absolute -bottom-1 -right-1 bg-background border border-border rounded-full w-4 h-4 flex items-center justify-center text-[9px] font-bold leading-none">
              {monster.naturalStars}
            </Div>
            {/* Tooltip on hover */}
            <Div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-1 hidden group-hover:block bg-popover text-popover-foreground text-xs rounded px-2 py-1 whitespace-nowrap z-50">
              {monster.name} ({monster.naturalStars}\u2605)
            </Div>
          </Div>
        ))}
        {!expanded && hiddenCount > 0 && (
          <button
            onClick={() => setExpanded(true)}
            className="text-xs text-muted-foreground self-center hover:underline"
          >
            +{hiddenCount} more
          </button>
        )}
      </Div>
    </Div>
  )
}

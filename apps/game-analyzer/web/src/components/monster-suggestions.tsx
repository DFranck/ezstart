'use client'

import { Div, P, Skeleton } from '@ezstart/ui/components'
import { useTranslations } from 'next-intl'
import { useMonstersByBuild } from '@/hooks/use-monsters'

const ELEMENT_COLORS: Record<string, string> = {
  fire: '#ef4444',
  water: '#3b82f6',
  wind: '#22c55e',
  light: '#eab308',
  dark: '#8b5cf6',
}

interface MonsterSuggestionsProps {
  archetypes: string[]
}

export function MonsterSuggestions({ archetypes }: MonsterSuggestionsProps) {
  const tRune = useTranslations('rune')
  const { data: monsters, isLoading } = useMonstersByBuild(archetypes)

  if (isLoading) {
    return (
      <Div className="space-y-2">
        <Skeleton className="h-4 w-40" />
        <Div className="flex gap-2">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-10 w-10 rounded-full" />
          ))}
        </Div>
      </Div>
    )
  }

  if (!monsters?.length) return null

  return (
    <Div className="space-y-2">
      <P className="text-sm font-medium">{tRune('suggestedMonsters')}</P>
      <Div className="flex flex-wrap gap-2">
        {monsters.slice(0, 12).map(monster => (
          <Div
            key={monster.id}
            className="relative group"
            title={`${monster.name} (${monster.element} ${monster.naturalStars}\u2605)`}
          >
            <img
              src={monster.imageUrl}
              alt={monster.name}
              className="w-10 h-10 rounded-full border-2"
              style={{ borderColor: ELEMENT_COLORS[monster.element] }}
            />
            {/* Tooltip on hover */}
            <Div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-1 hidden group-hover:block bg-popover text-popover-foreground text-xs rounded px-2 py-1 whitespace-nowrap z-50">
              {monster.name} ({monster.naturalStars}\u2605)
            </Div>
          </Div>
        ))}
        {monsters.length > 12 && (
          <P className="text-xs text-muted-foreground self-center">
            +{monsters.length - 12} more
          </P>
        )}
      </Div>
    </Div>
  )
}

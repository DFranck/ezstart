'use client'

import {
  Badge,
  Div,
  P,
  Span,
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@ezstart/ui/components'
import type { RuneData, RuneAnalysis, StatType, RuneQuality, StatTier } from '@gacha-analyzer/types'
import {
  SUBSTAT_ROLL_RANGES,
  GRIND_RANGES,
  GEM_RANGES,
  GRINDABLE_STATS,
  SET_STAT_TIERS,
} from '@gacha-analyzer/types'
import { GEM_ICONS, GRIND_ICONS, RUNE_SET_ICONS } from '../config/game-assets'

const STAT_TIER_COLORS: Record<StatTier, string> = {
  S: 'bg-ga-roll-legend/20 text-ga-roll-legend border-ga-roll-legend/40',
  A: 'bg-ga-roll-hero/20 text-ga-roll-hero border-ga-roll-hero/40',
  B: 'bg-ga-roll-rare/20 text-ga-roll-rare border-ga-roll-rare/40',
  C: 'bg-muted/30 text-muted-foreground border-border/40',
  D: 'bg-destructive/10 text-destructive border-destructive/30',
}

const ROLL_TIER_BG: Record<RuneQuality, string> = {
  legend: 'bg-ga-roll-legend/20 text-ga-roll-legend border-ga-roll-legend/30',
  hero: 'bg-ga-roll-hero/20 text-ga-roll-hero border-ga-roll-hero/30',
  rare: 'bg-ga-roll-rare/20 text-ga-roll-rare border-ga-roll-rare/30',
  magic: 'bg-ga-roll-magic/20 text-ga-roll-magic border-ga-roll-magic/30',
  normal: 'bg-muted text-muted-foreground border-border',
}

const QUALITY_COLORS: Record<RuneQuality, string> = {
  legend: 'text-ga-roll-legend',
  hero: 'text-ga-roll-hero',
  rare: 'text-ga-roll-rare',
  magic: 'text-ga-roll-magic',
  normal: 'text-muted-foreground',
}

export function isPercentStat(type: StatType): boolean {
  return ['hp%', 'atk%', 'def%', 'cr', 'cd', 'res', 'acc'].includes(type)
}

export function formatStatValue(type: StatType, value: number): string {
  const percentStats: StatType[] = ['hp%', 'atk%', 'def%', 'cr', 'cd', 'res', 'acc']
  return percentStats.includes(type) ? `+${value}%` : `+${value}`
}

export function formatStatLabel(type: StatType): string {
  return type.toUpperCase().replace('%', '%')
}

export function getRollQualityColor(rollQuality: number): string {
  if (rollQuality >= 90) return QUALITY_COLORS.legend
  if (rollQuality >= 75) return QUALITY_COLORS.hero
  if (rollQuality >= 50) return QUALITY_COLORS.rare
  if (rollQuality >= 25) return QUALITY_COLORS.magic
  return QUALITY_COLORS.normal
}

export function getStatTier(set: string, stat: string): StatTier {
  return SET_STAT_TIERS[set]?.[stat as StatType] ?? 'C'
}

interface SubstatsListProps {
  rune: RuneData
  analysis?: RuneAnalysis
}

export function SubstatsList({ rune, analysis }: SubstatsListProps) {
  return (
    <Div className="space-y-1">
      {rune.subStats.map((stat, i) => {
        const subAnalysis = analysis?.substats.find(s => s.type === stat.type)
        const breakdown = subAnalysis?.rollBreakdown
        return (
          <Div key={i} className="flex items-center justify-between gap-2">
            <Div className="flex items-center gap-1 min-w-0">
              <P className="text-xs text-muted-foreground shrink-0">{formatStatLabel(stat.type)}</P>
              {analysis?.subStatTiers?.[stat.type] && (
                <Badge
                  variant="outline"
                  className={`text-[7px] px-0.5 py-0 font-bold ${STAT_TIER_COLORS[analysis.subStatTiers[stat.type] as StatTier]}`}
                >
                  {analysis.subStatTiers[stat.type]}
                </Badge>
              )}
              <P
                className={`text-xs font-semibold shrink-0 ${subAnalysis ? getRollQualityColor(subAnalysis.efficiency) : 'text-foreground'}`}
              >
                {subAnalysis?.maxValue
                  ? `${formatStatValue(stat.type, stat.value)}/${isPercentStat(stat.type) ? subAnalysis.maxValue + '%' : subAnalysis.maxValue}`
                  : formatStatValue(stat.type, stat.value)}
              </P>
              {subAnalysis && (
                <P className="text-[10px] text-muted-foreground shrink-0">
                  {Math.round(subAnalysis.efficiency)}%
                </P>
              )}
              <SubstatActionIcon
                stat={stat}
                subAnalysis={subAnalysis}
                analysis={analysis}
                rune={rune}
              />
            </Div>
            {subAnalysis &&
              breakdown &&
              breakdown.length > 1 &&
              (() => {
                const suffix = isPercentStat(stat.type) ? '%' : ''
                const rollMax = SUBSTAT_ROLL_RANGES[stat.type]?.max ?? 0
                const powerupRolls = breakdown.slice(1)
                return (
                  <Div className="flex items-center gap-0.5 shrink-0">
                    {powerupRolls.map((roll, j) => {
                      const q = rollMax ? (roll.value / rollMax) * 100 : 0
                      const tier: RuneQuality =
                        q >= 90
                          ? 'legend'
                          : q >= 75
                            ? 'hero'
                            : q >= 50
                              ? 'rare'
                              : q >= 25
                                ? 'magic'
                                : 'normal'
                      return (
                        <Badge
                          key={j}
                          variant="outline"
                          className={`text-[9px] px-1 py-0 leading-tight border ${ROLL_TIER_BG[tier]}`}
                        >
                          {roll.value}/{rollMax}
                          {suffix}
                        </Badge>
                      )
                    })}
                  </Div>
                )
              })()}
          </Div>
        )
      })}
    </Div>
  )
}

/** Gem/Grind/Non-grindable action icon for a substat */
function SubstatActionIcon({
  stat,
  subAnalysis,
  analysis,
  rune,
}: {
  stat: { type: StatType; value: number }
  subAnalysis: RuneAnalysis['substats'][number] | undefined
  analysis?: RuneAnalysis
  rune: RuneData
}) {
  const isGem = subAnalysis?.isGemTarget
  const isGrindable = subAnalysis?.grindable
  const grindRange = GRIND_RANGES?.legend?.[stat.type]
  const gemReplaceStat = analysis?.archetypeOptimizations?.[0]?.gemTarget?.replace
  const gemRange = GEM_RANGES?.legend?.[stat.type]
  const sfx = isPercentStat(stat.type) ? '%' : ''

  if (isGem) {
    return (
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <Div className="relative inline-flex items-center justify-center w-5 h-5 shrink-0 cursor-help">
              <img src={GEM_ICONS.legend} alt="gem" className="w-5 h-5" />
              {RUNE_SET_ICONS[rune.set] && (
                <img
                  src={RUNE_SET_ICONS[rune.set]}
                  alt={rune.set}
                  className="w-3 h-3 absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 drop-shadow-[0_0_2px_rgba(0,0,0,0.8)]"
                />
              )}
            </Div>
          </TooltipTrigger>
          <TooltipContent>
            <P className="text-xs">
              Gem {rune.set}: {formatStatLabel(stat.type)} →{' '}
              {gemReplaceStat ? formatStatLabel(gemReplaceStat) : '?'}
              {gemRange && ` (${gemRange.min}–${gemRange.max}${sfx})`}
            </P>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    )
  }
  if (isGrindable && grindRange) {
    return (
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <Div className="relative inline-flex items-center justify-center w-[22px] h-[22px] shrink-0 cursor-help">
              <img src={GRIND_ICONS.legend} alt="grind" className="w-[22px] h-[22px]" />
              {RUNE_SET_ICONS[rune.set] && (
                <img
                  src={RUNE_SET_ICONS[rune.set]}
                  alt={rune.set}
                  className="w-3 h-3 absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 drop-shadow-[0_0_2px_rgba(0,0,0,0.8)]"
                />
              )}
            </Div>
          </TooltipTrigger>
          <TooltipContent>
            <P className="text-xs">
              Grind: +{grindRange.min}–{grindRange.max} {formatStatLabel(stat.type)}
              {sfx}
            </P>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    )
  }
  // Non-grindable
  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <Div className="relative inline-flex items-center justify-center w-[22px] h-[22px] shrink-0 cursor-help opacity-40">
            <img src={GRIND_ICONS.legend} alt="no grind" className="w-5 h-5" />
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.5"
              strokeLinecap="round"
              className="w-4 h-4 absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-destructive drop-shadow-[0_0_2px_rgba(0,0,0,0.8)]"
            >
              <circle cx="12" cy="12" r="10" />
              <line x1="4.93" y1="4.93" x2="19.07" y2="19.07" />
            </svg>
          </Div>
        </TooltipTrigger>
        <TooltipContent>
          <P className="text-xs">Non-grindable</P>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  )
}

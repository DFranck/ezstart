'use client'

import { Badge, Card, CardContent, Div, P, Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@ezstart/ui/components'
import { useTranslations } from 'next-intl'
import type { RuneData, RuneAnalysis, StatType, RuneQuality, BuildArchetype, ProgressiveAction } from '@game-analyzer/types'
import { BUILD_ARCHETYPES } from '@game-analyzer/types'

// ── Shared constants ──
const SET_EMOJIS: Record<string, string> = {
  violent: '\u2694\uFE0F', swift: '\uD83D\uDCA8', rage: '\uD83D\uDD25', fatal: '\uD83D\uDDE1\uFE0F',
  despair: '\uD83D\uDE35', blade: '\uD83D\uDD2A', focus: '\uD83C\uDFAF', guard: '\uD83D\uDEE1\uFE0F',
  energy: '\uD83D\uDC9A', endure: '\uD83E\uDDF1', shield: '\uD83D\uDD30', revenge: '\u21A9\uFE0F',
  will: '\u2728', nemesis: '\u26A1', vampire: '\uD83E\uDDDB', destroy: '\uD83D\uDCA5',
  fight: '\u2694\uFE0F', determination: '\uD83D\uDCAA', enhance: '\uD83D\uDC9B', accuracy: '\uD83C\uDFAF',
  tolerance: '\uD83D\uDE4F', cruel: '\uD83D\uDE08',
}

const QUALITY_COLORS: Record<RuneQuality, string> = {
  legend: 'text-ga-roll-legend',
  hero: 'text-ga-roll-hero',
  rare: 'text-ga-roll-rare',
  magic: 'text-ga-roll-magic',
  normal: 'text-muted-foreground',
}

const ADVICE_COLORS: Record<ProgressiveAction, string> = {
  sell: 'text-red-400',
  upgrade: 'text-blue-400',
  keep: 'text-green-400',
  grind: 'text-purple-400',
}

const ADVICE_BG: Record<ProgressiveAction, string> = {
  sell: 'bg-red-500/10 border-red-500/30',
  upgrade: 'bg-blue-500/10 border-blue-500/30',
  keep: 'bg-green-500/10 border-green-500/30',
  grind: 'bg-purple-500/10 border-purple-500/30',
}

type RollQualityTier = 'legend' | 'hero' | 'rare' | 'magic' | 'normal'

function getRollQualityTier(rollQuality: number): RollQualityTier {
  if (rollQuality >= 90) return 'legend'
  if (rollQuality >= 75) return 'hero'
  if (rollQuality >= 50) return 'rare'
  if (rollQuality >= 25) return 'magic'
  return 'normal'
}

function getRollQualityColor(rollQuality: number): string {
  return QUALITY_COLORS[getRollQualityTier(rollQuality)] ?? 'text-foreground'
}

function formatStatValue(type: StatType, value: number): string {
  const percentStats: StatType[] = ['hp%', 'atk%', 'def%', 'cr', 'cd', 'res', 'acc']
  return percentStats.includes(type) ? `+${value}%` : `+${value}`
}

function formatStatLabel(type: StatType): string {
  return type.toUpperCase().replace('%', '%')
}

function getRollDots(rolls: number): string {
  return '\u25CF'.repeat(rolls)
}

interface RuneCardCompactProps {
  rune: RuneData
  analysis?: RuneAnalysis
  confidence?: number
}

export function RuneCardCompact({ rune, analysis, confidence }: RuneCardCompactProps) {
  const tRune = useTranslations('rune')

  const quality = rune.quality ?? 'normal'
  const setEmoji = SET_EMOJIS[rune.set] ?? ''
  const rollQualityTier = analysis?.rollQualityTier ?? 'normal'
  const advice = analysis?.progressiveAdvice

  return (
    <Card className="overflow-hidden">
      <CardContent className="p-3 space-y-2">
        {/* ── Row 1: Set, Slot, Level, Quality | Roll Quality + Advice ── */}
        <Div className="flex items-center justify-between">
          <Div className="flex items-center gap-1.5">
            <P className="text-sm">{setEmoji}</P>
            <P className="text-sm font-bold capitalize">{rune.set}</P>
            <P className="text-xs text-muted-foreground">({rune.slot})</P>
            <Badge variant="secondary" className="text-[10px] px-1 py-0">+{rune.level}</Badge>
            <Badge className={`border text-[10px] px-1 py-0 ${
              quality === 'legend' ? 'bg-ga-roll-legend/10 border-ga-roll-legend/30 text-ga-roll-legend' :
              quality === 'hero' ? 'bg-ga-roll-hero/10 border-ga-roll-hero/30 text-ga-roll-hero' :
              quality === 'rare' ? 'bg-ga-roll-rare/10 border-ga-roll-rare/30 text-ga-roll-rare' :
              quality === 'magic' ? 'bg-ga-roll-magic/10 border-ga-roll-magic/30 text-ga-roll-magic' :
              'bg-muted text-muted-foreground'
            }`}>
              {tRune(`quality.${quality}`)}
            </Badge>
          </Div>
          <Div className="flex items-center gap-2">
            {analysis && (
              <P className={`text-xs font-semibold ${QUALITY_COLORS[rollQualityTier]}`}>
                {tRune(`rollQuality.${rollQualityTier}`)} ({analysis.efficiency}%)
              </P>
            )}
            {advice && (
              <Badge className={`border text-[10px] px-1.5 py-0 font-bold ${ADVICE_BG[advice.action]} ${ADVICE_COLORS[advice.action]}`}>
                {advice.action.toUpperCase()}
                {advice.sellProbability > 0 && ` ${advice.sellProbability}%`}
              </Badge>
            )}
          </Div>
        </Div>

        {/* ── Row 2: Main stat ── */}
        <Div className="flex items-center gap-2">
          <P className="text-sm font-bold text-foreground">
            {formatStatLabel(rune.mainStat.type)} {formatStatValue(rune.mainStat.type, rune.mainStat.value)}
          </P>
          {rune.innateStat && (
            <P className="text-xs text-muted-foreground">
              ({formatStatLabel(rune.innateStat.type)} {formatStatValue(rune.innateStat.type, rune.innateStat.value)})
            </P>
          )}
        </Div>

        {/* ── Separator ── */}
        <Div className="border-t border-border" />

        {/* ── Row 3: Substats in a horizontal grid ── */}
        <Div className="grid grid-cols-2 gap-x-4 gap-y-1">
          {rune.subStats.map((stat, i) => {
            const subAnalysis = analysis?.substats.find(s => s.type === stat.type)
            return (
              <Div key={i} className="flex items-center justify-between">
                <P className="text-xs text-muted-foreground">{formatStatLabel(stat.type)}</P>
                <Div className="flex items-center gap-1">
                  <P className={`text-xs font-semibold ${subAnalysis ? getRollQualityColor(subAnalysis.efficiency) : 'text-foreground'}`}>
                    {formatStatValue(stat.type, stat.value)}
                  </P>
                  {subAnalysis && subAnalysis.rolls > 0 && (
                    <P className={`text-[9px] leading-none ${getRollQualityColor(subAnalysis.efficiency)}`}>
                      {getRollDots(subAnalysis.rolls)}
                    </P>
                  )}
                </Div>
              </Div>
            )
          })}
        </Div>

        {/* ── Row 4: Potential + Grind (inline) ── */}
        {analysis && (
          <Div className="flex items-center gap-3 text-[11px] text-muted-foreground">
            {analysis.potentialEfficiency !== undefined && (
              <P>
                <span className="font-medium">{tRune('potential12')}:</span> {analysis.potentialEfficiency}%
              </P>
            )}
            {analysis.grindedEfficiency !== undefined && (
              <P>
                <span className="font-medium">{tRune('afterGrind')}:</span> {analysis.grindedEfficiency}%
                {analysis.grindGain !== undefined && analysis.grindGain > 0 && (
                  <span className="text-green-500"> (+{analysis.grindGain}%)</span>
                )}
              </P>
            )}
          </Div>
        )}

        {/* ── Row 5: Synergy badges (compact) ── */}
        {analysis?.synergy && (() => {
          const matchingArchetypes = (analysis.synergy.allArchetypes ?? [])
            .filter(a => a.matchCount >= 3)
            .sort((a, b) => b.matchCount - a.matchCount)

          if (matchingArchetypes.length === 0) return null

          return (
            <Div className="flex flex-wrap gap-1">
              {matchingArchetypes.map(arch => {
                const archKey = arch.archetype as BuildArchetype
                const emoji = BUILD_ARCHETYPES[archKey]?.emoji ?? ''
                return (
                  <Badge
                    key={archKey}
                    variant="outline"
                    className={`text-[10px] px-1 py-0 cursor-default ${
                      arch.matchCount >= 4 ? 'bg-yellow-500/15 border-yellow-500/40 text-yellow-500' :
                      'bg-green-500/15 border-green-500/40 text-green-500'
                    }`}
                  >
                    {emoji} {tRune(`archetype.${archKey}`)} {arch.matchCount}/4
                  </Badge>
                )
              })}
            </Div>
          )
        })()}

        {/* ── OCR Confidence ── */}
        {confidence !== undefined && (
          <Div className="flex justify-end">
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Div className="flex items-center gap-1 cursor-default">
                    <Div className={`h-1.5 w-1.5 rounded-full ${
                      confidence >= 80 ? 'bg-green-500' : confidence >= 50 ? 'bg-yellow-500' : 'bg-red-500'
                    }`} />
                    <P className="text-[10px] text-muted-foreground">{Math.round(confidence)}%</P>
                  </Div>
                </TooltipTrigger>
                <TooltipContent>
                  <P className="text-xs">{tRune('ocrConfidence')}: {Math.round(confidence)}%</P>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </Div>
        )}
      </CardContent>
    </Card>
  )
}

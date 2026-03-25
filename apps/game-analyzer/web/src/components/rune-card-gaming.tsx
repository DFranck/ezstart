'use client'

import { Badge, Div, P, Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@ezstart/ui/components'
import { useTranslations } from 'next-intl'
import type { RuneData, RuneAnalysis, StatType, RuneQuality, BuildArchetype, ProgressiveAction, RollBreakdown } from '@game-analyzer/types'
import { BUILD_ARCHETYPES } from '@game-analyzer/types'
import { MonsterSuggestions } from './monster-suggestions'
import { SetIconLarge } from './rune-card-utils'

// ── Quality border glow colors ──
const QUALITY_BORDER: Record<RuneQuality, string> = {
  legend: 'border-ga-roll-legend shadow-[0_0_15px_rgba(255,165,0,0.3)]',
  hero: 'border-ga-roll-hero shadow-[0_0_15px_rgba(168,85,247,0.3)]',
  rare: 'border-ga-roll-rare shadow-[0_0_10px_rgba(59,130,246,0.2)]',
  magic: 'border-ga-roll-magic shadow-[0_0_10px_rgba(34,197,94,0.2)]',
  normal: 'border-border',
}

const QUALITY_GLOW: Record<RuneQuality, string> = {
  legend: 'text-ga-roll-legend drop-shadow-[0_0_8px_rgba(255,165,0,0.6)]',
  hero: 'text-ga-roll-hero drop-shadow-[0_0_8px_rgba(168,85,247,0.6)]',
  rare: 'text-ga-roll-rare drop-shadow-[0_0_6px_rgba(59,130,246,0.4)]',
  magic: 'text-ga-roll-magic drop-shadow-[0_0_6px_rgba(34,197,94,0.4)]',
  normal: 'text-muted-foreground',
}

type RollQualityTier = 'legend' | 'hero' | 'rare' | 'magic' | 'normal'

const ROLL_QUALITY_COLORS: Record<RollQualityTier, string> = {
  legend: 'text-ga-roll-legend',
  hero: 'text-ga-roll-hero',
  rare: 'text-ga-roll-rare',
  magic: 'text-ga-roll-magic',
  normal: 'text-ga-roll-normal',
}

function getRollQualityTier(rollQuality: number): RollQualityTier {
  if (rollQuality >= 90) return 'legend'
  if (rollQuality >= 75) return 'hero'
  if (rollQuality >= 50) return 'rare'
  if (rollQuality >= 25) return 'magic'
  return 'normal'
}

function getRollQualityColor(rollQuality: number): string {
  return ROLL_QUALITY_COLORS[getRollQualityTier(rollQuality)]
}

function formatStatValue(type: StatType, value: number): string {
  const percentStats: StatType[] = ['hp%', 'atk%', 'def%', 'cr', 'cd', 'res', 'acc']
  return percentStats.includes(type) ? `+${value}%` : `+${value}`
}

function formatStatLabel(type: StatType): string {
  return type.toUpperCase().replace('%', '%')
}

// ── Stat icons ──
const STAT_ICONS: Record<string, string> = {
  'hp': '\u2764\uFE0F', 'hp%': '\u2764\uFE0F',
  'atk': '\u2694\uFE0F', 'atk%': '\u2694\uFE0F',
  'def': '\uD83D\uDEE1\uFE0F', 'def%': '\uD83D\uDEE1\uFE0F',
  'spd': '\uD83D\uDCA8',
  'cr': '\uD83C\uDFAF',
  'cd': '\uD83D\uDCA5',
  'res': '\uD83D\uDE4F',
  'acc': '\uD83D\uDD2D',
}

// ── Advice styles for gaming ──
/* Advice gradients use hardcoded dark shades because CSS variables can't be used
   inside Tailwind gradient stops with opacity modifiers. The text/glow use theme vars. */
const ADVICE_GAMING: Record<ProgressiveAction, { bg: string; text: string; glow: string }> = {
  sell: {
    bg: 'bg-gradient-to-r from-destructive/40 to-destructive/20',
    text: 'text-destructive-foreground',
    glow: 'shadow-[0_0_20px_color-mix(in_oklch,var(--destructive)_40%,transparent)]',
  },
  upgrade: {
    bg: 'bg-gradient-to-r from-ga-roll-rare/40 to-ga-roll-rare/20',
    text: 'text-ga-roll-rare',
    glow: 'shadow-[0_0_20px_color-mix(in_oklch,var(--ga-roll-rare)_40%,transparent)]',
  },
  keep: {
    bg: 'bg-gradient-to-r from-success/40 to-success/20',
    text: 'text-success-foreground',
    glow: 'shadow-[0_0_20px_color-mix(in_oklch,var(--success)_40%,transparent)]',
  },
  grind: {
    bg: 'bg-gradient-to-r from-ga-roll-hero/40 to-ga-roll-hero/20',
    text: 'text-ga-roll-hero',
    glow: 'shadow-[0_0_20px_color-mix(in_oklch,var(--ga-roll-hero)_40%,transparent)]',
  },
}

const ADVICE_ICONS: Record<ProgressiveAction, string> = {
  upgrade: '\u2191',
  keep: '\u2713',
  grind: '\u2699',
  sell: '\u2715',
}

const ROLL_TIER_BG: Record<RuneQuality, string> = {
  legend: 'bg-ga-roll-legend/20 text-ga-roll-legend border-ga-roll-legend/30',
  hero: 'bg-ga-roll-hero/20 text-ga-roll-hero border-ga-roll-hero/30',
  rare: 'bg-ga-roll-rare/20 text-ga-roll-rare border-ga-roll-rare/30',
  magic: 'bg-ga-roll-magic/20 text-ga-roll-magic border-ga-roll-magic/30',
  normal: 'bg-muted text-muted-foreground border-border',
}

function isPercentStat(type: StatType): boolean {
  return ['hp%', 'atk%', 'def%', 'cr', 'cd', 'res', 'acc'].includes(type)
}

function formatRollValue(type: StatType, value: number): string {
  return isPercentStat(type) ? `${value}%` : `${value}`
}

function getSynergyBadgeClass(matchCount: number): string {
  if (matchCount >= 4) return 'bg-ga-roll-legend/15 border-ga-roll-legend/40 text-ga-roll-legend'
  if (matchCount >= 3) return 'bg-success/15 border-success/40 text-success-foreground'
  return 'bg-muted border-border text-muted-foreground'
}

interface RuneCardGamingProps {
  rune: RuneData
  analysis?: RuneAnalysis
  confidence?: number
}

export function RuneCardGaming({ rune, analysis, confidence }: RuneCardGamingProps) {
  const t = useTranslations('labels')
  const tRune = useTranslations('rune')

  const quality = rune.quality ?? 'normal'
  const rollQualityTier = analysis?.rollQualityTier ?? 'normal'
  const rollQualityPostGem = analysis?.rollQualityPostGem ?? 'normal'
  const advice = analysis?.progressiveAdvice

  return (
    <Div className={`relative rounded-xl border-2 overflow-hidden bg-gradient-to-b from-background via-background to-muted/30 ${QUALITY_BORDER[quality]}`}>
      {/* ── Background pattern ── */}
      <Div className="absolute inset-0 opacity-5 bg-[radial-gradient(circle_at_50%_0%,_rgba(255,255,255,0.2),_transparent_70%)]" />

      {/* ── Content ── */}
      <Div className="relative p-4 space-y-3">
        {/* ── Header: Set name + Stars ── */}
        <Div className="text-center space-y-1">
          <SetIconLarge set={rune.set} className="w-8 h-8" />
          <P className={`text-lg font-black uppercase tracking-wider ${QUALITY_GLOW[quality]}`}>
            {rune.set}
          </P>
          <Div className="flex items-center justify-center gap-1">
            {Array.from({ length: rune.grade }).map((_, i) => (
              <P key={i} className="text-ga-roll-legend text-sm animate-pulse" style={{ animationDelay: `${i * 100}ms` }}>
                {'\u2605'}
              </P>
            ))}
          </Div>
          <Div className="flex items-center justify-center gap-2">
            <Badge variant="outline" className="text-xs border-muted-foreground/30">Slot {rune.slot}</Badge>
            <Badge variant="secondary" className="text-xs">+{rune.level}</Badge>
            <Badge className={`border text-xs ${
              quality === 'legend' ? 'bg-ga-roll-legend/10 border-ga-roll-legend/30 text-ga-roll-legend' :
              quality === 'hero' ? 'bg-ga-roll-hero/10 border-ga-roll-hero/30 text-ga-roll-hero' :
              quality === 'rare' ? 'bg-ga-roll-rare/10 border-ga-roll-rare/30 text-ga-roll-rare' :
              quality === 'magic' ? 'bg-ga-roll-magic/10 border-ga-roll-magic/30 text-ga-roll-magic' :
              'bg-muted text-muted-foreground'
            }`}>
              {tRune(`quality.${quality}`)}
            </Badge>
          </Div>
        </Div>

        {/* ── Advice (prominent, centered, with glow) ── */}
        {advice && (
          <Div className={`rounded-lg p-3 text-center ${ADVICE_GAMING[advice.action].bg} ${ADVICE_GAMING[advice.action].glow}`}>
            <P className={`text-2xl font-black tracking-widest ${ADVICE_GAMING[advice.action].text}`}>
              {ADVICE_ICONS[advice.action]} {advice.action.toUpperCase()}
              {advice.action === 'sell'
                ? (advice.sellProbability > 0 ? ` \u2014 ${tRune('sellRisk', { percent: String(advice.sellProbability) })}` : '')
                : (advice.sellProbability > 0 ? ` \u2014 ${tRune('keepChance', { percent: String(100 - advice.sellProbability) })}` : '')}
            </P>
            <P className="text-xs text-muted-foreground mt-1">
              {advice.reasonKey ? tRune(`adviceReason.${advice.reasonKey}`, advice.reasonParams ?? {}) : advice.reason}
            </P>
            {advice.nextCheckAt > 0 && (
              <P className="text-xs text-muted-foreground mt-0.5">
                {tRune('nextCheck', { level: String(advice.nextCheckAt) })}
              </P>
            )}
          </Div>
        )}

        {/* ── Main stat (big display) ── */}
        <Div className="text-center py-2 bg-muted/20 rounded-lg">
          <P className="text-xs text-muted-foreground uppercase tracking-wider">{t('mainStat')}</P>
          <P className="text-xl font-black text-foreground">
            {STAT_ICONS[rune.mainStat.type] ?? ''} {formatStatLabel(rune.mainStat.type)} {formatStatValue(rune.mainStat.type, rune.mainStat.value)}
          </P>
          {rune.innateStat && (
            <P className="text-xs text-muted-foreground mt-1">
              {STAT_ICONS[rune.innateStat.type] ?? ''} {formatStatLabel(rune.innateStat.type)} {formatStatValue(rune.innateStat.type, rune.innateStat.value)}
            </P>
          )}
        </Div>

        {/* ── Decorative separator ── */}
        <Div className="flex items-center gap-2">
          <Div className="flex-1 h-px bg-gradient-to-r from-transparent via-muted-foreground/30 to-transparent" />
          <P className="text-muted-foreground/50 text-xs">{'\u25C6'}</P>
          <Div className="flex-1 h-px bg-gradient-to-r from-transparent via-muted-foreground/30 to-transparent" />
        </Div>

        {/* ── Substats with HP-style bars ── */}
        <Div className="space-y-2">
          <P className="text-xs font-medium text-muted-foreground uppercase tracking-wider text-center">{t('subStats')}</P>
          {rune.subStats.map((stat, i) => {
            const subAnalysis = analysis?.substats.find(s => s.type === stat.type)
            const efficiency = subAnalysis?.efficiency ?? 0
            const breakdown = subAnalysis?.rollBreakdown
            return (
              <Div key={i} className="space-y-0.5">
                <Div className="flex items-center justify-between text-sm">
                  <Div className="flex items-center gap-1.5">
                    <P className="text-xs">{STAT_ICONS[stat.type] ?? ''}</P>
                    <P className="font-medium text-muted-foreground text-xs">{formatStatLabel(stat.type)}</P>
                    {subAnalysis?.isGemTarget && (
                      <Badge variant="outline" className="text-[8px] px-1 py-0 border-yellow-500/40 bg-yellow-500/10 text-yellow-500">
                        {tRune('gemable')}
                      </Badge>
                    )}
                  </Div>
                  <Div className="flex items-center gap-2">
                    <P className={`font-bold text-sm ${subAnalysis ? getRollQualityColor(subAnalysis.efficiency) : 'text-foreground'}`}>
                      {formatStatValue(stat.type, stat.value)}
                    </P>
                    {subAnalysis && (
                      <P className={`text-[10px] ${getRollQualityColor(subAnalysis.efficiency)}`}>
                        {subAnalysis.rolls}R
                      </P>
                    )}
                  </Div>
                </Div>
                {/* Roll breakdown badges */}
                {breakdown && breakdown.length > 0 && (
                  <Div className="flex items-center gap-1 pl-5">
                    {breakdown.map((roll, j) => (
                      <Badge key={j} variant="outline" className={`text-[9px] px-1 py-0 border ${ROLL_TIER_BG[roll.tier]}`}>
                        {formatRollValue(stat.type, roll.value)}
                      </Badge>
                    ))}
                  </Div>
                )}
                {/* HP-style bar */}
                <Div className="h-2 rounded-full bg-muted/50 overflow-hidden border border-border/50">
                  <Div
                    className={`h-full rounded-full transition-all duration-500 ${
                      efficiency >= 90 ? 'bg-gradient-to-r from-ga-roll-legend/80 to-ga-roll-legend' :
                      efficiency >= 75 ? 'bg-gradient-to-r from-ga-roll-hero/80 to-ga-roll-hero' :
                      efficiency >= 50 ? 'bg-gradient-to-r from-ga-roll-rare/80 to-ga-roll-rare' :
                      efficiency >= 25 ? 'bg-gradient-to-r from-ga-roll-magic/80 to-ga-roll-magic' :
                      'bg-gradient-to-r from-ga-roll-normal/80 to-ga-roll-normal'
                    }`}
                    style={{ width: `${Math.min(efficiency, 100)}%` }}
                  />
                </Div>
              </Div>
            )
          })}
        </Div>

        {/* ── Efficiency display (gaming style) ── */}
        {analysis && (
          <>
            <Div className="flex items-center gap-2">
              <Div className="flex-1 h-px bg-gradient-to-r from-transparent via-muted-foreground/30 to-transparent" />
              <P className="text-muted-foreground/50 text-xs">{'\u25C6'}</P>
              <Div className="flex-1 h-px bg-gradient-to-r from-transparent via-muted-foreground/30 to-transparent" />
            </Div>

            <Div className="text-center space-y-1">
              <P className="text-xs text-muted-foreground uppercase tracking-wider">{tRune('rollQualityTitle')}</P>
              <Div className="space-y-1">
                <P className="text-[10px] text-muted-foreground uppercase">{tRune('currentRolls')}</P>
                <P className={`text-3xl font-black ${ROLL_QUALITY_COLORS[rollQualityTier]} drop-shadow-[0_0_10px_currentColor]`}>
                  {analysis.rollQualityPercent}%
                </P>
                <P className={`text-sm font-bold ${ROLL_QUALITY_COLORS[rollQualityTier]}`}>
                  {tRune(`rollQuality.${rollQualityTier}`)}
                </P>
              </Div>
              {rollQualityPostGem !== rollQualityTier && (
                <Div className="space-y-0.5 mt-1">
                  <P className="text-[10px] text-muted-foreground uppercase">{tRune('afterGemRolls')}</P>
                  <P className={`text-lg font-bold ${ROLL_QUALITY_COLORS[rollQualityPostGem]}`}>
                    {tRune(`rollQuality.${rollQualityPostGem}`)} ({analysis.rollQualityPostGemPercent}%)
                  </P>
                </Div>
              )}
            </Div>

            {/* Efficiency grid */}
            <Div className="grid grid-cols-2 gap-2">
              {analysis.potentialEfficiency !== undefined && (
                <Div className="bg-muted/20 rounded-lg p-2 text-center">
                  <P className="text-[10px] text-muted-foreground uppercase">{tRune('potential12')}</P>
                  <P className="text-sm font-bold">{analysis.potentialEfficiency}%</P>
                </Div>
              )}
              {analysis.grindedEfficiency !== undefined && (
                <Div className="bg-muted/20 rounded-lg p-2 text-center">
                  <P className="text-[10px] text-muted-foreground uppercase">{tRune('afterGrind')}</P>
                  <P className="text-sm font-bold">
                    {analysis.grindedEfficiency}%
                    {analysis.grindGain !== undefined && analysis.grindGain > 0 && (
                      <span className="text-green-500 text-xs ml-1">(+{analysis.grindGain}%)</span>
                    )}
                  </P>
                </Div>
              )}
            </Div>
          </>
        )}

        {/* ── Synergy badges ── */}
        {analysis?.synergy && (() => {
          const matchingArchetypes = (analysis.synergy.allArchetypes ?? [])
            .filter(a => a.matchCount >= 3)
            .sort((a, b) => b.matchCount - a.matchCount)

          if (matchingArchetypes.length === 0 && analysis.synergy.synergyBonus < 0) {
            return (
              <Div className="text-center">
                <P className="text-sm text-red-500">{tRune('noSynergy')} ({analysis.synergy.synergyBonus}%)</P>
              </Div>
            )
          }

          if (matchingArchetypes.length === 0) return null

          return (
            <Div className="space-y-2">
              <P className="text-xs font-medium text-muted-foreground uppercase tracking-wider text-center">{tRune('synergy')}</P>
              <Div className="flex flex-wrap gap-2 justify-center">
                {matchingArchetypes.map(arch => {
                  const archKey = arch.archetype as BuildArchetype
                  const emoji = BUILD_ARCHETYPES[archKey]?.emoji ?? ''
                  return (
                    <Badge
                      key={archKey}
                      variant="outline"
                      className={`cursor-default text-xs px-2 py-0.5 ${getSynergyBadgeClass(arch.matchCount)}`}
                    >
                      {emoji} {tRune(`archetype.${archKey}`)} {arch.matchCount}/4
                    </Badge>
                  )
                })}
              </Div>
            </Div>
          )
        })()}

        {/* ── Monster suggestions ── */}
        {analysis?.synergy && (() => {
          const suggestedArchetypes = (analysis.synergy.allArchetypes ?? [])
            .filter(a => a.matchCount >= 3)
            .map(a => a.archetype)
          if (suggestedArchetypes.length === 0) return null
          return <MonsterSuggestions archetypes={suggestedArchetypes} />
        })()}

        {/* ── Set bonus ── */}
        {analysis && (
          <Div className="text-center text-xs text-muted-foreground">
            <P>{analysis.setBonus} ({analysis.setPieces} pcs)</P>
          </Div>
        )}

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
      </Div>
    </Div>
  )
}

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
import { useTranslations } from 'next-intl'
import type {
  RuneData,
  RuneAnalysis,
  StatType,
  RuneQuality,
  ProgressiveAction,
  RollBreakdown,
  StatTier,
} from '@gacha-analyzer/types'
import { SET_STAT_TIERS } from '@gacha-analyzer/types'
import { GEM_ICONS } from '../config/game-assets'
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
  hp: '\u2764\uFE0F',
  'hp%': '\u2764\uFE0F',
  atk: '\u2694\uFE0F',
  'atk%': '\u2694\uFE0F',
  def: '\uD83D\uDEE1\uFE0F',
  'def%': '\uD83D\uDEE1\uFE0F',
  spd: '\uD83D\uDCA8',
  cr: '\uD83C\uDFAF',
  cd: '\uD83D\uDCA5',
  res: '\uD83D\uDE4F',
  acc: '\uD83D\uDD2D',
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

const STAT_TIER_COLORS: Record<StatTier, string> = {
  S: 'bg-ga-roll-legend/20 text-ga-roll-legend border-ga-roll-legend/40',
  A: 'bg-ga-roll-hero/20 text-ga-roll-hero border-ga-roll-hero/40',
  B: 'bg-ga-roll-rare/20 text-ga-roll-rare border-ga-roll-rare/40',
  C: 'bg-muted/30 text-muted-foreground border-border/40',
  D: 'bg-destructive/10 text-destructive border-destructive/30',
}

function isPercentStat(type: StatType): boolean {
  return ['hp%', 'atk%', 'def%', 'cr', 'cd', 'res', 'acc'].includes(type)
}

function formatRollValue(type: StatType, value: number): string {
  return isPercentStat(type) ? `${value}%` : `${value}`
}

// ── Innate tier badge — S/A en innate = malus (stat gâchée, non grindable), D = stat morte ──
const INNATE_TIER_MALUS: Record<StatTier, string> = {
  S: 'bg-destructive/15 text-destructive border-destructive/40',
  A: 'bg-destructive/15 text-destructive border-destructive/40',
  B: 'bg-ga-roll-rare/20 text-ga-roll-rare border-ga-roll-rare/40',
  C: 'bg-muted/30 text-muted-foreground border-border/40',
  D: 'bg-destructive/10 text-destructive border-destructive/30',
}

/** Récupère le tier d'une stat pour un set donné */
function getStatTier(set: string, stat: string): StatTier {
  return SET_STAT_TIERS[set]?.[stat as StatType] ?? 'C'
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
    <Div
      className={`relative rounded-xl border-2 overflow-hidden bg-gradient-to-b from-background via-background to-muted/30 ${QUALITY_BORDER[quality]}`}
    >
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
              <P
                key={i}
                className="text-ga-roll-legend text-sm animate-pulse"
                style={{ animationDelay: `${i * 100}ms` }}
              >
                {'\u2605'}
              </P>
            ))}
          </Div>
          <Div className="flex items-center justify-center gap-2">
            <Badge variant="outline" className="text-xs border-muted-foreground/30">
              Slot {rune.slot}
            </Badge>
            <Badge variant="secondary" className="text-xs">
              +{rune.level}
            </Badge>
            <Badge
              className={`border text-xs ${
                quality === 'legend'
                  ? 'bg-ga-roll-legend/10 border-ga-roll-legend/30 text-ga-roll-legend'
                  : quality === 'hero'
                    ? 'bg-ga-roll-hero/10 border-ga-roll-hero/30 text-ga-roll-hero'
                    : quality === 'rare'
                      ? 'bg-ga-roll-rare/10 border-ga-roll-rare/30 text-ga-roll-rare'
                      : quality === 'magic'
                        ? 'bg-ga-roll-magic/10 border-ga-roll-magic/30 text-ga-roll-magic'
                        : 'bg-muted text-muted-foreground'
              }`}
            >
              {tRune(`quality.${quality}`)}
            </Badge>
            {rune.isAncient && (
              <Badge className="border text-xs bg-warning/20 text-warning border-warning/40">
                {tRune('ancient')}
              </Badge>
            )}
          </Div>
        </Div>

        {/* ── Advice (prominent, centered, with glow) ── */}
        {advice && (
          <Div
            className={`rounded-lg p-3 text-center ${ADVICE_GAMING[advice.action].bg} ${ADVICE_GAMING[advice.action].glow}`}
          >
            <P
              className={`text-2xl font-black tracking-widest ${ADVICE_GAMING[advice.action].text}`}
            >
              {ADVICE_ICONS[advice.action]} {advice.action.toUpperCase()}
              {advice.action === 'sell'
                ? advice.sellProbability > 0
                  ? ` \u2014 ${tRune('sellRisk', { percent: String(advice.sellProbability) })}`
                  : ''
                : advice.sellProbability > 0
                  ? ` \u2014 ${tRune('keepChance', { percent: String(100 - advice.sellProbability) })}`
                  : ''}
            </P>
            <P className="text-xs text-muted-foreground mt-1">
              {advice.reasonKey
                ? tRune(`adviceReason.${advice.reasonKey}`, advice.reasonParams ?? {})
                : advice.reason}
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
            {STAT_ICONS[rune.mainStat.type] ?? ''} {formatStatLabel(rune.mainStat.type)}{' '}
            {formatStatValue(rune.mainStat.type, rune.mainStat.value)}
          </P>
          {rune.innateStat &&
            (() => {
              const innateTier = getStatTier(rune.set, rune.innateStat.type)
              const isInnateMalus = innateTier === 'S' || innateTier === 'A' || innateTier === 'D'
              return (
                <Div className="flex items-center justify-center gap-1.5 mt-1">
                  <P className="text-xs text-muted-foreground">
                    {STAT_ICONS[rune.innateStat.type] ?? ''} {formatStatLabel(rune.innateStat.type)}{' '}
                    {formatStatValue(rune.innateStat.type, rune.innateStat.value)}
                  </P>
                  <Badge
                    variant="outline"
                    className={`text-[8px] px-1 py-0 font-bold ${INNATE_TIER_MALUS[innateTier]}`}
                  >
                    {isInnateMalus && '\u26A0\uFE0F'}
                    {innateTier}
                  </Badge>
                </Div>
              )
            })()}
        </Div>

        {/* ── Decorative separator ── */}
        <Div className="flex items-center gap-2">
          <Div className="flex-1 h-px bg-gradient-to-r from-transparent via-muted-foreground/30 to-transparent" />
          <P className="text-muted-foreground/50 text-xs">{'\u25C6'}</P>
          <Div className="flex-1 h-px bg-gradient-to-r from-transparent via-muted-foreground/30 to-transparent" />
        </Div>

        {/* ── Substats with HP-style bars ── */}
        <Div className="space-y-2">
          <P className="text-xs font-medium text-muted-foreground uppercase tracking-wider text-center">
            {t('subStats')}
          </P>
          {rune.subStats.map((stat, i) => {
            const subAnalysis = analysis?.substats.find(s => s.type === stat.type)
            const efficiency = subAnalysis?.efficiency ?? 0
            const breakdown = subAnalysis?.rollBreakdown
            return (
              <Div key={i} className="space-y-0.5">
                <Div className="flex items-center justify-between text-sm">
                  <Div className="flex items-center gap-1.5">
                    <P className="text-xs">{STAT_ICONS[stat.type] ?? ''}</P>
                    <P className="font-medium text-muted-foreground text-xs">
                      {formatStatLabel(stat.type)}
                    </P>
                    {analysis?.subStatTiers?.[stat.type] && (
                      <Badge
                        variant="outline"
                        className={`text-[8px] px-1 py-0 font-bold ${STAT_TIER_COLORS[analysis.subStatTiers[stat.type] as StatTier]}`}
                      >
                        {analysis.subStatTiers[stat.type]}
                      </Badge>
                    )}
                    {subAnalysis?.isGemTarget && (
                      <Badge
                        variant="outline"
                        className="text-[8px] px-1 py-0 border-warning/40 bg-warning/10 text-warning-foreground"
                      >
                        <img src={GEM_ICONS.legend} alt="gem" className="w-3 h-3 inline" />
                        gem target
                      </Badge>
                    )}
                  </Div>
                  <Div className="flex items-center gap-2">
                    <P
                      className={`font-bold text-sm ${subAnalysis ? getRollQualityColor(subAnalysis.efficiency) : 'text-foreground'}`}
                    >
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
                      <Badge
                        key={j}
                        variant="outline"
                        className={`text-[9px] px-1 py-0 border ${ROLL_TIER_BG[roll.tier]}`}
                      >
                        {formatRollValue(stat.type, roll.value)}
                      </Badge>
                    ))}
                  </Div>
                )}
                {/* HP-style bar */}
                <Div className="h-2 rounded-full bg-muted/50 overflow-hidden border border-border/50">
                  <Div
                    className={`h-full rounded-full transition-all duration-500 ${
                      efficiency >= 90
                        ? 'bg-gradient-to-r from-ga-roll-legend/80 to-ga-roll-legend'
                        : efficiency >= 75
                          ? 'bg-gradient-to-r from-ga-roll-hero/80 to-ga-roll-hero'
                          : efficiency >= 50
                            ? 'bg-gradient-to-r from-ga-roll-rare/80 to-ga-roll-rare'
                            : efficiency >= 25
                              ? 'bg-gradient-to-r from-ga-roll-magic/80 to-ga-roll-magic'
                              : 'bg-gradient-to-r from-ga-roll-normal/80 to-ga-roll-normal'
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
              <P className="text-xs text-muted-foreground uppercase tracking-wider">
                {tRune('rollQualityTitle')}
              </P>
              <Div className="space-y-1">
                <P className="text-[10px] text-muted-foreground uppercase">
                  {tRune('currentRolls')}
                </P>
                <P
                  className={`text-3xl font-black ${ROLL_QUALITY_COLORS[rollQualityTier]} drop-shadow-[0_0_10px_currentColor]`}
                >
                  {analysis.rollQualityPercent}%
                </P>
                <P className={`text-sm font-bold ${ROLL_QUALITY_COLORS[rollQualityTier]}`}>
                  {tRune(`rollQuality.${rollQualityTier}`)}
                </P>
              </Div>
              {rollQualityPostGem !== rollQualityTier && (
                <Div className="space-y-0.5 mt-1">
                  <P className="text-[10px] text-muted-foreground uppercase">
                    {tRune('afterGemRolls')}
                  </P>
                  <P className={`text-lg font-bold ${ROLL_QUALITY_COLORS[rollQualityPostGem]}`}>
                    {tRune(`rollQuality.${rollQualityPostGem}`)} (
                    {analysis.rollQualityPostGemPercent}%)
                  </P>
                </Div>
              )}
            </Div>

            {/* Efficiency grid */}
            <Div className="grid grid-cols-2 gap-2">
              {analysis.setWeightedEfficiency !== undefined && (
                <Div className="bg-muted/20 rounded-lg p-2 text-center border border-ga-roll-legend/20">
                  <P className="text-[10px] text-muted-foreground uppercase">
                    {tRune('setEfficiency')}
                  </P>
                  <P className="text-sm font-bold text-ga-roll-legend">
                    {analysis.setWeightedEfficiency}%
                  </P>
                </Div>
              )}
              {analysis.potentialEfficiency !== undefined && (
                <Div className="bg-muted/20 rounded-lg p-2 text-center">
                  <P className="text-[10px] text-muted-foreground uppercase">
                    {tRune('potential12')}
                  </P>
                  <P className="text-sm font-bold">{analysis.potentialEfficiency}%</P>
                </Div>
              )}
              {analysis.grindedEfficiency !== undefined && (
                <Div className="bg-muted/20 rounded-lg p-2 text-center">
                  <P className="text-[10px] text-muted-foreground uppercase">
                    {tRune('afterGrind')}
                  </P>
                  <P className="text-sm font-bold">
                    {analysis.grindedEfficiency}%
                    {analysis.grindGain !== undefined && analysis.grindGain > 0 && (
                      <Span className="text-success-foreground text-xs ml-1">
                        (+{analysis.grindGain}%)
                      </Span>
                    )}
                  </P>
                </Div>
              )}
            </Div>
          </>
        )}

        {/* ── Set bonus ── */}
        {analysis && (
          <Div className="text-center text-xs text-muted-foreground">
            <P>
              {analysis.setBonus} ({analysis.setPieces} pcs)
            </P>
          </Div>
        )}

        {/* ── OCR Confidence ── */}
        {confidence !== undefined && (
          <Div className="flex justify-end">
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Div className="flex items-center gap-1 cursor-default">
                    <Div
                      className={`h-1.5 w-1.5 rounded-full ${
                        confidence >= 80
                          ? 'bg-success'
                          : confidence >= 50
                            ? 'bg-warning'
                            : 'bg-destructive'
                      }`}
                    />
                    <P className="text-[10px] text-muted-foreground">{Math.round(confidence)}%</P>
                  </Div>
                </TooltipTrigger>
                <TooltipContent>
                  <P className="text-xs">
                    {tRune('ocrConfidence')}: {Math.round(confidence)}%
                  </P>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </Div>
        )}
      </Div>
    </Div>
  )
}

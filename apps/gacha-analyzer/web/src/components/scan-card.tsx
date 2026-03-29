'use client'

import { Badge, Card, CardContent, Div, P, Span } from '@ezstart/ui/components'
import { useTranslations } from 'next-intl'
import Image from 'next/image'
import Link from 'next/link'
import type { Scan, RuneQuality, StatType, RuneAnalysis } from '@gacha-analyzer/types'
import { GAME_CONFIG } from '@/config/games'
import { SetIcon } from './rune-card-utils'

interface ScanCardProps {
  scan: Scan
}

const QUALITY_BADGE: Record<RuneQuality, string> = {
  legend: 'bg-ga-roll-legend/10 border-ga-roll-legend/30 text-ga-roll-legend',
  hero: 'bg-ga-roll-hero/10 border-ga-roll-hero/30 text-ga-roll-hero',
  rare: 'bg-ga-roll-rare/10 border-ga-roll-rare/30 text-ga-roll-rare',
  magic: 'bg-ga-roll-magic/10 border-ga-roll-magic/30 text-ga-roll-magic',
  normal: 'bg-muted text-muted-foreground',
}

const ADVICE_COLORS: Record<string, string> = {
  sell: 'text-destructive-foreground bg-destructive/20 border-destructive/40',
  upgrade: 'text-ga-roll-rare bg-ga-roll-rare/20 border-ga-roll-rare/40',
  keep: 'text-success-foreground bg-success/20 border-success/40',
  grind: 'text-ga-roll-hero bg-ga-roll-hero/20 border-ga-roll-hero/40',
}

const statusVariantMap: Record<string, 'default' | 'secondary' | 'destructive' | 'outline'> = {
  completed: 'default',
  processing: 'secondary',
  pending: 'outline',
  failed: 'destructive',
}

function formatStatValue(type: StatType, value: number): string {
  const percentStats: StatType[] = ['hp%', 'atk%', 'def%', 'cr', 'cd', 'res', 'acc']
  return percentStats.includes(type) ? `${value}%` : `${value}`
}

export function ScanCard({ scan }: ScanCardProps) {
  const t = useTranslations()

  const date = new Date(scan.createdAt)
  const formattedDate = date.toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })

  const runeData = scan.result?.data && 'set' in scan.result.data ? scan.result.data : null
  const analysis = scan.result?.analysis as RuneAnalysis | undefined
  const advice = analysis?.progressiveAdvice as { action?: string } | undefined
  const quality = runeData?.quality ?? 'normal'

  return (
    <Link href={`/${scan.gameType}/scan/${scan.id}`}>
      <Card className="hover:bg-muted/50 transition-colors cursor-pointer">
        <CardContent className="py-2.5 px-3">
          {runeData ? (
            <Div className="space-y-0.5">
              {/* Row 1: Set icon + set name (slot) +level | Quality | Ancient | Confidence | Advice */}
              <Div className="flex items-center justify-between gap-2">
                <Div className="flex items-center gap-1.5 min-w-0">
                  <SetIcon set={runeData.set as string} className="w-5 h-5 shrink-0" />
                  <P className="text-sm font-medium capitalize truncate">
                    {runeData.set as string}
                    <Span className="text-muted-foreground"> ({runeData.slot})</Span> +
                    {runeData.level}
                  </P>
                  <Badge
                    className={`border text-[10px] px-1 py-0 shrink-0 ${QUALITY_BADGE[quality as RuneQuality] ?? QUALITY_BADGE.normal}`}
                  >
                    {quality.charAt(0).toUpperCase() + quality.slice(1)}
                  </Badge>
                  {runeData.isAncient && (
                    <Badge className="border text-[10px] px-1 py-0 shrink-0 bg-warning/20 text-warning border-warning/40">
                      {t('scanCard.ancient')}
                    </Badge>
                  )}
                </Div>
                <Div className="flex items-center gap-1.5 shrink-0">
                  {scan.result && (
                    <P className="text-[10px] text-muted-foreground">
                      {Math.round(scan.result.confidence)}%
                    </P>
                  )}
                  {scan.reports && scan.reports.some(r => r.status === 'open') && (
                    <Badge
                      variant="outline"
                      className="text-[10px] border bg-destructive/20 text-destructive border-destructive/40"
                    >
                      🐛
                    </Badge>
                  )}
                  {scan.feedback && (
                    <Badge
                      variant="outline"
                      className={`text-[10px] border ${scan.feedback.opinion === 'agree' ? 'bg-success/20 text-success-foreground border-success/40' : 'bg-destructive/20 text-destructive border-destructive/40'}`}
                    >
                      {scan.feedback.opinion === 'agree' ? '👍' : '👎'}
                    </Badge>
                  )}
                  {advice?.action ? (
                    <Badge
                      variant="outline"
                      className={`text-[10px] border ${ADVICE_COLORS[advice.action] ?? ''}`}
                    >
                      {advice.action.toUpperCase()}
                    </Badge>
                  ) : (
                    <Badge
                      variant={statusVariantMap[scan.status] || 'outline'}
                      className="text-[10px]"
                    >
                      {t(`status.${scan.status}`)}
                    </Badge>
                  )}
                </Div>
              </Div>

              {/* Row 2: Main stat | Substats summary | Set-weighted eff */}
              <Div className="flex items-center gap-1.5 text-[11px] text-muted-foreground pl-[26px]">
                {runeData.mainStat && (
                  <P className="text-foreground font-medium">
                    {(runeData.mainStat.type as string).toUpperCase().replace('%', '%')} +
                    {formatStatValue(runeData.mainStat.type, runeData.mainStat.value)}
                  </P>
                )}
                {runeData.subStats && runeData.subStats.length > 0 && (
                  <>
                    <Span className="text-border">|</Span>
                    <P className="truncate">
                      {runeData.subStats
                        .map((s: { type: StatType }) =>
                          (s.type as string).toUpperCase().replace('%', '%')
                        )
                        .join(' ')}
                    </P>
                  </>
                )}
                {analysis?.setWeightedEfficiency !== undefined && (
                  <>
                    <Span className="text-border">|</Span>
                    <P className="shrink-0 font-medium">
                      {t('scanCard.eff')}: {analysis.setWeightedEfficiency}%
                    </P>
                  </>
                )}
              </Div>

              {/* Row 3: Date */}
              <P className="text-[10px] text-muted-foreground pl-[26px]">{formattedDate}</P>
            </Div>
          ) : (
            /* Non-rune scan — fallback display */
            <Div className="flex items-center justify-between">
              <Div className="flex items-center gap-2">
                <Image
                  src={GAME_CONFIG[scan.gameType]?.logo ?? GAME_CONFIG['summoners-war']!.logo}
                  alt={t(`games.${scan.gameType}`)}
                  width={0}
                  height={0}
                  sizes="100vw"
                  style={{ width: 'auto', height: 'auto' }}
                  className="max-h-[24px] max-w-[80px] object-contain [filter:drop-shadow(0_0_6px_rgba(255,255,255,0.8))_drop-shadow(0_0_16px_rgba(255,255,255,0.3))]"
                />
                <P className="text-xs text-muted-foreground">{formattedDate}</P>
              </Div>
              <Badge variant={statusVariantMap[scan.status] || 'outline'} className="text-[10px]">
                {t(`status.${scan.status}`)}
              </Badge>
            </Div>
          )}
        </CardContent>
      </Card>
    </Link>
  )
}

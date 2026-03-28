'use client'

import { Badge, Card, CardContent, Div, P } from '@ezstart/ui/components'
import { useTranslations } from 'next-intl'
import Image from 'next/image'
import Link from 'next/link'
import type { Scan } from '@game-analyzer/types'
import { GAME_CONFIG } from '@/config/games'

interface ScanCardProps {
  scan: Scan
}

const statusVariantMap: Record<string, 'default' | 'secondary' | 'destructive' | 'outline'> = {
  completed: 'default',
  processing: 'secondary',
  pending: 'outline',
  failed: 'destructive',
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
  const analysis = scan.result?.analysis
  const advice = analysis?.progressiveAdvice as { action?: string } | undefined

  const ADVICE_COLORS: Record<string, string> = {
    sell: 'text-destructive-foreground bg-destructive/20 border-destructive/40',
    upgrade: 'text-ga-roll-rare bg-ga-roll-rare/20 border-ga-roll-rare/40',
    keep: 'text-success-foreground bg-success/20 border-success/40',
    grind: 'text-ga-roll-hero bg-ga-roll-hero/20 border-ga-roll-hero/40',
  }

  return (
    <Link href={`/${scan.gameType}/scan/${scan.id}`}>
      <Card className="hover:bg-muted/50 transition-colors cursor-pointer">
        <CardContent className="flex items-center justify-between py-3">
          <Div className="flex items-center gap-3">
            {runeData ? (
              <Div className="flex items-center gap-2">
                <img
                  src={`/images/games/summoners-war/runes/${runeData.set}.png`}
                  alt={runeData.set as string}
                  className="w-6 h-6"
                  onError={(e) => { (e.target as HTMLImageElement).style.display = 'none' }}
                />
                <Div>
                  <P className="text-sm font-medium capitalize">{runeData.set as string} <span className="text-muted-foreground">({runeData.slot})</span> +{runeData.level}</P>
                  <P className="text-[10px] text-muted-foreground">{formattedDate}</P>
                </Div>
              </Div>
            ) : (
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
            )}
          </Div>
          <Div className="flex items-center gap-2">
            {scan.result && (
              <P className="text-[10px] text-muted-foreground">
                {Math.round(scan.result.confidence)}%
              </P>
            )}
            {advice?.action ? (
              <Badge variant="outline" className={`text-[10px] border ${ADVICE_COLORS[advice.action] ?? ''}`}>
                {advice.action.toUpperCase()}
              </Badge>
            ) : (
              <Badge variant={statusVariantMap[scan.status] || 'outline'} className="text-[10px]">
                {t(`status.${scan.status}`)}
              </Badge>
            )}
          </Div>
        </CardContent>
      </Card>
    </Link>
  )
}

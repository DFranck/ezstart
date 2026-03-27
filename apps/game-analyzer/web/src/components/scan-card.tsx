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

  return (
    <Link href={`/${scan.gameType}/scan/${scan.id}`}>
      <Card className="hover:bg-muted/50 transition-colors cursor-pointer">
        <CardContent className="flex items-center justify-between py-4">
          <Div className="flex items-center gap-3">
            <Image
              src={GAME_CONFIG[scan.gameType]?.logo ?? GAME_CONFIG['summoners-war'].logo}
              alt={t(`games.${scan.gameType}`)}
              width={0}
              height={0}
              sizes="100vw"
              style={{ width: 'auto', height: 'auto' }}
              className="max-h-[28px] max-w-[100px] object-contain [filter:drop-shadow(0_0_6px_rgba(255,255,255,0.8))_drop-shadow(0_0_16px_rgba(255,255,255,0.3))]"
            />
            <Div>
              <P className="text-xs text-muted-foreground">{formattedDate}</P>
            </Div>
          </Div>
          <Div className="flex items-center gap-2">
            {scan.result && (
              <P className="text-xs text-muted-foreground">
                {Math.round(scan.result.confidence * 100)}%
              </P>
            )}
            <Badge variant={statusVariantMap[scan.status] || 'outline'}>
              {t(`status.${scan.status}`)}
            </Badge>
          </Div>
        </CardContent>
      </Card>
    </Link>
  )
}

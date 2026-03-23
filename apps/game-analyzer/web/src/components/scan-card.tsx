'use client'

import { Badge, Card, CardContent, Div, P } from '@ezstart/ui/components'
import { useTranslations } from 'next-intl'
import Link from 'next/link'
import type { Scan } from '@game-analyzer/types'

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
            <P className="text-2xl">{scan.gameType === 'summoners-war' ? '⚔️' : '🔫'}</P>
            <Div>
              <P className="font-medium text-sm">{t(`games.${scan.gameType}`)}</P>
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

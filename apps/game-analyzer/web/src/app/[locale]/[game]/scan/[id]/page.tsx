'use client'

import { Button, Card, CardContent, CardHeader, Div, H1, H2, P } from '@ezstart/ui/components'
import { useTranslations } from 'next-intl'
import Image from 'next/image'
import Link from 'next/link'
import { use, useState } from 'react'
import { useParams } from 'next/navigation'
import type { GameType } from '@game-analyzer/types'
import { RuneCardWithTemplate } from '@/components/rune-card-templates'
import type { RuneCardTemplate } from '@/components/rune-card-templates'
import { GearCard } from '@/components/gear-card'
import { StatDisplay } from '@/components/stat-display'
import { useScans } from '@/hooks/use-scans'
import { callApi } from '@/config/api'

interface ScanDetailPageProps {
  params: Promise<{ id: string; locale: string; game: string }>
}

export default function ScanDetailPage({ params }: ScanDetailPageProps) {
  const { id } = use(params)
  const routeParams = useParams()
  const game = routeParams.game as GameType
  const t = useTranslations()
  const { data: scans } = useScans()
  const [isDeleting, setIsDeleting] = useState(false)
  const [runeTemplate] = useState<RuneCardTemplate>(() => {
    if (typeof window === 'undefined') return 'compact'
    try {
      const saved = localStorage.getItem('game-analyzer-template')
      if (saved === 'compact' || saved === 'detailed' || saved === 'gaming') return saved
    } catch {}
    return 'compact'
  })

  const scan = scans?.find((s) => s.id === id)

  async function handleDelete() {
    if (!confirm(t('scanDetail.deleteConfirm'))) return
    setIsDeleting(true)
    try {
      await callApi(`/scans/${id}`, { method: 'DELETE' })
      window.history.back()
    } catch {
      setIsDeleting(false)
    }
  }

  if (!scan) {
    return (
      <Div className="container mx-auto px-4 py-8 max-w-2xl text-center">
        <P className="text-muted-foreground">{t('labels.noScans')}</P>
        <Button asChild variant="outline" className="mt-4">
          <Link href={`/${game}/scan`}>{t('actions.back')}</Link>
        </Button>
      </Div>
    )
  }

  return (
    <Div className="container mx-auto px-4 py-8 max-w-2xl space-y-6">
      {/* Header */}
      <Div className="flex items-center justify-between">
        <H1 className="text-2xl font-bold">{t('scanDetail.title')}</H1>
        <Button asChild variant="ghost" size="sm">
          <Link href={`/${game}/history`}>{t('actions.back')}</Link>
        </Button>
      </Div>

      {/* Scanned Image */}
      <Card>
        <CardHeader>
          <H2 className="text-lg font-medium">{t('scanDetail.scannedImage')}</H2>
        </CardHeader>
        <CardContent>
          <Div className="relative w-full aspect-video rounded-lg overflow-hidden bg-muted">
            <Image
              src={scan.imageUrl}
              alt="Scanned image"
              fill
              className="object-contain"
            />
          </Div>
        </CardContent>
      </Card>

      {/* Parsed Stats */}
      {scan.result && (
        <>
          <Card>
            <CardHeader>
              <H2 className="text-lg font-medium">{t('scanDetail.parsedStats')}</H2>
            </CardHeader>
            <CardContent>
              {scan.gameType === 'summoners-war' && 'set' in scan.result.data ? (
                <RuneCardWithTemplate rune={scan.result.data} confidence={scan.result.confidence} template={runeTemplate} />
              ) : 'manufacturer' in scan.result.data ? (
                <GearCard gear={scan.result.data} confidence={scan.result.confidence} />
              ) : null}
            </CardContent>
          </Card>

          {/* Confidence */}
          <Card>
            <CardHeader>
              <H2 className="text-lg font-medium">{t('scanDetail.confidenceScore')}</H2>
            </CardHeader>
            <CardContent>
              <StatDisplay
                label={t('labels.confidence')}
                value={`${Math.round(scan.result.confidence * 100)}%`}
              />
              <StatDisplay
                label={t('labels.processingTime')}
                value={`${scan.result.processingTimeMs}ms`}
              />
            </CardContent>
          </Card>
        </>
      )}

      {/* Delete */}
      <Button
        variant="destructive"
        className="w-full"
        onClick={handleDelete}
        disabled={isDeleting}
      >
        {t('actions.delete')}
      </Button>
    </Div>
  )
}

'use client'

import { Div, H1, P } from '@ezstart/ui/components'
import { useTranslations } from 'next-intl'
import { useState } from 'react'
import type { GameType } from '@game-analyzer/types'
import { GameSelector } from '@/components/game-selector'
import { ScanUploader } from '@/components/scan-uploader'
import { RuneCard } from '@/components/rune-card'
import { GearCard } from '@/components/gear-card'
import { useScan } from '@/hooks/use-scan'

export default function ScanPage() {
  const t = useTranslations()
  const [selectedGame, setSelectedGame] = useState<GameType | null>(null)
  const { mutate: scan, data: scanResult, isPending, reset } = useScan()

  function handleImageSelected(file: File) {
    if (!selectedGame) return
    reset()
    scan({ image: file, gameType: selectedGame })
  }

  return (
    <Div className="container mx-auto px-4 py-8 max-w-2xl">
      <Div className="mb-8">
        <H1 className="text-2xl font-bold mb-2">{t('scan.title')}</H1>
      </Div>

      {/* Game Selection */}
      <Div className="mb-6">
        <P className="text-sm font-medium mb-3">{t('scan.selectGame')}</P>
        <GameSelector value={selectedGame} onChange={setSelectedGame} />
      </Div>

      {/* Upload */}
      {selectedGame && (
        <Div className="mb-6">
          <P className="text-sm font-medium mb-3">{t('scan.uploadImage')}</P>
          <ScanUploader onImageSelected={handleImageSelected} isLoading={isPending} />
        </Div>
      )}

      {/* Loading state */}
      {isPending && (
        <Div className="text-center py-8">
          <Div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4" />
          <P className="text-muted-foreground">{t('scan.scanning')}</P>
        </Div>
      )}

      {/* Result */}
      {scanResult?.result && (
        <Div className="space-y-4">
          <H1 className="text-xl font-semibold">{t('scan.result')}</H1>
          {selectedGame === 'summoners-war' && 'set' in scanResult.result.data ? (
            <RuneCard rune={scanResult.result.data} confidence={scanResult.result.confidence} />
          ) : 'manufacturer' in scanResult.result.data ? (
            <GearCard gear={scanResult.result.data} confidence={scanResult.result.confidence} />
          ) : null}
        </Div>
      )}
    </Div>
  )
}

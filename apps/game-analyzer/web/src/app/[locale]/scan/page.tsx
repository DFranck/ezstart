'use client'

import {
  Div,
  H1,
  P,
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '@ezstart/ui/components'
import { useTranslations } from 'next-intl'
import { useCallback, useRef, useState } from 'react'
import type { GameType, Scan } from '@game-analyzer/types'
import { GameSelector } from '@/components/game-selector'
import { ScanUploader } from '@/components/scan-uploader'
import { RuneCard } from '@/components/rune-card'
import { GearCard } from '@/components/gear-card'
import { CapturePreview } from '@/components/capture-preview'
import { EfficiencyDisplay } from '@/components/efficiency-display'
import { useScan } from '@/hooks/use-scan'
import { useScreenCapture } from '@/hooks/use-screen-capture'
import { useFrameDiff } from '@/hooks/use-frame-diff'

function canvasFromImageData(imageData: ImageData): HTMLCanvasElement {
  const canvas = document.createElement('canvas')
  canvas.width = imageData.width
  canvas.height = imageData.height
  const ctx = canvas.getContext('2d')
  if (ctx) ctx.putImageData(imageData, 0, 0)
  return canvas
}

async function imageDataToBlob(imageData: ImageData): Promise<Blob> {
  const canvas = canvasFromImageData(imageData)
  return new Promise((resolve) => {
    canvas.toBlob(
      (blob) => resolve(blob ?? new Blob()),
      'image/png'
    )
  })
}

export default function ScanPage() {
  const t = useTranslations()
  const [selectedGame, setSelectedGame] = useState<GameType | null>(null)
  const [mode, setMode] = useState<'capture' | 'upload'>('capture')
  const { mutate: scan, data: scanResult, isPending, reset } = useScan()

  // Track whether an auto-scan is in progress to avoid overlapping requests
  const scanningRef = useRef(false)

  const handleSignificantChange = useCallback(
    (frame: ImageData) => {
      if (!selectedGame || scanningRef.current) return

      scanningRef.current = true

      imageDataToBlob(frame).then((blob) => {
        const file = new File([blob], 'capture.png', { type: 'image/png' })
        reset()
        scan(
          { image: file, gameType: selectedGame },
          { onSettled: () => { scanningRef.current = false } }
        )
      })
    },
    [selectedGame, scan, reset]
  )

  const { diffScore, isStable, processFrame } = useFrameDiff({
    onSignificantChange: handleSignificantChange,
  })

  const handleFrame = useCallback(
    (frame: ImageData) => {
      processFrame(frame)
    },
    [processFrame]
  )

  const {
    isCapturing,
    isSupported,
    startCapture,
    stopCapture,
    error: captureError,
    currentFrame,
  } = useScreenCapture({
    frameInterval: 500,
    onFrame: handleFrame,
  })

  function handleImageSelected(file: File) {
    if (!selectedGame) return
    reset()
    scan({ image: file, gameType: selectedGame })
  }

  const isAnalyzing = isPending || (!isStable && isCapturing)

  const resultData = scanResult?.result

  return (
    <Div className="container mx-auto px-4 py-8 max-w-4xl">
      <Div className="mb-8">
        <H1 className="text-2xl font-bold mb-2">{t('scan.title')}</H1>
      </Div>

      {/* Game Selection */}
      <Div className="mb-6">
        <P className="text-sm font-medium mb-3">{t('scan.selectGame')}</P>
        <GameSelector value={selectedGame} onChange={setSelectedGame} />
      </Div>

      {/* Mode Tabs */}
      {selectedGame && (
        <Tabs value={mode} onValueChange={(v) => setMode(v as 'capture' | 'upload')}>
          <TabsList className="mb-6">
            <TabsTrigger value="capture">{t('scan.mode.capture')}</TabsTrigger>
            <TabsTrigger value="upload">{t('scan.mode.upload')}</TabsTrigger>
          </TabsList>

          {/* Capture Mode */}
          <TabsContent value="capture">
            <Div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Left: Preview */}
              <CapturePreview
                isCapturing={isCapturing}
                isAnalyzing={isAnalyzing}
                isSupported={isSupported}
                currentFrame={currentFrame}
                error={captureError}
                onStart={startCapture}
                onStop={stopCapture}
              />

              {/* Right: Result */}
              <Div className="space-y-4">
                {isPending && (
                  <Div className="text-center py-8">
                    <Div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4" />
                    <P className="text-muted-foreground">{t('scan.scanning')}</P>
                  </Div>
                )}

                {resultData && (
                  <>
                    {selectedGame === 'summoners-war' && 'set' in resultData.data ? (
                      <>
                        <RuneCard rune={resultData.data} confidence={resultData.confidence} />
                        <EfficiencyDisplay rune={resultData.data} confidence={resultData.confidence} />
                      </>
                    ) : 'manufacturer' in resultData.data ? (
                      <GearCard gear={resultData.data} confidence={resultData.confidence} />
                    ) : null}
                  </>
                )}

                {!resultData && !isPending && isCapturing && (
                  <Div className="text-center py-8">
                    <P className="text-muted-foreground text-sm">{t('scan.capture.waitingForChange')}</P>
                  </Div>
                )}
              </Div>
            </Div>
          </TabsContent>

          {/* Upload Mode */}
          <TabsContent value="upload">
            <Div className="max-w-2xl">
              <Div className="mb-6">
                <P className="text-sm font-medium mb-3">{t('scan.uploadImage')}</P>
                <ScanUploader onImageSelected={handleImageSelected} isLoading={isPending} />
              </Div>

              {/* Loading state */}
              {isPending && (
                <Div className="text-center py-8">
                  <Div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4" />
                  <P className="text-muted-foreground">{t('scan.scanning')}</P>
                </Div>
              )}

              {/* Result */}
              {resultData && (
                <Div className="space-y-4">
                  <H1 className="text-xl font-semibold">{t('scan.result')}</H1>
                  {selectedGame === 'summoners-war' && 'set' in resultData.data ? (
                    <>
                      <RuneCard rune={resultData.data} confidence={resultData.confidence} />
                      <EfficiencyDisplay rune={resultData.data} confidence={resultData.confidence} />
                    </>
                  ) : 'manufacturer' in resultData.data ? (
                    <GearCard gear={resultData.data} confidence={resultData.confidence} />
                  ) : null}
                </Div>
              )}
            </Div>
          </TabsContent>
        </Tabs>
      )}
    </Div>
  )
}

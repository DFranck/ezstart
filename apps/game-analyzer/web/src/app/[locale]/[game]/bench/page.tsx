'use client'

import {
  Button,
  Div,
  H1,
  H2,
  P,
} from '@ezstart/ui/components'
import { useTranslations } from 'next-intl'
import { useParams } from 'next/navigation'
import { useCallback, useEffect, useRef, useState } from 'react'
import type { GameType } from '@game-analyzer/types'
import type { RoiRect } from '@/components/roi-selector'
import { CapturePreview } from '@/components/capture-preview'
import { OcrDebugPanel } from '@/components/ocr-debug-panel'
import { RuneCard } from '@/components/rune-card'
import { GearCard } from '@/components/gear-card'
import { ScanResultRaw } from '@/components/scan-result-raw'
import { ProfileSelector, usePlayerProfile } from '@/components/profile-selector'
import { preprocessForOcr } from '@/utils/image-preprocessing'
import { useScan } from '@/hooks/use-scan'
import { useScreenCapture } from '@/hooks/use-screen-capture'
import { useFrameDiff } from '@/hooks/use-frame-diff'

/** Default ROI: top-right area where SW displays the rune */
const DEFAULT_ROI: RoiRect = { x: 60, y: 5, width: 35, height: 40 }

function loadRoi(gameType: GameType): RoiRect {
  if (typeof window === 'undefined') return DEFAULT_ROI
  try {
    const saved = localStorage.getItem(`game-analyzer-roi-${gameType}`)
    if (saved) return JSON.parse(saved)
  } catch {}
  return DEFAULT_ROI
}

function canvasFromImageData(imageData: ImageData): HTMLCanvasElement {
  const canvas = document.createElement('canvas')
  canvas.width = imageData.width
  canvas.height = imageData.height
  const ctx = canvas.getContext('2d')
  if (ctx) ctx.putImageData(imageData, 0, 0)
  return canvas
}

function cropImageData(imageData: ImageData, roi: RoiRect): ImageData {
  const srcCanvas = canvasFromImageData(imageData)

  const sx = Math.round((roi.x / 100) * imageData.width)
  const sy = Math.round((roi.y / 100) * imageData.height)
  const sw = Math.round((roi.width / 100) * imageData.width)
  const sh = Math.round((roi.height / 100) * imageData.height)

  const cropCanvas = document.createElement('canvas')
  cropCanvas.width = sw
  cropCanvas.height = sh
  const ctx = cropCanvas.getContext('2d')
  if (!ctx) return imageData

  ctx.drawImage(srcCanvas, sx, sy, sw, sh, 0, 0, sw, sh)
  return ctx.getImageData(0, 0, sw, sh)
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

export default function BenchPage() {
  const t = useTranslations()
  const params = useParams()
  const game = params.game as GameType

  const [profile, setProfile] = usePlayerProfile(game)
  const [roi, setRoi] = useState<RoiRect>(() => loadRoi(game))
  const [ocrPreviews, setOcrPreviews] = useState<{ name: string; dataUrl: string }[]>([])
  const [presetsSaved, setPresetsSaved] = useState(false)
  const { mutate: scan, data: scanResult, isPending, reset } = useScan()

  const roiRef = useRef<RoiRect>(roi)
  const fullFrameRef = useRef<ImageData | null>(null)
  const scanningRef = useRef(false)

  const handleRoiChange = useCallback((newRoi: RoiRect) => {
    setRoi(newRoi)
    roiRef.current = newRoi
    localStorage.setItem(`game-analyzer-roi-${game}`, JSON.stringify(newRoi))
  }, [game])

  useEffect(() => {
    const savedRoi = loadRoi(game)
    setRoi(savedRoi)
    roiRef.current = savedRoi
  }, [game])

  const runBenchScan = useCallback(
    (frame: ImageData) => {
      if (scanningRef.current) return
      scanningRef.current = true

      const processed = preprocessForOcr(frame, { scale: 2, contrast: 1.0, binarize: false, grayscale: false })

      const previewCanvas = document.createElement('canvas')
      previewCanvas.width = processed.width
      previewCanvas.height = processed.height
      previewCanvas.getContext('2d')!.putImageData(processed, 0, 0)

      const blobPromises: Promise<Blob>[] = [imageDataToBlob(processed), imageDataToBlob(frame)]

      const rawCanvas = canvasFromImageData(frame)
      const previews: { name: string; dataUrl: string }[] = [
        { name: 'Zoom Preprocessed', dataUrl: previewCanvas.toDataURL('image/png') },
        { name: 'Zoom Raw', dataUrl: rawCanvas.toDataURL('image/png') },
      ]

      let hasFullBlob = false
      if (fullFrameRef.current) {
        const fullCropped = cropImageData(fullFrameRef.current, roiRef.current)
        const fullProcessed = preprocessForOcr(fullCropped, { scale: 2, contrast: 1.0, binarize: false, grayscale: false })
        blobPromises.push(imageDataToBlob(fullProcessed))
        hasFullBlob = true
        const fullCanvas = canvasFromImageData(fullProcessed)
        previews.push({ name: 'Full Window Crop', dataUrl: fullCanvas.toDataURL('image/png') })
      }

      setOcrPreviews(previews)
      setPresetsSaved(false)

      Promise.all(blobPromises).then((blobs) => {
        const mainFile = new File([blobs[0]], 'capture.png', { type: 'image/png' })
        const altFile = new File([blobs[1]], 'capture-raw.png', { type: 'image/png' })
        const fullFile = hasFullBlob ? new File([blobs[2]], 'capture-full.png', { type: 'image/png' }) : undefined
        scan(
          {
            image: mainFile,
            imageAlt: altFile,
            imageFull: fullFile,
            gameType: game,
            profile,
            benchMode: true,
          },
          { onSettled: () => { scanningRef.current = false } }
        )
      })
    },
    [game, scan, profile]
  )

  const handleSignificantChange = useCallback(
    (frame: ImageData) => {
      runBenchScan(frame)
    },
    [runBenchScan]
  )

  const { processFrame } = useFrameDiff({
    onSignificantChange: handleSignificantChange,
  })

  const handleFrame = useCallback(
    (frame: ImageData) => {
      fullFrameRef.current = frame
      const cropped = cropImageData(frame, roiRef.current)
      processFrame(cropped)
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

  const handleRescan = useCallback(() => {
    if (!currentFrame || scanningRef.current) return
    const cropped = cropImageData(currentFrame, roiRef.current)
    runBenchScan(cropped)
  }, [currentFrame, runBenchScan])

  /** Save the top 3 presets from bench results to localStorage */
  const handleSavePresets = useCallback(() => {
    if (!scanResult?.benchResults) return

    // Sort bench results: most substats first, then highest confidence
    const sorted = [...scanResult.benchResults]
      .filter(r => r.success)
      .sort((a, b) => b.subsCount - a.subsCount || b.confidence - a.confidence)

    // Take unique preset names (top 3)
    const seen = new Set<string>()
    const bestPresets: string[] = []
    for (const r of sorted) {
      if (!seen.has(r.preset)) {
        seen.add(r.preset)
        bestPresets.push(r.preset)
      }
      if (bestPresets.length >= 3) break
    }

    if (bestPresets.length === 0) bestPresets.push('upscale-2x')

    localStorage.setItem(`game-analyzer-best-presets-${game}`, JSON.stringify(bestPresets))
    setPresetsSaved(true)
  }, [scanResult, game])

  const isAnalyzing = isPending
  const resultData = scanResult
  const hasStructuredData = resultData?.data && Object.keys(resultData.data).length > 0

  return (
    <Div className="container mx-auto px-4 py-8 max-w-6xl">
      <Div className="mb-8">
        <H1 className="text-2xl font-bold mb-2">{t('bench.title')}</H1>
        <P className="text-sm text-muted-foreground">
          {t(`games.${game}`)} — R&D: {t('bench.description', { defaultMessage: 'tests all 8 presets on 3 image sources to find the best OCR configuration' })}
        </P>
      </Div>

      {/* Profile selector */}
      <Div className="mb-6">
        <ProfileSelector value={profile} onChange={setProfile} gameType={game} />
      </Div>

      <Div className="space-y-6">
        {/* Dual preview: zoom + full window with ROI */}
        <CapturePreview
          isCapturing={isCapturing}
          isAnalyzing={isAnalyzing}
          isSupported={isSupported}
          currentFrame={currentFrame}
          error={captureError}
          onStart={startCapture}
          onStop={stopCapture}
          roi={roi}
          onRoiChange={handleRoiChange}
          showFullPreview
        />

        {/* Rescan button */}
        {isCapturing && (
          <Button
            variant="outline"
            className="w-full"
            disabled={isPending || !currentFrame}
            onClick={handleRescan}
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="mr-2"><path d="M21 12a9 9 0 0 0-9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" /><path d="M3 3v5h5" /><path d="M3 12a9 9 0 0 0 9 9 9.75 9.75 0 0 0 6.74-2.74L21 16" /><path d="M16 21h5v-5" /></svg>
            {t('scan.capture.rescan')}
          </Button>
        )}

        {/* Loading */}
        {isPending && (
          <Div className="text-center py-8">
            <Div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4" />
            <P className="text-muted-foreground">{t('bench.running')}</P>
          </Div>
        )}

        {/* Results */}
        {resultData && (
          <Div className="space-y-4">
            {/* Merged result card */}
            {resultData.unreliable && (
              <Div className="rounded-md bg-yellow-500/10 border border-yellow-500/20 px-3 py-2">
                <P className="text-sm text-yellow-600 dark:text-yellow-400">
                  {t('scan.unreliableResult')}
                </P>
              </Div>
            )}

            {hasStructuredData && resultData.success && game === 'summoners-war' && 'set' in resultData.data && (
              <RuneCard rune={resultData.data} analysis={resultData.analysis} confidence={resultData.confidence} />
            )}
            {hasStructuredData && resultData.success && 'manufacturer' in resultData.data && (
              <GearCard gear={resultData.data} confidence={resultData.confidence} />
            )}

            {resultData.rawText && (
              <ScanResultRaw
                rawText={resultData.rawText}
                confidence={resultData.confidence}
                parsingFailed={!hasStructuredData}
              />
            )}

            {/* Bench results table */}
            {resultData.benchResults && resultData.benchResults.length > 0 && (
              <Div className="space-y-3">
                <H2 className="text-lg font-semibold">{t('bench.results')}</H2>
                <Div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b">
                        <th className="text-left py-2 px-3 font-medium">{t('bench.source', { defaultMessage: 'Source' })}</th>
                        <th className="text-left py-2 px-3 font-medium">{t('bench.preset')}</th>
                        <th className="text-right py-2 px-3 font-medium">{t('labels.confidence')}</th>
                        <th className="text-right py-2 px-3 font-medium">{t('bench.substats')}</th>
                        <th className="text-center py-2 px-3 font-medium">{t('bench.status')}</th>
                      </tr>
                    </thead>
                    <tbody>
                      {resultData.benchResults.map((r, idx) => (
                        <tr
                          key={`${r.source}-${r.preset}-${idx}`}
                          className={`border-b ${idx === 0 ? 'bg-primary/5' : ''}`}
                        >
                          <td className="py-2 px-3 font-mono text-xs">{r.source}</td>
                          <td className="py-2 px-3 font-mono text-xs">
                            {r.preset}
                            {idx === 0 && (
                              <span className="ml-2 text-xs text-primary font-medium">BEST</span>
                            )}
                          </td>
                          <td className="text-right py-2 px-3">{r.confidence}%</td>
                          <td className="text-right py-2 px-3">{r.subsCount}</td>
                          <td className="text-center py-2 px-3">
                            {r.success ? (
                              <span className="text-green-600 dark:text-green-400">OK</span>
                            ) : (
                              <span className="text-red-600 dark:text-red-400">FAIL</span>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </Div>

                {/* Save best presets button */}
                <Button
                  variant={presetsSaved ? 'outline' : 'default'}
                  className="w-full"
                  onClick={handleSavePresets}
                  disabled={presetsSaved}
                >
                  {presetsSaved
                    ? t('bench.presetsSaved', { defaultMessage: 'Presets saved for production scan' })
                    : t('bench.savePresets', { defaultMessage: 'Save best presets for production scan' })
                  }
                </Button>
              </Div>
            )}

            {/* OCR debug panel */}
            {ocrPreviews.length > 0 && (
              <OcrDebugPanel
                previews={ocrPreviews}
                sources={resultData.ocrSources}
                mergedConfidence={resultData.confidence}
                mergedSubs={resultData.data && 'subStats' in resultData.data ? (resultData.data as any).subStats?.length || 0 : 0}
              />
            )}
          </Div>
        )}

        {/* Waiting state */}
        {!resultData && !isPending && isCapturing && (
          <Div className="text-center py-8">
            <P className="text-muted-foreground text-sm">{t('scan.capture.waitingForChange')}</P>
          </Div>
        )}
      </Div>
    </Div>
  )
}

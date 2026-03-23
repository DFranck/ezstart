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
import type { MaskRect } from '@/components/blackout-mask'
import type { ZoneConfig } from '@/components/multi-zone-selector'
import { getDefaultZones } from '@/components/multi-zone-selector'
import { CapturePreview } from '@/components/capture-preview'
import { OcrDebugPanel } from '@/components/ocr-debug-panel'
import { preprocessForOcr } from '@/utils/image-preprocessing'
import { useScan } from '@/hooks/use-scan'
import { useScreenCapture } from '@/hooks/use-screen-capture'
import { useFrameDiff } from '@/hooks/use-frame-diff'
import { useSaveGameConfig } from '@/hooks/use-game-config'

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

function loadZones(gameType: GameType): ZoneConfig[] {
  if (typeof window === 'undefined') return getDefaultZones()
  try {
    const saved = localStorage.getItem(`game-analyzer-zones-${gameType}`)
    if (saved) return JSON.parse(saved)
  } catch {}
  return getDefaultZones()
}

const DEFAULT_MASKS: MaskRect[] = [
  { id: 'buttons', x: 65, y: 35, width: 30, height: 35 },
  { id: 'score', x: 60, y: 15, width: 35, height: 15 },
  { id: 'sell', x: 65, y: 75, width: 30, height: 20 },
]

function loadMasks(gameType: GameType): MaskRect[] {
  if (typeof window === 'undefined') return DEFAULT_MASKS
  try {
    const saved = localStorage.getItem(`game-analyzer-masks-${gameType}`)
    if (saved) return JSON.parse(saved)
  } catch {}
  return DEFAULT_MASKS
}

function applyBlackoutMasks(imageData: ImageData, masks: MaskRect[]): ImageData {
  const canvas = document.createElement('canvas')
  canvas.width = imageData.width
  canvas.height = imageData.height
  const ctx = canvas.getContext('2d')!
  ctx.putImageData(imageData, 0, 0)

  ctx.fillStyle = 'black'
  for (const mask of masks) {
    const x = Math.round((mask.x / 100) * canvas.width)
    const y = Math.round((mask.y / 100) * canvas.height)
    const w = Math.round((mask.width / 100) * canvas.width)
    const h = Math.round((mask.height / 100) * canvas.height)
    ctx.fillRect(x, y, w, h)
  }

  return ctx.getImageData(0, 0, canvas.width, canvas.height)
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

  const [roi, setRoi] = useState<RoiRect>(() => loadRoi(game))
  const [zones, setZones] = useState<ZoneConfig[]>(() => loadZones(game))
  const [masks, setMasks] = useState<MaskRect[]>(() => loadMasks(game))
  const [ocrPreviews, setOcrPreviews] = useState<{ name: string; dataUrl: string }[]>([])
  const [presetsSaved, setPresetsSaved] = useState(false)
  const [zonesLocked, setZonesLocked] = useState(false)
  const { mutate: scan, data: scanResult, isPending } = useScan()
  const { mutate: saveConfig } = useSaveGameConfig(game)

  const roiRef = useRef<RoiRect>(roi)
  const zonesRef = useRef<ZoneConfig[]>(zones)
  const masksRef = useRef<MaskRect[]>(masks)
  const fullFrameRef = useRef<ImageData | null>(null)
  const scanningRef = useRef(false)

  const handleRoiChange = useCallback((newRoi: RoiRect) => {
    setRoi(newRoi)
    roiRef.current = newRoi
    localStorage.setItem(`game-analyzer-roi-${game}`, JSON.stringify(newRoi))
  }, [game])

  const handleZonesChange = useCallback((newZones: ZoneConfig[]) => {
    setZones(newZones)
    zonesRef.current = newZones
    localStorage.setItem(`game-analyzer-zones-${game}`, JSON.stringify(newZones))
  }, [game])

  const handleMasksChange = useCallback((newMasks: MaskRect[]) => {
    setMasks(newMasks)
    masksRef.current = newMasks
    localStorage.setItem(`game-analyzer-masks-${game}`, JSON.stringify(newMasks))
  }, [game])

  const handleMaskAdd = useCallback(() => {
    const newMask: MaskRect = {
      id: `mask-${Date.now()}`,
      x: 35,
      y: 35,
      width: 20,
      height: 15,
    }
    const newMasks = [...masksRef.current, newMask]
    handleMasksChange(newMasks)
  }, [handleMasksChange])

  const handleMaskRemove = useCallback((id: string) => {
    const newMasks = masksRef.current.filter(m => m.id !== id)
    handleMasksChange(newMasks)
  }, [handleMasksChange])

  useEffect(() => {
    const savedRoi = loadRoi(game)
    setRoi(savedRoi)
    roiRef.current = savedRoi
    const savedZones = loadZones(game)
    setZones(savedZones)
    zonesRef.current = savedZones
    const savedMasks = loadMasks(game)
    setMasks(savedMasks)
    masksRef.current = savedMasks
  }, [game])

  const runBenchScan = useCallback(
    (frame: ImageData) => {
      if (scanningRef.current) return
      scanningRef.current = true

      // Apply blackout masks before preprocessing
      const maskedFrame = masksRef.current.length > 0 ? applyBlackoutMasks(frame, masksRef.current) : frame

      const processed = preprocessForOcr(maskedFrame, { scale: 2, contrast: 1.0, binarize: false, grayscale: false })

      const previewCanvas = document.createElement('canvas')
      previewCanvas.width = processed.width
      previewCanvas.height = processed.height
      previewCanvas.getContext('2d')!.putImageData(processed, 0, 0)

      const blobPromises: Promise<Blob>[] = [imageDataToBlob(processed), imageDataToBlob(maskedFrame)]

      const rawCanvas = canvasFromImageData(maskedFrame)
      const previews: { name: string; dataUrl: string }[] = [
        { name: 'Zoom Preprocessed', dataUrl: previewCanvas.toDataURL('image/png') },
        { name: 'Zoom Raw', dataUrl: rawCanvas.toDataURL('image/png') },
      ]

      let hasFullBlob = false
      if (fullFrameRef.current) {
        const fullCropped = cropImageData(fullFrameRef.current, roiRef.current)
        const fullMasked = masksRef.current.length > 0 ? applyBlackoutMasks(fullCropped, masksRef.current) : fullCropped
        const fullProcessed = preprocessForOcr(fullMasked, { scale: 2, contrast: 1.0, binarize: false, grayscale: false })
        blobPromises.push(imageDataToBlob(fullProcessed))
        hasFullBlob = true
        const fullCanvas = canvasFromImageData(fullProcessed)
        previews.push({ name: 'Full Window Crop', dataUrl: fullCanvas.toDataURL('image/png') })
      }

      // Crop zone images from the zoom frame
      const currentZones = zonesRef.current
      const zoneBlobPromises = currentZones.map(async (zone) => {
        const zoneCropped = cropImageData(maskedFrame, zone.rect)
        const zoneProcessed = preprocessForOcr(zoneCropped, { scale: 2, contrast: 1.0, binarize: false, grayscale: false })
        const blob = await imageDataToBlob(zoneProcessed)

        // Add zone preview
        const zoneCanvas = canvasFromImageData(zoneProcessed)
        previews.push({ name: `Zone: ${zone.name}`, dataUrl: zoneCanvas.toDataURL('image/png') })

        return { name: zone.name, blob }
      })

      setPresetsSaved(false)

      Promise.all([Promise.all(blobPromises), Promise.all(zoneBlobPromises)]).then(([blobs, zoneBlobs]) => {
        setOcrPreviews(previews)

        const mainFile = new File([blobs[0]], 'capture.png', { type: 'image/png' })
        const altFile = new File([blobs[1]], 'capture-raw.png', { type: 'image/png' })
        const fullFile = hasFullBlob ? new File([blobs[2]], 'capture-full.png', { type: 'image/png' }) : undefined

        // Build zone files
        const zoneFiles: Record<string, File> = {}
        for (const zb of zoneBlobs) {
          zoneFiles[zb.name] = new File([zb.blob], `zone-${zb.name}.png`, { type: 'image/png' })
        }

        scan(
          {
            image: mainFile,
            imageAlt: altFile,
            imageFull: fullFile,
            gameType: game,
            benchMode: true,
            zoneSetSlot: zoneFiles.setSlot,
            zoneMainStat: zoneFiles.mainStat,
            zoneQuality: zoneFiles.quality,
            zoneInnate: zoneFiles.innate,
            zoneSub1: zoneFiles.sub1,
            zoneSub2: zoneFiles.sub2,
            zoneSub3: zoneFiles.sub3,
            zoneSub4: zoneFiles.sub4,
          },
          { onSettled: () => { scanningRef.current = false } }
        )
      })
    },
    [game, scan]
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

  /** Save the top 3 presets + zones + masks to DB and localStorage */
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

    // Save to localStorage (fallback)
    localStorage.setItem(`game-analyzer-best-presets-${game}`, JSON.stringify(bestPresets))

    // Save to DB (presets + zones + masks)
    saveConfig({
      bestPresets,
      zones: zonesRef.current,
      masks: masksRef.current,
    })

    setPresetsSaved(true)
  }, [scanResult, game, saveConfig])

  const isAnalyzing = isPending
  const resultData = scanResult

  return (
    <Div className="container mx-auto px-4 py-8 max-w-6xl">
      <Div className="mb-8">
        <H1 className="text-2xl font-bold mb-2">{t('bench.title')}</H1>
        <P className="text-sm text-muted-foreground">
          {t(`games.${game}`)} — R&D: {t('bench.description')}
        </P>
      </Div>

      <Div className="space-y-6">
        {/* Lock/unlock toggle for zones and masks */}
        <Div className="flex justify-end">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setZonesLocked(!zonesLocked)}
          >
            {zonesLocked ? `🔓 ${t('bench.unlockZones')}` : `🔒 ${t('bench.lockZones')}`}
          </Button>
        </Div>

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
          showTabs
          zones={zones}
          onZonesChange={handleZonesChange}
          masks={masks}
          onMasksChange={handleMasksChange}
          onMaskAdd={handleMaskAdd}
          onMaskRemove={handleMaskRemove}
          zonesLocked={zonesLocked}
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
            {/* Merged result summary */}
            <Div className="rounded-md bg-muted/50 border px-3 py-2">
              <P className="text-sm font-medium">
                {t('labels.confidence')}: {resultData.confidence}%
                {resultData.rawText && (
                  <span className="ml-4 text-muted-foreground">
                    Raw: {resultData.rawText.substring(0, 120)}{resultData.rawText.length > 120 ? '...' : ''}
                  </span>
                )}
              </P>
            </Div>

            {/* Bench results table */}
            {resultData.benchResults && resultData.benchResults.length > 0 && (
              <Div className="space-y-3">
                <H2 className="text-lg font-semibold">{t('bench.results')}</H2>
                <Div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b">
                        <th className="text-left py-2 px-3 font-medium">{t('bench.source')}</th>
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
                    ? t('bench.presetsSaved')
                    : t('bench.savePresets')
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
                mergedSubs={resultData.benchResults?.find(r => r.success)?.subsCount ?? 0}
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

'use client'

import {
  Badge,
  Button,
  Div,
  H1,
  P,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Skeleton,
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '@ezstart/ui/components'
import { useTranslations } from 'next-intl'
import { useCallback, useEffect, useRef, useState } from 'react'
import { useParams } from 'next/navigation'
import type { GameType } from '@game-analyzer/types'
import type { RoiRect } from '@/components/roi-selector'
import type { MaskRect } from '@/components/blackout-mask'
import { ScanUploader } from '@/components/scan-uploader'
import { RuneCard } from '@/components/rune-card'
import { GearCard } from '@/components/gear-card'
import { CapturePreview } from '@/components/capture-preview'
import { ScanResultRaw } from '@/components/scan-result-raw'
import { ProfileSelector, usePlayerProfile } from '@/components/profile-selector'
import { preprocessForOcr } from '@/utils/image-preprocessing'
import { useScan } from '@/hooks/use-scan'
import { useScreenCapture } from '@/hooks/use-screen-capture'
import { useFrameDiff } from '@/hooks/use-frame-diff'
import { useGameLayouts, useGameLayout } from '@/hooks/use-game-config'

/** Default ROI: top-right area where SW displays the rune */
const DEFAULT_ROI: RoiRect = { x: 60, y: 5, width: 35, height: 40 }

/** Load saved ROI for a given game from localStorage, fallback to DEFAULT_ROI */
function loadRoi(gameType: GameType): RoiRect {
  if (typeof window === 'undefined') return DEFAULT_ROI
  try {
    const saved = localStorage.getItem(`game-analyzer-roi-${gameType}`)
    if (saved) return JSON.parse(saved)
  } catch {}
  return DEFAULT_ROI
}

/** Load saved best presets from localStorage */
function loadPresets(gameType: GameType): string[] {
  if (typeof window === 'undefined') return ['upscale-2x']
  try {
    const saved = localStorage.getItem(`game-analyzer-best-presets-${gameType}`)
    if (saved) return JSON.parse(saved)
  } catch {}
  return ['upscale-2x']
}

/** Load saved masks from localStorage (empty array = no masks) */
function loadMasks(gameType: GameType): MaskRect[] {
  if (typeof window === 'undefined') return []
  try {
    const saved = localStorage.getItem(`game-analyzer-masks-${gameType}`)
    if (saved) return JSON.parse(saved)
  } catch {}
  return []
}

/** Black-out mask regions on an ImageData (for OCR — always black) */
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

/** Crop an ImageData to the given ROI (percentages 0-100) */
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

export default function GameScanPage() {
  const t = useTranslations()
  const params = useParams()
  const game = params.game as GameType

  const [mode, setMode] = useState<'capture' | 'upload'>('capture')
  const [profile, setProfile] = usePlayerProfile(game)
  const [roi, setRoi] = useState<RoiRect>(() => loadRoi(game))
  const { mutate: scan, data: scanResult, isPending, reset } = useScan()

  // Layout selector
  const [currentLayoutName, setCurrentLayoutName] = useState<string>('')
  const { data: layouts = [] } = useGameLayouts(game)
  const { data: layoutData } = useGameLayout(game, currentLayoutName)

  // Settings collapsible — hidden by default when a layout is selected
  const [showSettings, setShowSettings] = useState(!layoutData)

  // Session scan counter
  const [scanCount, setScanCount] = useState(0)

  // Load saved presets from bench — prefer DB layout, fallback localStorage
  const savedPresets = useRef<string[]>(loadPresets(game))

  // Load saved masks from bench — prefer DB layout, fallback localStorage
  const [masks, setMasks] = useState<MaskRect[]>(() => loadMasks(game))
  const masksRef = useRef<MaskRect[]>(masks)

  // Keep a ref to the latest ROI so callbacks always have the current value
  const roiRef = useRef<RoiRect>(roi)
  // Store the full (non-zoomed) frame for the 3rd OCR source
  const fullFrameRef = useRef<ImageData | null>(null)
  const handleRoiChange = useCallback((newRoi: RoiRect) => {
    setRoi(newRoi)
    roiRef.current = newRoi
    localStorage.setItem(`game-analyzer-roi-${game}`, JSON.stringify(newRoi))
  }, [game])

  // Load saved ROI when game changes
  useEffect(() => {
    const savedRoi = loadRoi(game)
    setRoi(savedRoi)
    roiRef.current = savedRoi
    savedPresets.current = loadPresets(game)
    const savedMasks = loadMasks(game)
    setMasks(savedMasks)
    masksRef.current = savedMasks
  }, [game])

  // Select first layout when layouts load
  useEffect(() => {
    if (layouts.length > 0 && !currentLayoutName) {
      setCurrentLayoutName(layouts[0].layoutName)
    }
  }, [layouts, currentLayoutName])

  // When a layout is loaded from DB, apply its config and collapse settings
  useEffect(() => {
    if (!layoutData) return

    setShowSettings(false)

    if (layoutData.roi) {
      setRoi(layoutData.roi)
      roiRef.current = layoutData.roi
    }
    if (layoutData.bestPresets && layoutData.bestPresets.length > 0) {
      savedPresets.current = layoutData.bestPresets
    }
    if (layoutData.masks && layoutData.masks.length > 0) {
      setMasks(layoutData.masks)
      masksRef.current = layoutData.masks
    }
  }, [layoutData])

  // Track whether an auto-scan is in progress to avoid overlapping requests
  const scanningRef = useRef(false)

  const handleSignificantChange = useCallback(
    (frame: ImageData) => {
      if (scanningRef.current) return

      scanningRef.current = true
      setScanCount(prev => prev + 1)

      // Apply blackout masks before preprocessing
      const maskedFrame = masksRef.current.length > 0 ? applyBlackoutMasks(frame, masksRef.current) : frame
      const processed = preprocessForOcr(maskedFrame, { scale: 2, contrast: 1.0, binarize: false, grayscale: false })

      // Build all images: preprocessed (main) + raw crop (alt) + full window crop (full)
      const blobPromises: Promise<Blob>[] = [imageDataToBlob(processed), imageDataToBlob(maskedFrame)]

      // 3rd source: full window frame cropped to ROI at native resolution
      let hasFullBlob = false
      if (fullFrameRef.current) {
        const fullCropped = cropImageData(fullFrameRef.current, roiRef.current)
        const fullMasked = masksRef.current.length > 0 ? applyBlackoutMasks(fullCropped, masksRef.current) : fullCropped
        const fullProcessed = preprocessForOcr(fullMasked, { scale: 2, contrast: 1.0, binarize: false, grayscale: false })
        blobPromises.push(imageDataToBlob(fullProcessed))
        hasFullBlob = true
      }

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
            benchMode: false,
            presets: savedPresets.current,
          },
          { onSettled: () => { scanningRef.current = false } }
        )
      })
    },
    [game, scan, profile]
  )

  const { processFrame } = useFrameDiff({
    onSignificantChange: handleSignificantChange,
  })

  const handleFrame = useCallback(
    (frame: ImageData) => {
      // Save the full frame before cropping (for full-window OCR source)
      fullFrameRef.current = frame
      // Crop frame to ROI before feeding to diff for better sensitivity
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

  // Auto-collapse settings when capture starts
  useEffect(() => {
    if (isCapturing) setShowSettings(false)
  }, [isCapturing])

  const handleRescan = useCallback(() => {
    if (!currentFrame || scanningRef.current) return
    scanningRef.current = true
    setScanCount(prev => prev + 1)
    const cropped = cropImageData(currentFrame, roiRef.current)
    // Apply blackout masks before preprocessing
    const maskedCropped = masksRef.current.length > 0 ? applyBlackoutMasks(cropped, masksRef.current) : cropped
    const processed = preprocessForOcr(maskedCropped, { scale: 2, contrast: 1.0, binarize: false, grayscale: false })

    // Build all images: preprocessed (main) + raw crop (alt) + full window crop (full)
    const blobPromises: Promise<Blob>[] = [imageDataToBlob(processed), imageDataToBlob(maskedCropped)]

    // 3rd source: full window frame cropped to ROI at native resolution
    let hasFullBlob = false
    if (fullFrameRef.current) {
      const fullCropped = cropImageData(fullFrameRef.current, roiRef.current)
      const fullMasked = masksRef.current.length > 0 ? applyBlackoutMasks(fullCropped, masksRef.current) : fullCropped
      const fullProcessed = preprocessForOcr(fullMasked, { scale: 2, contrast: 1.0, binarize: false, grayscale: false })
      blobPromises.push(imageDataToBlob(fullProcessed))
      hasFullBlob = true
    }

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
          benchMode: false,
          presets: savedPresets.current,
        },
        { onSettled: () => { scanningRef.current = false } }
      )
    })
  }, [currentFrame, scan, game, profile])

  function handleImageSelected(file: File) {
    reset()
    scan({ image: file, gameType: game, profile, benchMode: false, presets: savedPresets.current })
  }

  const isAnalyzing = isPending

  const resultData = scanResult
  const hasStructuredData = resultData?.data && Object.keys(resultData.data).length > 0

  return (
    <Div className="container mx-auto px-4 py-6 max-w-6xl">
      {/* Header with settings toggle */}
      <Div className="flex items-center justify-between mb-4">
        <H1 className="text-lg font-bold">{t('scan.title')}</H1>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setShowSettings(!showSettings)}
          className="text-muted-foreground hover:text-foreground"
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="mr-1.5"><path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z"/><circle cx="12" cy="12" r="3"/></svg>
          {showSettings ? t('scan.hideSettings') : t('scan.settings')}
        </Button>
      </Div>

      {/* Collapsible settings */}
      {showSettings && (
        <Div className="space-y-3 p-3 rounded-lg border border-border bg-muted/30 mb-4">
          <ProfileSelector value={profile} onChange={setProfile} gameType={game} />
          {layouts.length > 0 && (
            <Div className="flex items-center gap-2">
              <P className="text-sm font-medium">{t('bench.layout')}:</P>
              <Select
                value={currentLayoutName}
                onValueChange={setCurrentLayoutName}
              >
                <SelectTrigger className="w-[180px]">
                  <SelectValue placeholder={t('bench.layout')} />
                </SelectTrigger>
                <SelectContent>
                  {layouts.map((l) => (
                    <SelectItem key={l.layoutName} value={l.layoutName}>
                      {l.displayName ?? l.layoutName}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Div>
          )}
        </Div>
      )}

      {/* Mode Tabs */}
      <Tabs value={mode} onValueChange={(v) => setMode(v as 'capture' | 'upload')}>
        <TabsList className="mb-4">
          <TabsTrigger value="capture">{t('scan.mode.capture')}</TabsTrigger>
          <TabsTrigger value="upload">{t('scan.mode.upload')}</TabsTrigger>
        </TabsList>

        {/* Capture Mode */}
        <TabsContent value="capture">
          <Div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Left: Capture + Controls */}
            <Div className="space-y-4">
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
                showTabs={false}
                masks={masks.length > 0 ? masks : undefined}
                onMasksChange={masks.length > 0 ? () => {} : undefined}
                onMaskAdd={masks.length > 0 ? () => {} : undefined}
                onMaskRemove={masks.length > 0 ? () => {} : undefined}
                zones={layoutData?.zones}
                onZonesChange={() => {}}
                zonesLocked
                maskColor="rgba(255, 0, 0, 0.15)"
              />

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

              {/* Status bar */}
              {isCapturing && (
                <Div className="flex items-center gap-2 flex-wrap">
                  {currentLayoutName && (
                    <Badge variant="outline" className="text-xs">
                      {t('scan.statusBar.layout')}: {currentLayoutName}
                    </Badge>
                  )}
                  {resultData?.confidence !== undefined && (
                    <Badge variant="outline" className="text-xs">
                      <Div
                        className={`h-1.5 w-1.5 rounded-full mr-1 ${
                          resultData.confidence >= 80 ? 'bg-green-500' : resultData.confidence >= 50 ? 'bg-yellow-500' : 'bg-red-500'
                        }`}
                      />
                      {t('scan.statusBar.lastConfidence')}: {Math.round(resultData.confidence)}%
                    </Badge>
                  )}
                  {scanCount > 0 && (
                    <Badge variant="outline" className="text-xs">
                      {scanCount} {t('scan.statusBar.scans')}
                    </Badge>
                  )}
                </Div>
              )}
            </Div>

            {/* Right: Results */}
            <Div className="space-y-4">
              {isPending && (
                <Div className="space-y-3">
                  <Skeleton className="h-6 w-1/3" />
                  <Skeleton className="h-4 w-2/3" />
                  <Skeleton className="h-20 w-full" />
                  <Skeleton className="h-4 w-1/2" />
                  <Skeleton className="h-4 w-3/4" />
                  <Skeleton className="h-4 w-1/2" />
                  <Skeleton className="h-10 w-full" />
                </Div>
              )}

              {resultData && (
                <Div className={isPending ? 'opacity-50 pointer-events-none' : 'animate-in fade-in-0 slide-in-from-bottom-2 duration-300'}>
                  {resultData.unreliable && (
                    <Div className="rounded-md bg-yellow-500/10 border border-yellow-500/20 px-3 py-2 mb-3">
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
                      defaultCollapsed={hasStructuredData}
                    />
                  )}

                  {!hasStructuredData && resultData.rawText && (
                    <Div className="rounded-md bg-yellow-500/10 border border-yellow-500/20 px-3 py-2">
                      <P className="text-sm text-yellow-600 dark:text-yellow-400">
                        {t('scan.parsingImproving', { defaultMessage: 'Structured parsing is being improved. Raw OCR text is shown above.' })}
                      </P>
                    </Div>
                  )}
                </Div>
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
              <Div className="space-y-3">
                <Skeleton className="h-6 w-1/3" />
                <Skeleton className="h-4 w-2/3" />
                <Skeleton className="h-20 w-full" />
                <Skeleton className="h-4 w-1/2" />
                <Skeleton className="h-10 w-full" />
              </Div>
            )}

            {/* Result */}
            {resultData && (
              <Div className="space-y-4">
                <H1 className="text-xl font-semibold">{t('scan.result')}</H1>

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
                    defaultCollapsed={hasStructuredData}
                  />
                )}

                {!hasStructuredData && resultData.rawText && (
                  <Div className="rounded-md bg-yellow-500/10 border border-yellow-500/20 px-3 py-2">
                    <P className="text-sm text-yellow-600 dark:text-yellow-400">
                      {t('scan.parsingImproving', { defaultMessage: 'Structured parsing is being improved. Raw OCR text is shown above.' })}
                    </P>
                  </Div>
                )}
              </Div>
            )}
          </Div>
        </TabsContent>
      </Tabs>
    </Div>
  )
}

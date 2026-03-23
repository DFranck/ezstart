'use client'

import {
  Button,
  Div,
  H1,
  P,
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '@ezstart/ui/components'
import { useTranslations } from 'next-intl'
import { useCallback, useEffect, useRef, useState } from 'react'
import type { GameType, Scan } from '@game-analyzer/types'
import type { RoiRect } from '@/components/roi-selector'
import { GameSelector } from '@/components/game-selector'
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

export default function ScanPage() {
  const t = useTranslations()
  const [selectedGame, setSelectedGame] = useState<GameType | null>(null)
  const [mode, setMode] = useState<'capture' | 'upload'>('capture')
  const [profile, setProfile] = usePlayerProfile(selectedGame)
  const [roi, setRoi] = useState<RoiRect>(DEFAULT_ROI)
  const [preprocessedPreview, setPreprocessedPreview] = useState<string | null>(null)
  const { mutate: scan, data: scanResult, isPending, reset } = useScan()

  // Keep a ref to the latest ROI so callbacks always have the current value
  const roiRef = useRef<RoiRect>(roi)
  // Store the full (non-zoomed) frame for the 3rd OCR source
  const fullFrameRef = useRef<ImageData | null>(null)
  const handleRoiChange = useCallback((newRoi: RoiRect) => {
    setRoi(newRoi)
    roiRef.current = newRoi
    if (selectedGame) {
      localStorage.setItem(`game-analyzer-roi-${selectedGame}`, JSON.stringify(newRoi))
    }
  }, [selectedGame])

  // Load saved ROI when selected game changes
  useEffect(() => {
    if (selectedGame) {
      const savedRoi = loadRoi(selectedGame)
      setRoi(savedRoi)
      roiRef.current = savedRoi
    }
  }, [selectedGame])

  // Track whether an auto-scan is in progress to avoid overlapping requests
  const scanningRef = useRef(false)

  const handleSignificantChange = useCallback(
    (frame: ImageData) => {
      if (!selectedGame || scanningRef.current) return

      scanningRef.current = true

      // Frame is already cropped to ROI by handleFrame before being fed to useFrameDiff
      // Upscale 2x only — best OCR accuracy (79% confidence in testing)
      const processed = preprocessForOcr(frame, { scale: 2, contrast: 1.0, binarize: false, grayscale: false })
      // Save a preview of the preprocessed image sent to OCR
      const previewCanvas = document.createElement('canvas')
      previewCanvas.width = processed.width
      previewCanvas.height = processed.height
      previewCanvas.getContext('2d')!.putImageData(processed, 0, 0)
      setPreprocessedPreview(previewCanvas.toDataURL('image/png'))

      // Build all images: preprocessed (main) + raw crop (alt) + full window crop (full)
      const blobPromises: Promise<Blob>[] = [imageDataToBlob(processed), imageDataToBlob(frame)]

      // 3rd source: full window frame croppé au ROI à résolution native
      let hasFullBlob = false
      if (fullFrameRef.current) {
        const fullCropped = cropImageData(fullFrameRef.current, roiRef.current)
        const fullProcessed = preprocessForOcr(fullCropped, { scale: 2, contrast: 1.0, binarize: false, grayscale: false })
        blobPromises.push(imageDataToBlob(fullProcessed))
        hasFullBlob = true
      }

      Promise.all(blobPromises).then((blobs) => {
        const mainFile = new File([blobs[0]], 'capture.png', { type: 'image/png' })
        const altFile = new File([blobs[1]], 'capture-raw.png', { type: 'image/png' })
        const fullFile = hasFullBlob ? new File([blobs[2]], 'capture-full.png', { type: 'image/png' }) : undefined
        scan(
          { image: mainFile, imageAlt: altFile, imageFull: fullFile, gameType: selectedGame, profile },
          { onSettled: () => { scanningRef.current = false } }
        )
      })
    },
    [selectedGame, scan, profile]
  )

  const { diffScore, isStable, processFrame } = useFrameDiff({
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

  const handleRescan = useCallback(() => {
    if (!selectedGame || !currentFrame || scanningRef.current) return
    scanningRef.current = true
    const cropped = cropImageData(currentFrame, roiRef.current)
    // Upscale 2x only — best OCR accuracy (79% confidence in testing)
    const processed = preprocessForOcr(cropped, { scale: 2, contrast: 1.0, binarize: false, grayscale: false })
    // Save a preview of the preprocessed image sent to OCR
    const previewCanvas = document.createElement('canvas')
    previewCanvas.width = processed.width
    previewCanvas.height = processed.height
    previewCanvas.getContext('2d')!.putImageData(processed, 0, 0)
    setPreprocessedPreview(previewCanvas.toDataURL('image/png'))

    // Build all images: preprocessed (main) + raw crop (alt) + full window crop (full)
    const blobPromises: Promise<Blob>[] = [imageDataToBlob(processed), imageDataToBlob(cropped)]

    // 3rd source: full window frame croppé au ROI à résolution native
    let hasFullBlob = false
    if (fullFrameRef.current) {
      const fullCropped = cropImageData(fullFrameRef.current, roiRef.current)
      const fullProcessed = preprocessForOcr(fullCropped, { scale: 2, contrast: 1.0, binarize: false, grayscale: false })
      blobPromises.push(imageDataToBlob(fullProcessed))
      hasFullBlob = true
    }

    Promise.all(blobPromises).then((blobs) => {
      const mainFile = new File([blobs[0]], 'capture.png', { type: 'image/png' })
      const altFile = new File([blobs[1]], 'capture-raw.png', { type: 'image/png' })
      const fullFile = hasFullBlob ? new File([blobs[2]], 'capture-full.png', { type: 'image/png' }) : undefined
      scan(
        { image: mainFile, imageAlt: altFile, imageFull: fullFile, gameType: selectedGame, profile },
        { onSettled: () => { scanningRef.current = false } }
      )
    })
  }, [selectedGame, currentFrame, scan, profile])

  function handleImageSelected(file: File) {
    if (!selectedGame) return
    reset()
    scan({ image: file, gameType: selectedGame, profile })
  }

  const isAnalyzing = isPending

  // API response is flat: { success, data, rawText, confidence, ... } — no .result wrapper
  const resultData = scanResult
  const hasStructuredData = resultData?.data && Object.keys(resultData.data).length > 0

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

      {/* Profile selector */}
      {selectedGame && (
        <Div className="mb-6">
          <ProfileSelector value={profile} onChange={setProfile} gameType={selectedGame} />
        </Div>
      )}

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
                roi={roi}
                onRoiChange={handleRoiChange}
              />

              {/* Right: Result */}
              <Div className="space-y-4">
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

                {isPending && (
                  <Div className="text-center py-8">
                    <Div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4" />
                    <P className="text-muted-foreground">{t('scan.scanning')}</P>
                  </Div>
                )}

                {resultData && (
                  <>
                    {resultData.unreliable && (
                      <Div className="rounded-md bg-yellow-500/10 border border-yellow-500/20 px-3 py-2">
                        <P className="text-sm text-yellow-600 dark:text-yellow-400">
                          {t('scan.unreliableResult')}
                        </P>
                      </Div>
                    )}

                    {hasStructuredData && resultData.success && selectedGame === 'summoners-war' && 'set' in resultData.data && (
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

                    {preprocessedPreview && (
                      <Div className="space-y-1">
                        <P className="text-xs text-muted-foreground">{t('scan.preprocessedImage')}</P>
                        <img src={preprocessedPreview} alt="Preprocessed" className="w-full border rounded" />
                      </Div>
                    )}

                    {!hasStructuredData && resultData.rawText && (
                      <Div className="rounded-md bg-yellow-500/10 border border-yellow-500/20 px-3 py-2">
                        <P className="text-sm text-yellow-600 dark:text-yellow-400">
                          {t('scan.parsingImproving', { defaultMessage: 'Structured parsing is being improved. Raw OCR text is shown above.' })}
                        </P>
                      </Div>
                    )}
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

                  {resultData.unreliable && (
                    <Div className="rounded-md bg-yellow-500/10 border border-yellow-500/20 px-3 py-2">
                      <P className="text-sm text-yellow-600 dark:text-yellow-400">
                        {t('scan.unreliableResult')}
                      </P>
                    </Div>
                  )}

                  {hasStructuredData && resultData.success && selectedGame === 'summoners-war' && 'set' in resultData.data && (
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
      )}
    </Div>
  )
}

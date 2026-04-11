'use client'

import {
  Badge,
  Button,
  Div,
  P,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@ezstart/ui/components'
import { logger } from '@ezstart/logger'
import { useTranslations } from 'next-intl'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useParams } from 'next/navigation'
import type { GameType, ScanResult } from '@gacha-analyzer/types'
import type { RoiRect, MaskRect } from '@ezstart/capture-sdk'
import type { ZoneConfig } from '@/components/multi-zone-selector'
import type { RuneCardTemplate } from '@/components/rune-card-templates'
import { CapturePreview } from '@/components/capture-preview'
import { ProfileSelector, usePlayerProfile } from '@/components/profile-selector'
import { useScan } from '@/hooks/use-scan'
import {
  cropImageData,
  preprocessImageData,
  applyBlackoutMasks,
  imageDataToBlob,
  imageDataToJpegBase64,
  quickHash,
  useCapture,
  useFrameDiff,
} from '@ezstart/capture-sdk'
import type { CaptureFrame } from '@ezstart/capture-sdk'
import { useGameLayouts, useGameLayout } from '@/hooks/use-game-config'
import { ScanResults, ScanStatusBar } from './scan-results'

/** Default ROI: top-right area where SW displays the rune */
const DEFAULT_ROI: RoiRect = { x: 60, y: 5, width: 35, height: 40 }

/** Load saved ROI for a given game from localStorage, fallback to DEFAULT_ROI */
function loadRoi(gameType: GameType): RoiRect {
  if (typeof window === 'undefined') return DEFAULT_ROI
  try {
    const saved = localStorage.getItem(`gacha-analyzer-roi-${gameType}`)
    if (saved) return JSON.parse(saved)
  } catch {}
  return DEFAULT_ROI
}

/** Load saved best presets from localStorage */
function loadPresets(gameType: GameType): string[] {
  if (typeof window === 'undefined') return ['upscale-2x']
  try {
    const saved = localStorage.getItem(`gacha-analyzer-best-presets-${gameType}`)
    if (saved) return JSON.parse(saved)
  } catch {}
  return ['upscale-2x']
}

/** Load saved masks from localStorage (empty array = no masks) */
function loadMasks(gameType: GameType): MaskRect[] {
  if (typeof window === 'undefined') return []
  try {
    const saved = localStorage.getItem(`gacha-analyzer-masks-${gameType}`)
    if (saved) return JSON.parse(saved)
  } catch {}
  return []
}

const MAX_SCAN_CACHE = 50

export default function GameScanPage() {
  const t = useTranslations()
  const params = useParams()
  const game = params.game as GameType

  const [profile, setProfile] = usePlayerProfile(game)
  const [runeTemplate, setRuneTemplate] = useState<RuneCardTemplate>(() => {
    if (typeof window === 'undefined') return 'compact'
    try {
      const saved = localStorage.getItem('gacha-analyzer-template')
      if (saved === 'compact' || saved === 'detailed' || saved === 'gaming') return saved
    } catch {}
    return 'compact'
  })
  const handleTemplateChange = useCallback((t: RuneCardTemplate) => {
    setRuneTemplate(t)
    localStorage.setItem('gacha-analyzer-template', t)
  }, [])
  const [roi, setRoi] = useState<RoiRect>(() => loadRoi(game))
  const { mutate: scan, data: scanResult, isPending } = useScan()

  // Layout selector
  const [currentLayoutName, setCurrentLayoutName] = useState<string>('')
  const { data: layouts = [] } = useGameLayouts(game)
  const { data: layoutData } = useGameLayout(game, currentLayoutName)

  // Settings collapsible — hidden by default when a layout is selected
  const [showSettings, setShowSettings] = useState(!layoutData)

  // Session scan counter
  const [scanCount, setScanCount] = useState(0)

  // Image hash cache — avoid duplicate API calls for identical frames
  const scanCacheRef = useRef<Map<string, ScanResult>>(new Map())
  const lastHashRef = useRef<string | null>(null)
  const [cachedResult, setCachedResult] = useState<ScanResult | null>(null)

  // Flash overlay on scan result — visual feedback by tier
  const [flashColor, setFlashColor] = useState<string | null>(null)
  const [flashOpacity, setFlashOpacity] = useState(0)
  const [flashDuration, setFlashDuration] = useState(1000)

  const flashConfig: Record<string, { color: string; intensity: number; duration: number }> =
    useMemo(
      () => ({
        /* Flash colors use rgba() because they are applied via inline style as background overlays
       with dynamic alpha. CSS variables are referenced through getComputedStyle at runtime. */
        sell: { color: 'rgba(239, 68, 68, ALPHA)', intensity: 0.5, duration: 800 },
        upgrade: { color: 'rgba(59, 130, 246, ALPHA)', intensity: 0.4, duration: 1000 },
        keep: { color: 'rgba(34, 197, 94, ALPHA)', intensity: 0.5, duration: 1200 },
        grind: { color: 'rgba(139, 92, 246, ALPHA)', intensity: 0.4, duration: 1000 },
        godlike: { color: 'rgba(255, 180, 0, ALPHA)', intensity: 0.6, duration: 1500 },
        great: { color: 'rgba(139, 92, 246, ALPHA)', intensity: 0.5, duration: 1200 },
        good: { color: 'rgba(59, 130, 246, ALPHA)', intensity: 0.4, duration: 1000 },
      }),
      []
    )

  useEffect(() => {
    const result = cachedResult || scanResult
    if (!result?.analysis) return

    const advice = result.analysis?.progressiveAdvice?.action
    const flashKey = advice || result.analysis.adjustedTier || result.analysis.tier
    const config = (flashConfig[flashKey] || flashConfig.sell)!
    const color = config.color.replace('ALPHA', String(config.intensity))

    setFlashColor(color)
    setFlashDuration(config.duration)
    setFlashOpacity(1)

    const timer = setTimeout(() => setFlashOpacity(0), 50)
    return () => clearTimeout(timer)
  }, [scanResult, cachedResult, flashConfig])

  // Populate image hash cache when API scan completes
  useEffect(() => {
    if (scanResult && lastHashRef.current) {
      setCachedResult(null)
      scanCacheRef.current.set(lastHashRef.current, scanResult)
      if (scanCacheRef.current.size > MAX_SCAN_CACHE) {
        const firstKey = scanCacheRef.current.keys().next().value
        if (firstKey) scanCacheRef.current.delete(firstKey)
      }
    }
  }, [scanResult])

  // Load saved presets from bench — prefer DB layout, fallback localStorage
  const savedPresets = useRef<string[]>(loadPresets(game))

  // Load saved masks from bench — prefer DB layout, fallback localStorage
  const [masks, setMasks] = useState<MaskRect[]>(() => loadMasks(game))
  const masksRef = useRef<MaskRect[]>(masks)

  // Keep a ref to the latest ROI so callbacks always have the current value
  const roiRef = useRef<RoiRect>(roi)
  // Store the full (non-zoomed) frame for the 3rd OCR source
  const fullFrameRef = useRef<ImageData | null>(null)
  const handleRoiChange = useCallback(
    (newRoi: RoiRect) => {
      setRoi(newRoi)
      roiRef.current = newRoi
      localStorage.setItem(`gacha-analyzer-roi-${game}`, JSON.stringify(newRoi))
    },
    [game]
  )

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
    if (layouts.length > 0 && !currentLayoutName && layouts[0]) {
      setCurrentLayoutName(layouts[0].layoutName)
    }
  }, [layouts, currentLayoutName])

  // When a layout is loaded from DB, apply its config and collapse settings
  useEffect(() => {
    if (!layoutData) return

    setShowSettings(false)

    if (layoutData.roi) {
      setRoi(layoutData.roi as unknown as RoiRect)
      roiRef.current = layoutData.roi as unknown as RoiRect
    }
    if (layoutData.bestPresets && layoutData.bestPresets.length > 0) {
      savedPresets.current = layoutData.bestPresets
    }
    if (layoutData.masks && Object.keys(layoutData.masks).length > 0) {
      setMasks(layoutData.masks as unknown as MaskRect[])
      masksRef.current = layoutData.masks as unknown as MaskRect[]
    }
  }, [layoutData])

  // Track whether an auto-scan is in progress to avoid overlapping requests
  const scanningRef = useRef(false)

  /** Build scan files from a cropped frame and send to API */
  const buildAndScan = useCallback(
    (frame: ImageData, thumbnail?: string) => {
      // Generate compressed JPEG thumbnail from the raw crop before preprocessing
      const thumb = thumbnail ?? imageDataToJpegBase64(frame)

      // Apply blackout masks before preprocessing
      const maskedFrame =
        masksRef.current.length > 0 ? applyBlackoutMasks(frame, masksRef.current) : frame
      const processed = preprocessImageData(maskedFrame, {
        scale: 2,
        contrast: 1.0,
        binarize: false,
        grayscale: false,
      })

      // Build all images: preprocessed (main) + raw crop (alt) + full window crop (full)
      const blobPromises: Promise<Blob>[] = [
        imageDataToBlob(processed),
        imageDataToBlob(maskedFrame),
      ]

      // 3rd source: full window frame cropped to ROI at native resolution
      let hasFullBlob = false
      if (fullFrameRef.current) {
        const fullCropped = cropImageData(fullFrameRef.current, roiRef.current)
        const fullMasked =
          masksRef.current.length > 0
            ? applyBlackoutMasks(fullCropped, masksRef.current)
            : fullCropped
        const fullProcessed = preprocessImageData(fullMasked, {
          scale: 2,
          contrast: 1.0,
          binarize: false,
          grayscale: false,
        })
        blobPromises.push(imageDataToBlob(fullProcessed))
        hasFullBlob = true
      }

      Promise.all(blobPromises).then(blobs => {
        const mainFile = new File([blobs[0]!], 'capture.png', { type: 'image/png' })
        const altFile = new File([blobs[1]!], 'capture-raw.png', { type: 'image/png' })
        const fullFile = hasFullBlob
          ? new File([blobs[2]!], 'capture-full.png', { type: 'image/png' })
          : undefined
        scan(
          {
            image: mainFile,
            imageAlt: altFile,
            imageFull: fullFile,
            gameType: game,
            profile,
            benchMode: false,
            presets: savedPresets.current,
            thumbnail: thumb,
          },
          {
            onSettled: () => {
              scanningRef.current = false
            },
          }
        )
      })
    },
    [game, scan, profile]
  )

  const handleSignificantChange = useCallback(
    (frame: ImageData) => {
      if (scanningRef.current) return

      // Check image hash cache before sending to API
      const hash = quickHash(frame)
      const cached = scanCacheRef.current.get(hash)
      if (cached) {
        logger.debug('[scan] Cache hit — skipping OCR')
        setCachedResult(cached)
        return
      }
      lastHashRef.current = hash

      scanningRef.current = true
      setScanCount(prev => prev + 1)

      const thumbnail = imageDataToJpegBase64(frame)
      buildAndScan(frame, thumbnail)
    },
    [buildAndScan]
  )

  const { processFrame } = useFrameDiff({
    onSignificantChange: handleSignificantChange,
    masks,
  })

  const handleFrame = useCallback(
    (frame: CaptureFrame) => {
      // Save the full frame before cropping (for full-window OCR source)
      fullFrameRef.current = frame.imageData
      // Crop frame to ROI before feeding to diff for better sensitivity
      const cropped = cropImageData(frame.imageData, roiRef.current)
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
  } = useCapture({
    provider: 'screen',
    frameInterval: 500,
    onFrame: handleFrame,
  })

  // Auto-collapse settings when capture starts
  useEffect(() => {
    if (isCapturing) setShowSettings(false)
  }, [isCapturing])

  const handleRescan = useCallback(() => {
    if (!currentFrame?.imageData || scanningRef.current) return
    setCachedResult(null)
    scanningRef.current = true
    setScanCount(prev => prev + 1)
    const cropped = cropImageData(currentFrame.imageData, roiRef.current)
    lastHashRef.current = quickHash(cropped)
    const thumbnail = imageDataToJpegBase64(cropped)
    buildAndScan(cropped, thumbnail)
  }, [currentFrame, buildAndScan])

  const isAnalyzing = isPending

  const resultData = cachedResult || scanResult
  const isCachedDisplay = !!cachedResult

  return (
    <Div className="container mx-auto px-4 py-6 max-w-6xl">
      {/* Flash overlay — full-screen color flash on scan result */}
      {flashColor && (
        <Div
          className="fixed inset-0 pointer-events-none z-50"
          style={{
            backgroundColor: flashColor,
            opacity: flashOpacity,
            transition: `opacity ${flashDuration}ms ease-out`,
          }}
        />
      )}

      {/* Capture */}
      <Div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Left: Capture + Controls */}
        <Div className="space-y-4">
          <CapturePreview
            isCapturing={isCapturing}
            isAnalyzing={isAnalyzing}
            isSupported={isSupported}
            currentFrame={currentFrame?.imageData ?? null}
            error={captureError}
            onStart={startCapture}
            onStop={stopCapture}
            roi={roi}
            onRoiChange={handleRoiChange}
            mode="full"
            masks={masks.length > 0 ? masks : undefined}
            onMasksChange={masks.length > 0 ? () => {} : undefined}
            onMaskAdd={masks.length > 0 ? () => {} : undefined}
            onMaskRemove={masks.length > 0 ? () => {} : undefined}
            zones={layoutData?.zones as unknown as ZoneConfig[] | undefined}
            onZonesChange={() => {}}
            zonesLocked={!showSettings && isCapturing}
            maskColor="rgba(255, 0, 0, 0.15)"
            compact={!showSettings && isCapturing}
            extraButtons={
              <Button
                variant="outline"
                onClick={() => setShowSettings(!showSettings)}
                className="h-12 px-4"
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="16"
                  height="16"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  className="mr-1.5"
                >
                  <path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z" />
                  <circle cx="12" cy="12" r="3" />
                </svg>
                {showSettings ? t('scan.hideSettings') : t('scan.settings')}
              </Button>
            }
          />

          {/* Collapsible settings — below capture preview */}
          {showSettings && (
            <Div className="flex flex-wrap items-center gap-3 p-3 rounded-lg border border-border bg-muted/30">
              <ProfileSelector value={profile} onChange={setProfile} gameType={game} />
              {layouts.length > 0 && (
                <Div className="flex items-center gap-2">
                  <P className="text-sm font-medium">{t('bench.layout')}:</P>
                  <Select value={currentLayoutName} onValueChange={setCurrentLayoutName}>
                    <SelectTrigger className="w-[180px]">
                      <SelectValue placeholder={t('bench.layout')} />
                    </SelectTrigger>
                    <SelectContent>
                      {layouts.map(l => (
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

          {isCapturing && (
            <Button
              variant="outline"
              className="w-full"
              disabled={isPending || !currentFrame}
              onClick={handleRescan}
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="mr-2"
              >
                <path d="M21 12a9 9 0 0 0-9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" />
                <path d="M3 3v5h5" />
                <path d="M3 12a9 9 0 0 0 9 9 9.75 9.75 0 0 0 6.74-2.74L21 16" />
                <path d="M16 21h5v-5" />
              </svg>
              {t('scan.capture.rescan')}
            </Button>
          )}

          {/* Status bar */}
          {isCapturing && (
            <ScanStatusBar
              currentLayoutName={currentLayoutName}
              resultData={resultData}
              isCachedDisplay={isCachedDisplay}
              scanCount={scanCount}
            />
          )}
        </Div>

        {/* Right: Results */}
        <ScanResults
          game={game}
          resultData={resultData}
          isPending={isPending}
          isCapturing={isCapturing}
          isCachedDisplay={isCachedDisplay}
          scanCount={scanCount}
          currentLayoutName={currentLayoutName}
          runeTemplate={runeTemplate}
          onTemplateChange={handleTemplateChange}
        />
      </Div>
    </Div>
  )
}

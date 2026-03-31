'use client'

import {
  Button,
  Div,
  P,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@ezstart/ui/components'
import { useTranslations } from 'next-intl'
import { useParams } from 'next/navigation'
import { useCallback, useEffect, useRef, useState } from 'react'
import type { GameType } from '@gacha-analyzer/types'
import type { RoiRect } from '@/components/roi-selector'
import type { MaskRect } from '@/components/blackout-mask'
import type { ZoneConfig } from '@/components/multi-zone-selector'
import { getDefaultZones } from '@/components/multi-zone-selector'
import { CapturePreview } from '@/components/capture-preview'
import { preprocessForOcr } from '@/utils/image-preprocessing'
import {
  applyBlackoutMasks,
  canvasFromImageData,
  cropImageData,
  imageDataToBlob,
} from '@/utils/scan-image-utils'
import { useScan } from '@/hooks/use-scan'
import { useScreenCapture } from '@/hooks/use-screen-capture'
import { useFrameDiff } from '@/hooks/use-frame-diff'
import {
  useGameLayouts,
  useGameLayout,
  useSaveGameLayout,
  useDeleteGameLayout,
} from '@/hooks/use-game-config'
import { BenchResults } from './bench-results'

/** Default ROI: top-right area where SW displays the rune */
const DEFAULT_ROI: RoiRect = { x: 60, y: 5, width: 35, height: 40 }

const DEFAULT_MASKS: MaskRect[] = [
  { id: 'buttons', x: 65, y: 35, width: 30, height: 35 },
  { id: 'score', x: 60, y: 15, width: 35, height: 15 },
  { id: 'sell', x: 65, y: 75, width: 30, height: 20 },
]

export default function BenchPage() {
  const t = useTranslations()
  const params = useParams()
  const game = params.game as GameType

  const [currentLayoutName, setCurrentLayoutName] = useState<string>('')
  const [roi, setRoi] = useState<RoiRect>(DEFAULT_ROI)
  const [zones, setZones] = useState<ZoneConfig[]>(getDefaultZones())
  const [masks, setMasks] = useState<MaskRect[]>(DEFAULT_MASKS)
  const [ocrPreviews, setOcrPreviews] = useState<{ name: string; dataUrl: string }[]>([])
  const [presetsSaved, setPresetsSaved] = useState(false)
  const [zonesLocked, setZonesLocked] = useState(false)
  const { mutate: scan, data: scanResult, isPending } = useScan()

  // Layout hooks
  const { data: layouts = [], isLoading: layoutsLoading } = useGameLayouts(game)
  const { data: layoutData } = useGameLayout(game, currentLayoutName)
  const { mutate: saveLayout } = useSaveGameLayout(game)
  const { mutate: deleteLayout } = useDeleteGameLayout(game)

  const roiRef = useRef<RoiRect>(roi)
  const zonesRef = useRef<ZoneConfig[]>(zones)
  const masksRef = useRef<MaskRect[]>(masks)
  const fullFrameRef = useRef<ImageData | null>(null)
  const scanningRef = useRef(false)

  // Select first layout when layouts load
  useEffect(() => {
    if (layouts.length > 0 && !currentLayoutName && layouts[0]) {
      setCurrentLayoutName(layouts[0].layoutName)
    }
  }, [layouts, currentLayoutName])

  // Apply layout data when a layout is loaded
  useEffect(() => {
    if (!layoutData) return

    if (layoutData.roi) {
      setRoi(layoutData.roi as unknown as RoiRect)
      roiRef.current = layoutData.roi as unknown as RoiRect
    }
    if (layoutData.zones) {
      setZones(layoutData.zones as unknown as ZoneConfig[])
      zonesRef.current = layoutData.zones as unknown as ZoneConfig[]
    }
    if (layoutData.masks) {
      setMasks(layoutData.masks as unknown as MaskRect[])
      masksRef.current = layoutData.masks as unknown as MaskRect[]
    }
  }, [layoutData])

  const handleLayoutChange = useCallback((name: string) => {
    setCurrentLayoutName(name)
    setPresetsSaved(false)
  }, [])

  const handleNewLayout = useCallback(() => {
    const name = prompt(t('bench.layoutName'))
    if (!name) return

    const layoutName = name
      .toLowerCase()
      .replace(/\s+/g, '-')
      .replace(/[^a-z0-9-]/g, '')
    if (!layoutName) return

    saveLayout({
      layoutName,
      displayName: name,
      roi: roiRef.current as unknown as Record<string, unknown>,
      zones: zonesRef.current as unknown as Record<string, unknown>,
      masks: masksRef.current as unknown as Record<string, unknown>,
    })

    setCurrentLayoutName(layoutName)
  }, [t, saveLayout])

  const handleDeleteLayout = useCallback(() => {
    if (!currentLayoutName) return
    const displayName =
      layouts.find(l => l.layoutName === currentLayoutName)?.displayName ?? currentLayoutName
    if (!confirm(`${t('bench.deleteLayout')}: ${displayName}?`)) return

    deleteLayout(currentLayoutName)
    setCurrentLayoutName(layouts.find(l => l.layoutName !== currentLayoutName)?.layoutName ?? '')
  }, [currentLayoutName, layouts, deleteLayout, t])

  const handleRoiChange = useCallback((newRoi: RoiRect) => {
    setRoi(newRoi)
    roiRef.current = newRoi
  }, [])

  const handleZonesChange = useCallback((newZones: ZoneConfig[]) => {
    setZones(newZones)
    zonesRef.current = newZones
  }, [])

  const handleMasksChange = useCallback((newMasks: MaskRect[]) => {
    setMasks(newMasks)
    masksRef.current = newMasks
  }, [])

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

  const handleMaskRemove = useCallback(
    (id: string) => {
      const newMasks = masksRef.current.filter(m => m.id !== id)
      handleMasksChange(newMasks)
    },
    [handleMasksChange]
  )

  const runBenchScan = useCallback(
    (frame: ImageData) => {
      if (scanningRef.current) return
      scanningRef.current = true

      // Apply blackout masks before preprocessing
      const maskedFrame =
        masksRef.current.length > 0 ? applyBlackoutMasks(frame, masksRef.current) : frame

      const processed = preprocessForOcr(maskedFrame, {
        scale: 2,
        contrast: 1.0,
        binarize: false,
        grayscale: false,
      })

      const previewCanvas = document.createElement('canvas')
      previewCanvas.width = processed.width
      previewCanvas.height = processed.height
      previewCanvas.getContext('2d')!.putImageData(processed, 0, 0)

      const blobPromises: Promise<Blob>[] = [
        imageDataToBlob(processed),
        imageDataToBlob(maskedFrame),
      ]

      const rawCanvas = canvasFromImageData(maskedFrame)
      const previews: { name: string; dataUrl: string }[] = [
        { name: 'Zoom Preprocessed', dataUrl: previewCanvas.toDataURL('image/png') },
        { name: 'Zoom Raw', dataUrl: rawCanvas.toDataURL('image/png') },
      ]

      let hasFullBlob = false
      if (fullFrameRef.current) {
        const fullCropped = cropImageData(fullFrameRef.current, roiRef.current)
        const fullMasked =
          masksRef.current.length > 0
            ? applyBlackoutMasks(fullCropped, masksRef.current)
            : fullCropped
        const fullProcessed = preprocessForOcr(fullMasked, {
          scale: 2,
          contrast: 1.0,
          binarize: false,
          grayscale: false,
        })
        blobPromises.push(imageDataToBlob(fullProcessed))
        hasFullBlob = true
        const fullCanvas = canvasFromImageData(fullProcessed)
        previews.push({ name: 'Full Window Crop', dataUrl: fullCanvas.toDataURL('image/png') })
      }

      // Crop zone images from the zoom frame
      const currentZones = zonesRef.current
      const zoneBlobPromises = currentZones.map(async zone => {
        const zoneCropped = cropImageData(maskedFrame, zone.rect)
        const zoneProcessed = preprocessForOcr(zoneCropped, {
          scale: 2,
          contrast: 1.0,
          binarize: false,
          grayscale: false,
        })
        const blob = await imageDataToBlob(zoneProcessed)

        const zoneCanvas = canvasFromImageData(zoneProcessed)
        previews.push({ name: `Zone: ${zone.name}`, dataUrl: zoneCanvas.toDataURL('image/png') })

        return { name: zone.name, blob }
      })

      setPresetsSaved(false)

      Promise.all([Promise.all(blobPromises), Promise.all(zoneBlobPromises)]).then(
        ([blobs, zoneBlobs]) => {
          setOcrPreviews(previews)

          const mainFile = new File([blobs[0]!], 'capture.png', { type: 'image/png' })
          const altFile = new File([blobs[1]!], 'capture-raw.png', { type: 'image/png' })
          const fullFile = hasFullBlob
            ? new File([blobs[2]!], 'capture-full.png', { type: 'image/png' })
            : undefined

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
            {
              onSettled: () => {
                scanningRef.current = false
              },
            }
          )
        }
      )
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

  /** Save the top 3 presets + zones + masks + ROI to the current layout */
  const handleSavePresets = useCallback(() => {
    if (!scanResult?.benchResults) return

    const layoutName = currentLayoutName || 'default'

    const sorted = [...scanResult.benchResults]
      .filter(r => r.success)
      .sort((a, b) => b.subsCount - a.subsCount || b.confidence - a.confidence)

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

    const currentDisplay = layouts.find(l => l.layoutName === layoutName)?.displayName
    saveLayout({
      layoutName,
      displayName: currentDisplay ?? layoutName,
      bestPresets,
      zones: zonesRef.current as unknown as Record<string, unknown>,
      masks: masksRef.current as unknown as Record<string, unknown>,
      roi: roiRef.current as unknown as Record<string, unknown>,
    })

    setPresetsSaved(true)
  }, [scanResult, currentLayoutName, layouts, saveLayout])

  const isAnalyzing = isPending

  return (
    <Div className="container mx-auto px-4 py-8 max-w-6xl">
      <Div className="mb-8">
        <P className="text-sm text-muted-foreground">
          {t(`games.${game}`)} — R&D: {t('bench.description')}
        </P>
      </Div>

      <Div className="space-y-6">
        {/* Layout selector */}
        <Div className="flex items-center gap-2">
          <P className="text-sm font-medium">{t('bench.layout')}:</P>
          <Select
            value={currentLayoutName}
            onValueChange={handleLayoutChange}
            disabled={layoutsLoading}
          >
            <SelectTrigger className="w-[200px]">
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
          <Button size="sm" variant="outline" onClick={handleNewLayout}>
            +
          </Button>
          {currentLayoutName && layouts.length > 1 && (
            <Button size="sm" variant="destructive" onClick={handleDeleteLayout}>
              {t('bench.deleteLayout')}
            </Button>
          )}
        </Div>

        {/* Lock/unlock toggle for zones and masks */}
        <Div className="flex justify-end">
          <Button variant="outline" size="sm" onClick={() => setZonesLocked(!zonesLocked)}>
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
          mode="both"
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

        {/* Loading */}
        {isPending && (
          <Div className="text-center py-8">
            <Div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4" />
            <P className="text-muted-foreground">{t('bench.running')}</P>
          </Div>
        )}

        {/* Results */}
        <BenchResults
          resultData={scanResult}
          ocrPreviews={ocrPreviews}
          presetsSaved={presetsSaved}
          onSavePresets={handleSavePresets}
        />

        {/* Waiting state */}
        {!scanResult && !isPending && isCapturing && (
          <Div className="text-center py-8">
            <P className="text-muted-foreground text-sm">{t('scan.capture.waitingForChange')}</P>
          </Div>
        )}
      </Div>
    </Div>
  )
}

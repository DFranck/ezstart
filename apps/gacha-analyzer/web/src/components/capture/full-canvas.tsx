'use client'

import { Card, Div, Span } from '@ezstart/ui/components'
import { useTranslations } from 'next-intl'
import { RoiSelector, type RoiRect } from '@ezstart/capture-sdk'
import type { ZoneConfig } from '../multi-zone-selector'
import { MultiZoneSelector } from '../multi-zone-selector'
import { BlackoutMask, type MaskRect } from '@ezstart/capture-sdk'

interface ViewPort {
  x: number
  y: number
  width: number
  height: number
}

interface FullCanvasProps {
  fullContainerRef: React.RefObject<HTMLDivElement | null>
  fullCanvasRef: React.RefObject<HTMLCanvasElement | null>
  effectiveHeight: number
  viewPort: ViewPort
  roi?: RoiRect
  onRoiChange?: (roi: RoiRect) => void
  zones?: ZoneConfig[]
  onZonesChange?: (zones: ZoneConfig[]) => void
  masks?: MaskRect[]
  onMasksChange?: (masks: MaskRect[]) => void
  onMaskAdd?: () => void
  onMaskRemove?: (id: string) => void
  zonesLocked: boolean
  maskColor?: string
  disableZoom: boolean
  compact: boolean
  fullZoomPercent: number
  isFullZoomed: boolean
  onFullZoomIn: () => void
  onFullZoomOut: () => void
  onFullZoomReset: () => void
  onStartResize: (e: React.MouseEvent) => void
}

export function FullCanvas({
  fullContainerRef,
  fullCanvasRef,
  effectiveHeight,
  viewPort,
  roi,
  onRoiChange,
  zones,
  onZonesChange,
  masks,
  onMasksChange,
  onMaskAdd,
  onMaskRemove,
  zonesLocked,
  maskColor,
  disableZoom,
  compact,
  fullZoomPercent,
  isFullZoomed,
  onFullZoomIn,
  onFullZoomOut,
  onFullZoomReset,
  onStartResize,
}: FullCanvasProps) {
  const t = useTranslations('scan')

  const vpScale = 100 / viewPort.width
  const vpTranslateX = -viewPort.x
  const vpTranslateY = -viewPort.y

  return (
    <Card className="bg-muted">
      <Div
        ref={fullContainerRef}
        className="relative overflow-hidden"
        style={{
          height: effectiveHeight,
          cursor: isFullZoomed ? 'grab' : undefined,
        }}
      >
        {/* Scaled inner container */}
        <Div
          style={{
            transform: `scale(${vpScale}) translate(${vpTranslateX}%, ${vpTranslateY}%)`,
            transformOrigin: 'top left',
            width: '100%',
            height: '100%',
            position: 'absolute',
            top: 0,
            left: 0,
          }}
        >
          <canvas
            ref={fullCanvasRef}
            className="w-full block"
            style={{ height: effectiveHeight, pointerEvents: 'none' }}
          />
          {roi && onRoiChange && (
            <RoiSelector onChange={onRoiChange} initialRoi={roi} locked={zonesLocked} />
          )}
          {zones && onZonesChange && roi && (
            <MultiZoneSelector
              onChange={onZonesChange}
              initialZones={zones}
              parentRoi={roi}
              locked={zonesLocked}
            />
          )}
          {masks && onMasksChange && onMaskAdd && onMaskRemove && roi && (
            <BlackoutMask
              masks={masks}
              onChange={onMasksChange}
              onAdd={onMaskAdd}
              onRemove={onMaskRemove}
              parentRoi={roi}
              locked={zonesLocked}
              maskColor={maskColor}
            />
          )}
        </Div>
        {/* Zoom controls for full view */}
        {!disableZoom && !compact && (
          <Div className="absolute bottom-2 right-2 flex items-center gap-1 bg-black/60 rounded-md px-2 py-1 z-40">
            <button
              type="button"
              onClick={onFullZoomOut}
              className="text-white text-xs font-bold px-1.5 py-0.5 hover:bg-white/20 rounded"
              title={t('capture.zoomOut')}
              aria-label={t('capture.zoomOut')}
            >
              -
            </button>
            <Span className="text-white text-xs font-mono min-w-[3rem] text-center">
              {fullZoomPercent}%
            </Span>
            <button
              type="button"
              onClick={onFullZoomIn}
              className="text-white text-xs font-bold px-1.5 py-0.5 hover:bg-white/20 rounded"
              title={t('capture.zoomIn')}
              aria-label={t('capture.zoomIn')}
            >
              +
            </button>
            {isFullZoomed && (
              <button
                type="button"
                onClick={onFullZoomReset}
                className="text-white text-xs px-1.5 py-0.5 hover:bg-white/20 rounded ml-1"
                title={t('capture.resetZoom')}
                aria-label={t('capture.resetZoom')}
              >
                1:1
              </button>
            )}
          </Div>
        )}
        {/* Resize handle */}
        {!compact && (
          <Div
            className="absolute bottom-0 right-0 w-6 h-6 cursor-se-resize z-50"
            onMouseDown={onStartResize}
            style={{
              background: 'linear-gradient(135deg, transparent 50%, rgba(255,255,255,0.3) 50%)',
              borderRadius: '0 0 8px 0',
            }}
          />
        )}
      </Div>
    </Card>
  )
}

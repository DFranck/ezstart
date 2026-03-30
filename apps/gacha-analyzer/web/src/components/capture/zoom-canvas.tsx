'use client'

import { Card, Div, Span } from '@ezstart/ui/components'
import { useTranslations } from 'next-intl'
import type { ZoneConfig } from '../multi-zone-selector'
import { MultiZoneSelector } from '../multi-zone-selector'
import type { MaskRect } from '../blackout-mask'
import { BlackoutMask } from '../blackout-mask'

interface ZoomCanvasProps {
  containerRef: React.RefObject<HTMLDivElement | null>
  canvasRef: React.RefObject<HTMLCanvasElement | null>
  effectiveHeight: number
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
  zoomPercent: number
  onZoomIn: () => void
  onZoomOut: () => void
  onStartResize: (e: React.MouseEvent) => void
}

export function ZoomCanvas({
  containerRef,
  canvasRef,
  effectiveHeight,
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
  zoomPercent,
  onZoomIn,
  onZoomOut,
  onStartResize,
}: ZoomCanvasProps) {
  const t = useTranslations('scan')

  return (
    <Card className="bg-muted">
      <Div
        ref={containerRef}
        className="relative overflow-hidden"
        style={{ height: effectiveHeight }}
      >
        <canvas
          ref={canvasRef}
          className="w-full block"
          style={{ cursor: 'grab', touchAction: 'none', height: effectiveHeight }}
        />
        {/* Multi-zone overlay on zoom view */}
        {zones && onZonesChange && (
          <MultiZoneSelector onChange={onZonesChange} initialZones={zones} locked={zonesLocked} />
        )}
        {/* Blackout mask overlay on zoom view */}
        {masks && onMasksChange && onMaskAdd && onMaskRemove && (
          <BlackoutMask
            masks={masks}
            onChange={onMasksChange}
            onAdd={onMaskAdd}
            onRemove={onMaskRemove}
            locked={zonesLocked}
            maskColor={maskColor}
          />
        )}
        {/* Zoom indicator + buttons */}
        {!disableZoom && !compact && (
          <Div className="absolute bottom-2 right-2 flex items-center gap-1 bg-black/60 rounded-md px-2 py-1">
            <button
              type="button"
              onClick={onZoomOut}
              className="text-white text-xs font-bold px-1.5 py-0.5 hover:bg-white/20 rounded"
              title={t('capture.zoomOut')}
            >
              -
            </button>
            <Span className="text-white text-xs font-mono min-w-[3rem] text-center">
              {t('capture.zoom')}: {zoomPercent}%
            </Span>
            <button
              type="button"
              onClick={onZoomIn}
              className="text-white text-xs font-bold px-1.5 py-0.5 hover:bg-white/20 rounded"
              title={t('capture.zoomIn')}
            >
              +
            </button>
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

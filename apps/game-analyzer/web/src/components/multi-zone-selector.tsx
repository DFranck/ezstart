'use client'

import { useEffect, useRef, useState, useCallback } from 'react'
import { useTranslations } from 'next-intl'
import type { RoiRect } from './roi-selector'

export type ZoneName = 'setSlot' | 'mainStat' | 'quality' | 'innate' | 'sub1' | 'sub2' | 'sub3' | 'sub4'

export interface ZoneConfig {
  name: ZoneName
  label: string
  color: string
  rect: RoiRect // position in % relative to the container (zoom view)
}

const DEFAULT_ZONES: ZoneConfig[] = [
  { name: 'setSlot', label: 'bench.zone.setSlot', color: '#3b82f6', rect: { x: 15, y: 0, width: 65, height: 8 } },
  { name: 'mainStat', label: 'bench.zone.mainStat', color: '#22c55e', rect: { x: 10, y: 10, width: 40, height: 10 } },
  { name: 'quality', label: 'bench.zone.quality', color: '#eab308', rect: { x: 55, y: 10, width: 25, height: 10 } },
  { name: 'innate', label: 'bench.zone.innate', color: '#a855f7', rect: { x: 5, y: 22, width: 45, height: 8 } },
  { name: 'sub1', label: 'bench.zone.sub1', color: '#ef4444', rect: { x: 5, y: 32, width: 45, height: 8 } },
  { name: 'sub2', label: 'bench.zone.sub2', color: '#ef4444', rect: { x: 5, y: 42, width: 45, height: 8 } },
  { name: 'sub3', label: 'bench.zone.sub3', color: '#ef4444', rect: { x: 5, y: 52, width: 45, height: 8 } },
  { name: 'sub4', label: 'bench.zone.sub4', color: '#ef4444', rect: { x: 5, y: 62, width: 45, height: 8 } },
]

type Handle = 'nw' | 'n' | 'ne' | 'e' | 'se' | 's' | 'sw' | 'w'

const MIN_SIZE = 5 // minimum 5% width/height

function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max)
}

interface MultiZoneSelectorProps {
  onChange: (zones: ZoneConfig[]) => void
  initialZones?: ZoneConfig[]
  /** When provided, zone percentages are mapped within this ROI inside the full container */
  parentRoi?: RoiRect
  /** When true, zones are visible but not interactive (no drag/resize) */
  locked?: boolean
}

export function MultiZoneSelector({ onChange, initialZones, parentRoi, locked = false }: MultiZoneSelectorProps) {
  const t = useTranslations()
  const [zones, setZones] = useState<ZoneConfig[]>(initialZones ?? DEFAULT_ZONES)
  const [selectedZone, setSelectedZone] = useState<string | null>(null)

  const dragRef = useRef<{
    zoneName: ZoneName
    type: 'move' | 'resize'
    handle?: Handle
    startMouseX: number
    startMouseY: number
    startRect: RoiRect
  } | null>(null)

  const overlayRef = useRef<HTMLDivElement>(null)
  const onChangeRef = useRef(onChange)
  onChangeRef.current = onChange
  const zonesRef = useRef(zones)
  zonesRef.current = zones
  const parentRoiRef = useRef(parentRoi)
  parentRoiRef.current = parentRoi

  // Sync initial zones from props when not dragging
  useEffect(() => {
    if (initialZones && !dragRef.current) {
      setZones(initialZones)
    }
  }, [initialZones])

  // Global mouse/touch handlers
  useEffect(() => {
    function handleMove(clientX: number, clientY: number) {
      const drag = dragRef.current
      if (!drag) return

      const overlay = overlayRef.current
      if (!overlay) return
      const rect = overlay.getBoundingClientRect()
      if (rect.width === 0 || rect.height === 0) return

      // Convert pixel delta to % of overlay, then scale to zone coordinate space
      const pr = parentRoiRef.current
      const scaleX = pr ? (100 / pr.width) : 1
      const scaleY = pr ? (100 / pr.height) : 1
      const dx = ((clientX - drag.startMouseX) / rect.width) * 100 * scaleX
      const dy = ((clientY - drag.startMouseY) / rect.height) * 100 * scaleY
      let newRect: RoiRect

      if (drag.type === 'move') {
        const newX = clamp(drag.startRect.x + dx, 0, 100 - drag.startRect.width)
        const newY = clamp(drag.startRect.y + dy, 0, 100 - drag.startRect.height)
        newRect = { ...drag.startRect, x: newX, y: newY }
      } else if (drag.type === 'resize' && drag.handle) {
        const s = drag.startRect
        let newX = s.x
        let newY = s.y
        let newW = s.width
        let newH = s.height

        switch (drag.handle) {
          case 'se':
            newW = clamp(s.width + dx, MIN_SIZE, 100 - s.x)
            newH = clamp(s.height + dy, MIN_SIZE, 100 - s.y)
            break
          case 'sw':
            newW = clamp(s.width - dx, MIN_SIZE, s.x + s.width)
            newX = s.x + s.width - newW
            newH = clamp(s.height + dy, MIN_SIZE, 100 - s.y)
            break
          case 'ne':
            newW = clamp(s.width + dx, MIN_SIZE, 100 - s.x)
            newH = clamp(s.height - dy, MIN_SIZE, s.y + s.height)
            newY = s.y + s.height - newH
            break
          case 'nw':
            newW = clamp(s.width - dx, MIN_SIZE, s.x + s.width)
            newX = s.x + s.width - newW
            newH = clamp(s.height - dy, MIN_SIZE, s.y + s.height)
            newY = s.y + s.height - newH
            break
          case 'n':
            newH = clamp(s.height - dy, MIN_SIZE, s.y + s.height)
            newY = s.y + s.height - newH
            break
          case 's':
            newH = clamp(s.height + dy, MIN_SIZE, 100 - s.y)
            break
          case 'e':
            newW = clamp(s.width + dx, MIN_SIZE, 100 - s.x)
            break
          case 'w':
            newW = clamp(s.width - dx, MIN_SIZE, s.x + s.width)
            newX = s.x + s.width - newW
            break
        }

        newRect = { x: newX, y: newY, width: newW, height: newH }
      } else {
        return
      }

      const updated = zonesRef.current.map(z =>
        z.name === drag.zoneName ? { ...z, rect: newRect } : z
      )
      setZones(updated)
      zonesRef.current = updated
    }

    function handleEnd() {
      if (dragRef.current) {
        onChangeRef.current(zonesRef.current)
      }
      dragRef.current = null
    }

    function handleMouseMove(e: MouseEvent) {
      handleMove(e.clientX, e.clientY)
    }

    function handleTouchMove(e: TouchEvent) {
      const touch = e.touches[0]
      if (e.touches.length === 1 && touch) {
        e.preventDefault()
        handleMove(touch.clientX, touch.clientY)
      }
    }

    window.addEventListener('mousemove', handleMouseMove)
    window.addEventListener('mouseup', handleEnd)
    window.addEventListener('touchmove', handleTouchMove, { passive: false })
    window.addEventListener('touchend', handleEnd)

    return () => {
      window.removeEventListener('mousemove', handleMouseMove)
      window.removeEventListener('mouseup', handleEnd)
      window.removeEventListener('touchmove', handleTouchMove)
      window.removeEventListener('touchend', handleEnd)
    }
  }, [])

  function startDrag(
    zoneName: ZoneName,
    clientX: number,
    clientY: number,
    type: 'move' | 'resize',
    handle?: Handle,
  ) {
    const zone = zonesRef.current.find(z => z.name === zoneName)
    if (!zone) return
    dragRef.current = {
      zoneName,
      type,
      handle,
      startMouseX: clientX,
      startMouseY: clientY,
      startRect: { ...zone.rect },
    }
  }

  function handleMouseDown(e: React.MouseEvent, zoneName: ZoneName, type: 'move' | 'resize', handle?: Handle) {
    e.preventDefault()
    e.stopPropagation()
    startDrag(zoneName, e.clientX, e.clientY, type, handle)
  }

  function handleTouchStart(e: React.TouchEvent, zoneName: ZoneName, type: 'move' | 'resize', handle?: Handle) {
    e.stopPropagation()
    const touch = e.touches[0]
    if (e.touches.length === 1 && touch) {
      startDrag(zoneName, touch.clientX, touch.clientY, type, handle)
    }
  }

  const corners: Handle[] = ['nw', 'ne', 'sw', 'se']
  const edges: Handle[] = ['n', 's', 'e', 'w']
  const allHandles: Handle[] = [...corners, ...edges]

  const getHandleStyle = (handle: Handle, color: string): React.CSSProperties => {
    const base: React.CSSProperties = {
      position: 'absolute',
      backgroundColor: color,
      border: '1px solid rgba(0,0,0,0.5)',
      borderRadius: 1,
      zIndex: 60,
      pointerEvents: 'auto',
      touchAction: 'none',
    }

    switch (handle) {
      case 'nw':
        return { ...base, width: 10, height: 10, top: -5, left: -5, cursor: 'nw-resize' }
      case 'ne':
        return { ...base, width: 10, height: 10, top: -5, right: -5, cursor: 'ne-resize' }
      case 'sw':
        return { ...base, width: 10, height: 10, bottom: -5, left: -5, cursor: 'sw-resize' }
      case 'se':
        return { ...base, width: 10, height: 10, bottom: -5, right: -5, cursor: 'se-resize' }
      case 'n':
        return { ...base, width: 20, height: 8, top: -4, left: '50%', transform: 'translateX(-50%)', cursor: 'n-resize' }
      case 's':
        return { ...base, width: 20, height: 8, bottom: -4, left: '50%', transform: 'translateX(-50%)', cursor: 's-resize' }
      case 'e':
        return { ...base, width: 8, height: 20, right: -4, top: '50%', transform: 'translateY(-50%)', cursor: 'e-resize' }
      case 'w':
        return { ...base, width: 8, height: 20, left: -4, top: '50%', transform: 'translateY(-50%)', cursor: 'w-resize' }
    }
  }

  return (
    <div
      ref={overlayRef}
      style={{
        position: 'absolute',
        inset: 0,
        zIndex: 50,
        pointerEvents: 'none',
      }}
    >
      {zones.map(zone => {
        // When parentRoi is set, map zone % into the ROI area within the full container
        const displayLeft = parentRoi
          ? parentRoi.x + (zone.rect.x / 100) * parentRoi.width
          : zone.rect.x
        const displayTop = parentRoi
          ? parentRoi.y + (zone.rect.y / 100) * parentRoi.height
          : zone.rect.y
        const displayWidth = parentRoi
          ? (zone.rect.width / 100) * parentRoi.width
          : zone.rect.width
        const displayHeight = parentRoi
          ? (zone.rect.height / 100) * parentRoi.height
          : zone.rect.height

        return (
        <div
          key={zone.name}
          style={{
            position: 'absolute',
            left: `${displayLeft}%`,
            top: `${displayTop}%`,
            width: `${displayWidth}%`,
            height: `${displayHeight}%`,
            border: `2px solid ${zone.color}`,
            backgroundColor: `${zone.color}26`, // ~15% opacity
            cursor: locked ? 'default' : 'move',
            pointerEvents: locked ? 'none' : 'auto',
            boxSizing: 'border-box',
            touchAction: 'none',
            overflow: 'visible',
            zIndex: 55,
          }}
          onMouseDown={locked ? undefined : (e) => handleMouseDown(e, zone.name, 'move')}
          onTouchStart={locked ? undefined : (e) => handleTouchStart(e, zone.name, 'move')}
          onClick={() => !locked && setSelectedZone(zone.name === selectedZone ? null : zone.name)}
        >
          {/* Zone label */}
          <span
            style={{
              position: 'absolute',
              top: -16,
              left: 0,
              fontSize: 10,
              lineHeight: '14px',
              color: zone.color,
              backgroundColor: 'rgba(0,0,0,0.7)',
              padding: '0 3px',
              borderRadius: 2,
              whiteSpace: 'nowrap',
              pointerEvents: 'none',
              userSelect: 'none',
            }}
          >
            {t(zone.label)}
          </span>

          {/* Resize handles (corners + edges) — hidden when locked */}
          {!locked && allHandles.map((handle) => (
            <div
              key={handle}
              style={getHandleStyle(handle, zone.color)}
              onMouseDown={(e) => handleMouseDown(e, zone.name, 'resize', handle)}
              onTouchStart={(e) => handleTouchStart(e, zone.name, 'resize', handle)}
            />
          ))}

          {/* Inline position/size editor */}
          {selectedZone === zone.name && !locked && (
            <div style={{
              position: 'absolute',
              top: '100%',
              left: 0,
              marginTop: 4,
              background: 'rgba(0,0,0,0.95)',
              padding: '6px 8px',
              borderRadius: 6,
              display: 'flex',
              gap: 6,
              zIndex: 200,
              fontSize: 11,
              color: 'white',
              alignItems: 'center',
              whiteSpace: 'nowrap',
            }}>
              <span style={{ fontWeight: 'bold', marginRight: 4 }}>{t(zone.label)}</span>
              {(['x', 'y', 'width', 'height'] as const).map(prop => (
                <label key={prop} style={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                  {prop[0].toUpperCase()}:
                  <input
                    type="number"
                    value={Math.round(zone.rect[prop])}
                    onChange={e => {
                      const newRect = { ...zone.rect, [prop]: Number(e.target.value) }
                      const updated = zones.map(z => z.name === zone.name ? { ...z, rect: newRect } : z)
                      setZones(updated)
                      onChangeRef.current(updated)
                    }}
                    onMouseDown={e => e.stopPropagation()}
                    onClick={e => e.stopPropagation()}
                    style={{ width: 42, background: '#333', color: 'white', border: '1px solid #555', borderRadius: 3, padding: '2px 4px', fontSize: 11 }}
                    min={0}
                    max={100}
                  />
                </label>
              ))}
              {zone.name.startsWith('sub') && (
                <button
                  onClick={(e) => {
                    e.stopPropagation()
                    const currentRect = zone.rect
                    const updated = zones.map(z =>
                      z.name.startsWith('sub') ? { ...z, rect: { ...z.rect, width: currentRect.width, height: currentRect.height } } : z
                    )
                    setZones(updated)
                    onChangeRef.current(updated)
                  }}
                  style={{ background: '#4a5', color: 'white', border: 'none', borderRadius: 3, padding: '2px 6px', fontSize: 10, cursor: 'pointer' }}
                >
                  → Tous subs
                </button>
              )}
            </div>
          )}
        </div>
        )
      })}
    </div>
  )
}

export function getDefaultZones(): ZoneConfig[] {
  return DEFAULT_ZONES.map(z => ({ ...z, rect: { ...z.rect } }))
}

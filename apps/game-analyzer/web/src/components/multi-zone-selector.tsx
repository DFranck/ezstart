'use client'

import { useEffect, useRef, useState, useCallback } from 'react'
import { useTranslations } from 'next-intl'
import type { RoiRect } from './roi-selector'

export type ZoneName = 'header' | 'main' | 'substats' | 'setbonus'

export interface ZoneConfig {
  name: ZoneName
  label: string
  color: string
  rect: RoiRect // position in % relative to the container (zoom view)
}

const DEFAULT_ZONES: ZoneConfig[] = [
  { name: 'header', label: 'bench.zone.header', color: '#3b82f6', rect: { x: 10, y: 0, width: 80, height: 12 } },
  { name: 'main', label: 'bench.zone.main', color: '#22c55e', rect: { x: 10, y: 12, width: 60, height: 15 } },
  { name: 'substats', label: 'bench.zone.substats', color: '#ef4444', rect: { x: 5, y: 30, width: 55, height: 50 } },
  { name: 'setbonus', label: 'bench.zone.setbonus', color: '#eab308', rect: { x: 5, y: 82, width: 70, height: 15 } },
]

type Corner = 'nw' | 'ne' | 'sw' | 'se'

const MIN_SIZE = 5 // minimum 5% width/height

function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max)
}

interface MultiZoneSelectorProps {
  onChange: (zones: ZoneConfig[]) => void
  initialZones?: ZoneConfig[]
}

export function MultiZoneSelector({ onChange, initialZones }: MultiZoneSelectorProps) {
  const t = useTranslations()
  const [zones, setZones] = useState<ZoneConfig[]>(initialZones ?? DEFAULT_ZONES)

  const dragRef = useRef<{
    zoneName: ZoneName
    type: 'move' | 'resize'
    corner?: Corner
    startMouseX: number
    startMouseY: number
    startRect: RoiRect
  } | null>(null)

  const overlayRef = useRef<HTMLDivElement>(null)
  const onChangeRef = useRef(onChange)
  onChangeRef.current = onChange
  const zonesRef = useRef(zones)
  zonesRef.current = zones

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

      const dx = ((clientX - drag.startMouseX) / rect.width) * 100
      const dy = ((clientY - drag.startMouseY) / rect.height) * 100
      let newRect: RoiRect

      if (drag.type === 'move') {
        const newX = clamp(drag.startRect.x + dx, 0, 100 - drag.startRect.width)
        const newY = clamp(drag.startRect.y + dy, 0, 100 - drag.startRect.height)
        newRect = { ...drag.startRect, x: newX, y: newY }
      } else if (drag.type === 'resize' && drag.corner) {
        const s = drag.startRect
        let newX = s.x
        let newY = s.y
        let newW = s.width
        let newH = s.height

        switch (drag.corner) {
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
    corner?: Corner,
  ) {
    const zone = zonesRef.current.find(z => z.name === zoneName)
    if (!zone) return
    dragRef.current = {
      zoneName,
      type,
      corner,
      startMouseX: clientX,
      startMouseY: clientY,
      startRect: { ...zone.rect },
    }
  }

  function handleMouseDown(e: React.MouseEvent, zoneName: ZoneName, type: 'move' | 'resize', corner?: Corner) {
    e.preventDefault()
    e.stopPropagation()
    startDrag(zoneName, e.clientX, e.clientY, type, corner)
  }

  function handleTouchStart(e: React.TouchEvent, zoneName: ZoneName, type: 'move' | 'resize', corner?: Corner) {
    e.stopPropagation()
    const touch = e.touches[0]
    if (e.touches.length === 1 && touch) {
      startDrag(zoneName, touch.clientX, touch.clientY, type, corner)
    }
  }

  const corners: Corner[] = ['nw', 'ne', 'sw', 'se']

  const handleStyle = (corner: Corner, color: string): React.CSSProperties => {
    const base: React.CSSProperties = {
      position: 'absolute',
      width: 10,
      height: 10,
      backgroundColor: color,
      border: '1px solid rgba(0,0,0,0.5)',
      borderRadius: 1,
      zIndex: 60,
      pointerEvents: 'auto',
      touchAction: 'none',
    }

    switch (corner) {
      case 'nw':
        return { ...base, top: -5, left: -5, cursor: 'nw-resize' }
      case 'ne':
        return { ...base, top: -5, right: -5, cursor: 'ne-resize' }
      case 'sw':
        return { ...base, bottom: -5, left: -5, cursor: 'sw-resize' }
      case 'se':
        return { ...base, bottom: -5, right: -5, cursor: 'se-resize' }
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
      {zones.map(zone => (
        <div
          key={zone.name}
          style={{
            position: 'absolute',
            left: `${zone.rect.x}%`,
            top: `${zone.rect.y}%`,
            width: `${zone.rect.width}%`,
            height: `${zone.rect.height}%`,
            border: `2px solid ${zone.color}`,
            backgroundColor: `${zone.color}26`, // ~15% opacity
            cursor: 'move',
            pointerEvents: 'auto',
            boxSizing: 'border-box',
            touchAction: 'none',
            overflow: 'visible',
            zIndex: 55,
          }}
          onMouseDown={(e) => handleMouseDown(e, zone.name, 'move')}
          onTouchStart={(e) => handleTouchStart(e, zone.name, 'move')}
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

          {/* Corner handles */}
          {corners.map((corner) => (
            <div
              key={corner}
              style={handleStyle(corner, zone.color)}
              onMouseDown={(e) => handleMouseDown(e, zone.name, 'resize', corner)}
              onTouchStart={(e) => handleTouchStart(e, zone.name, 'resize', corner)}
            />
          ))}
        </div>
      ))}
    </div>
  )
}

export function getDefaultZones(): ZoneConfig[] {
  return DEFAULT_ZONES.map(z => ({ ...z, rect: { ...z.rect } }))
}

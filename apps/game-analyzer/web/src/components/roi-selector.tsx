'use client'

import { useEffect, useRef, useState } from 'react'

export interface RoiRect {
  x: number      // % of container (0-100)
  y: number      // % of container (0-100)
  width: number  // % of container (0-100)
  height: number // % of container (0-100)
}

interface RoiSelectorProps {
  /** @deprecated No longer needed — overlay measures itself via getBoundingClientRect */
  containerWidth?: number
  /** @deprecated No longer needed — overlay measures itself via getBoundingClientRect */
  containerHeight?: number
  onChange: (roi: RoiRect) => void
  initialRoi?: RoiRect
}

type Corner = 'nw' | 'ne' | 'sw' | 'se'

const MIN_SIZE = 10 // minimum 10% width/height

function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max)
}

export function RoiSelector({
  onChange,
  initialRoi,
}: RoiSelectorProps) {
  const [roi, setRoi] = useState<RoiRect>(
    initialRoi ?? { x: 60, y: 5, width: 35, height: 40 }
  )

  const dragRef = useRef<{
    type: 'move' | 'resize'
    corner?: Corner
    startMouseX: number
    startMouseY: number
    startRoi: RoiRect
  } | null>(null)

  const overlayRef = useRef<HTMLDivElement>(null)

  const onChangeRef = useRef(onChange)
  onChangeRef.current = onChange

  const roiRef = useRef(roi)
  roiRef.current = roi

  // Sync initial roi from props — but NOT while dragging
  useEffect(() => {
    if (initialRoi && !dragRef.current) {
      setRoi(initialRoi)
    }
  }, [initialRoi])

  // Register mousemove/mouseup/touch listeners once — stable, no re-registering
  useEffect(() => {
    function handleMove(clientX: number, clientY: number) {
      const drag = dragRef.current
      if (!drag) return

      // Measure overlay directly instead of relying on props (may be 0 or stale)
      const overlay = overlayRef.current
      if (!overlay) return
      const rect = overlay.getBoundingClientRect()
      if (rect.width === 0 || rect.height === 0) return

      const dx = ((clientX - drag.startMouseX) / rect.width) * 100
      const dy = ((clientY - drag.startMouseY) / rect.height) * 100
      let newRoi: RoiRect

      if (drag.type === 'move') {
        const newX = clamp(drag.startRoi.x + dx, 0, 100 - drag.startRoi.width)
        const newY = clamp(drag.startRoi.y + dy, 0, 100 - drag.startRoi.height)
        newRoi = { ...drag.startRoi, x: newX, y: newY }
      } else if (drag.type === 'resize' && drag.corner) {
        const s = drag.startRoi
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

        newRoi = { x: newX, y: newY, width: newW, height: newH }
      } else {
        return
      }

      setRoi(newRoi)
      roiRef.current = newRoi
    }

    function handleEnd() {
      if (dragRef.current) {
        onChangeRef.current(roiRef.current)
      }
      dragRef.current = null
    }

    function handleMouseMove(e: MouseEvent) {
      handleMove(e.clientX, e.clientY)
    }

    function handleTouchMove(e: TouchEvent) {
      if (e.touches.length === 1) {
        e.preventDefault()
        handleMove(e.touches[0].clientX, e.touches[0].clientY)
      }
    }

    function handleMouseUp() {
      handleEnd()
    }

    function handleTouchEnd() {
      handleEnd()
    }

    window.addEventListener('mousemove', handleMouseMove)
    window.addEventListener('mouseup', handleMouseUp)
    window.addEventListener('touchmove', handleTouchMove, { passive: false })
    window.addEventListener('touchend', handleTouchEnd)

    return () => {
      window.removeEventListener('mousemove', handleMouseMove)
      window.removeEventListener('mouseup', handleMouseUp)
      window.removeEventListener('touchmove', handleTouchMove)
      window.removeEventListener('touchend', handleTouchEnd)
    }
  }, []) // stable — no deps, uses refs only

  function startDrag(
    clientX: number,
    clientY: number,
    type: 'move' | 'resize',
    corner?: Corner,
  ) {
    dragRef.current = {
      type,
      corner,
      startMouseX: clientX,
      startMouseY: clientY,
      startRoi: { ...roiRef.current },
    }
  }

  function handleMouseDown(e: React.MouseEvent, type: 'move' | 'resize', corner?: Corner) {
    e.preventDefault()
    e.stopPropagation()
    startDrag(e.clientX, e.clientY, type, corner)
  }

  function handleTouchStart(e: React.TouchEvent, type: 'move' | 'resize', corner?: Corner) {
    e.stopPropagation()
    if (e.touches.length === 1) {
      startDrag(e.touches[0].clientX, e.touches[0].clientY, type, corner)
    }
  }

  const handleStyle = (corner: Corner): React.CSSProperties => {
    const base: React.CSSProperties = {
      position: 'absolute',
      width: 16,
      height: 16,
      backgroundColor: 'red',
      border: '2px solid darkred',
      borderRadius: 2,
      zIndex: 60,
      pointerEvents: 'auto',
      touchAction: 'none',
    }

    switch (corner) {
      case 'nw':
        return { ...base, top: -8, left: -8, cursor: 'nw-resize' }
      case 'ne':
        return { ...base, top: -8, right: -8, cursor: 'ne-resize' }
      case 'sw':
        return { ...base, bottom: -8, left: -8, cursor: 'sw-resize' }
      case 'se':
        return { ...base, bottom: -8, right: -8, cursor: 'se-resize' }
    }
  }

  const corners: Corner[] = ['nw', 'ne', 'sw', 'se']

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
      {/* ROI rectangle */}
      <div
        style={{
          position: 'absolute',
          left: `${roi.x}%`,
          top: `${roi.y}%`,
          width: `${roi.width}%`,
          height: `${roi.height}%`,
          border: '3px solid red',
          backgroundColor: 'rgba(255, 0, 0, 0.15)',
          cursor: 'move',
          pointerEvents: 'auto',
          boxSizing: 'border-box',
          touchAction: 'none',
          overflow: 'visible',
          zIndex: 55,
        }}
        onMouseDown={(e) => handleMouseDown(e, 'move')}
        onTouchStart={(e) => handleTouchStart(e, 'move')}
      >
        {/* Corner handles */}
        {corners.map((corner) => (
          <div
            key={corner}
            style={handleStyle(corner)}
            onMouseDown={(e) => handleMouseDown(e, 'resize', corner)}
            onTouchStart={(e) => handleTouchStart(e, 'resize', corner)}
          />
        ))}
      </div>
    </div>
  )
}

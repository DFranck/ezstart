'use client'

import { useEffect, useRef, useState } from 'react'

export interface RoiRect {
  x: number // % of container (0-100)
  y: number // % of container (0-100)
  width: number // % of container (0-100)
  height: number // % of container (0-100)
}

interface RoiSelectorProps {
  /** @deprecated No longer needed — overlay measures itself via getBoundingClientRect */
  containerWidth?: number
  /** @deprecated No longer needed — overlay measures itself via getBoundingClientRect */
  containerHeight?: number
  onChange: (roi: RoiRect) => void
  initialRoi?: RoiRect
  /** When true, ROI is visible but not interactive (no drag/resize) */
  locked?: boolean
}

type Handle = 'nw' | 'n' | 'ne' | 'e' | 'se' | 's' | 'sw' | 'w'

const MIN_SIZE = 10 // minimum 10% width/height

function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max)
}

export function RoiSelector({ onChange, initialRoi, locked = false }: RoiSelectorProps) {
  const [roi, setRoi] = useState<RoiRect>(initialRoi ?? { x: 60, y: 5, width: 35, height: 40 })

  const dragRef = useRef<{
    type: 'move' | 'resize'
    handle?: Handle
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
      } else if (drag.type === 'resize' && drag.handle) {
        const s = drag.startRoi
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
        handleMove(e.touches[0]!.clientX, e.touches[0]!.clientY)
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

  function startDrag(clientX: number, clientY: number, type: 'move' | 'resize', handle?: Handle) {
    dragRef.current = {
      type,
      handle,
      startMouseX: clientX,
      startMouseY: clientY,
      startRoi: { ...roiRef.current },
    }
  }

  function handleMouseDown(e: React.MouseEvent, type: 'move' | 'resize', handle?: Handle) {
    e.preventDefault()
    e.stopPropagation()
    startDrag(e.clientX, e.clientY, type, handle)
  }

  function handleTouchStart(e: React.TouchEvent, type: 'move' | 'resize', handle?: Handle) {
    e.stopPropagation()
    if (e.touches.length === 1) {
      startDrag(e.touches[0]!.clientX, e.touches[0]!.clientY, type, handle)
    }
  }

  const getHandleStyle = (handle: Handle): React.CSSProperties => {
    const base: React.CSSProperties = {
      position: 'absolute',
      backgroundColor: 'red',
      border: '2px solid darkred',
      borderRadius: 2,
      zIndex: 60,
      pointerEvents: 'auto',
      touchAction: 'none',
    }

    switch (handle) {
      case 'nw':
        return { ...base, width: 16, height: 16, top: -8, left: -8, cursor: 'nw-resize' }
      case 'ne':
        return { ...base, width: 16, height: 16, top: -8, right: -8, cursor: 'ne-resize' }
      case 'sw':
        return { ...base, width: 16, height: 16, bottom: -8, left: -8, cursor: 'sw-resize' }
      case 'se':
        return { ...base, width: 16, height: 16, bottom: -8, right: -8, cursor: 'se-resize' }
      case 'n':
        return {
          ...base,
          width: 20,
          height: 8,
          top: -4,
          left: '50%',
          transform: 'translateX(-50%)',
          cursor: 'n-resize',
        }
      case 's':
        return {
          ...base,
          width: 20,
          height: 8,
          bottom: -4,
          left: '50%',
          transform: 'translateX(-50%)',
          cursor: 's-resize',
        }
      case 'e':
        return {
          ...base,
          width: 8,
          height: 20,
          right: -4,
          top: '50%',
          transform: 'translateY(-50%)',
          cursor: 'e-resize',
        }
      case 'w':
        return {
          ...base,
          width: 8,
          height: 20,
          left: -4,
          top: '50%',
          transform: 'translateY(-50%)',
          cursor: 'w-resize',
        }
    }
  }

  const corners: Handle[] = ['nw', 'ne', 'sw', 'se']
  const edges: Handle[] = ['n', 's', 'e', 'w']
  const allHandles: Handle[] = [...corners, ...edges]

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
          border: locked ? '2px solid rgba(255, 0, 0, 0.5)' : '3px solid red',
          backgroundColor: locked ? 'rgba(255, 0, 0, 0.05)' : 'rgba(255, 0, 0, 0.15)',
          cursor: locked ? 'default' : 'move',
          pointerEvents: locked ? 'none' : 'auto',
          boxSizing: 'border-box',
          touchAction: 'none',
          overflow: 'visible',
          zIndex: 55,
        }}
        onMouseDown={locked ? undefined : e => handleMouseDown(e, 'move')}
        onTouchStart={locked ? undefined : e => handleTouchStart(e, 'move')}
      >
        {/* Resize handles (corners + edges) — hidden when locked */}
        {!locked &&
          allHandles.map(handle => (
            <div
              key={handle}
              style={getHandleStyle(handle)}
              onMouseDown={e => handleMouseDown(e, 'resize', handle)}
              onTouchStart={e => handleTouchStart(e, 'resize', handle)}
            />
          ))}
      </div>
    </div>
  )
}

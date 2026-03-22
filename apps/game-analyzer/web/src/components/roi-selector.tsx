'use client'

import { useCallback, useEffect, useRef, useState } from 'react'

export interface RoiRect {
  x: number      // % of container (0-100)
  y: number      // % of container (0-100)
  width: number  // % of container (0-100)
  height: number // % of container (0-100)
}

interface RoiSelectorProps {
  containerWidth: number
  containerHeight: number
  onChange: (roi: RoiRect) => void
  initialRoi?: RoiRect
}

type Corner = 'nw' | 'ne' | 'sw' | 'se'

const MIN_SIZE = 10 // minimum 10% width/height

function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max)
}

export function RoiSelector({
  containerWidth,
  containerHeight,
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

  // Sync initial roi from props
  useEffect(() => {
    if (initialRoi) {
      setRoi(initialRoi)
    }
  }, [initialRoi])

  // Notify parent on roi change
  const onChangeRef = useRef(onChange)
  onChangeRef.current = onChange

  useEffect(() => {
    onChangeRef.current(roi)
  }, [roi])

  const pxToPercent = useCallback(
    (pxX: number, pxY: number) => ({
      x: (pxX / containerWidth) * 100,
      y: (pxY / containerHeight) * 100,
    }),
    [containerWidth, containerHeight],
  )

  const handleMouseDown = useCallback(
    (e: React.MouseEvent, type: 'move' | 'resize', corner?: Corner) => {
      e.preventDefault()
      e.stopPropagation()
      dragRef.current = {
        type,
        corner,
        startMouseX: e.clientX,
        startMouseY: e.clientY,
        startRoi: { ...roi },
      }
    },
    [roi],
  )

  useEffect(() => {
    function handleMouseMove(e: MouseEvent) {
      const drag = dragRef.current
      if (!drag) return

      const dx = e.clientX - drag.startMouseX
      const dy = e.clientY - drag.startMouseY
      const delta = pxToPercent(dx, dy)

      if (drag.type === 'move') {
        const newX = clamp(
          drag.startRoi.x + delta.x,
          0,
          100 - drag.startRoi.width,
        )
        const newY = clamp(
          drag.startRoi.y + delta.y,
          0,
          100 - drag.startRoi.height,
        )
        setRoi({ ...drag.startRoi, x: newX, y: newY })
      } else if (drag.type === 'resize' && drag.corner) {
        const s = drag.startRoi
        let newX = s.x
        let newY = s.y
        let newW = s.width
        let newH = s.height

        switch (drag.corner) {
          case 'se':
            newW = clamp(s.width + delta.x, MIN_SIZE, 100 - s.x)
            newH = clamp(s.height + delta.y, MIN_SIZE, 100 - s.y)
            break
          case 'sw':
            newW = clamp(s.width - delta.x, MIN_SIZE, s.x + s.width)
            newX = s.x + s.width - newW
            newH = clamp(s.height + delta.y, MIN_SIZE, 100 - s.y)
            break
          case 'ne':
            newW = clamp(s.width + delta.x, MIN_SIZE, 100 - s.x)
            newH = clamp(s.height - delta.y, MIN_SIZE, s.y + s.height)
            newY = s.y + s.height - newH
            break
          case 'nw':
            newW = clamp(s.width - delta.x, MIN_SIZE, s.x + s.width)
            newX = s.x + s.width - newW
            newH = clamp(s.height - delta.y, MIN_SIZE, s.y + s.height)
            newY = s.y + s.height - newH
            break
        }

        setRoi({ x: newX, y: newY, width: newW, height: newH })
      }
    }

    function handleMouseUp() {
      dragRef.current = null
    }

    window.addEventListener('mousemove', handleMouseMove)
    window.addEventListener('mouseup', handleMouseUp)
    return () => {
      window.removeEventListener('mousemove', handleMouseMove)
      window.removeEventListener('mouseup', handleMouseUp)
    }
  }, [pxToPercent])

  const handleStyle = (corner: Corner): React.CSSProperties => {
    const base: React.CSSProperties = {
      position: 'absolute',
      width: 8,
      height: 8,
      backgroundColor: 'white',
      border: '1px solid rgba(59, 130, 246, 0.8)',
      borderRadius: 1,
      zIndex: 10,
    }

    switch (corner) {
      case 'nw':
        return { ...base, top: -4, left: -4, cursor: 'nw-resize' }
      case 'ne':
        return { ...base, top: -4, right: -4, cursor: 'ne-resize' }
      case 'sw':
        return { ...base, bottom: -4, left: -4, cursor: 'sw-resize' }
      case 'se':
        return { ...base, bottom: -4, right: -4, cursor: 'se-resize' }
    }
  }

  const corners: Corner[] = ['nw', 'ne', 'sw', 'se']

  return (
    <div
      ref={overlayRef}
      style={{
        position: 'absolute',
        inset: 0,
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
          border: '2px dashed rgba(59, 130, 246, 0.8)',
          backgroundColor: 'rgba(59, 130, 246, 0.1)',
          cursor: 'move',
          pointerEvents: 'auto',
          boxSizing: 'border-box',
        }}
        onMouseDown={(e) => handleMouseDown(e, 'move')}
      >
        {/* Corner handles */}
        {corners.map((corner) => (
          <div
            key={corner}
            style={handleStyle(corner)}
            onMouseDown={(e) => handleMouseDown(e, 'resize', corner)}
          />
        ))}
      </div>
    </div>
  )
}

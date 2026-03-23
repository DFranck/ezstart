'use client'

import { useEffect, useRef, useState } from 'react'
import { useTranslations } from 'next-intl'

export interface MaskRect {
  id: string
  x: number      // % of container
  y: number
  width: number
  height: number
}

interface BlackoutMaskProps {
  masks: MaskRect[]
  onChange: (masks: MaskRect[]) => void
  onAdd: () => void
  onRemove: (id: string) => void
  /** When provided, mask percentages are mapped within this ROI inside the full container */
  parentRoi?: { x: number; y: number; width: number; height: number }
}

type Handle = 'nw' | 'n' | 'ne' | 'e' | 'se' | 's' | 'sw' | 'w'

const MIN_SIZE = 3 // minimum 3% width/height

function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max)
}

export function BlackoutMask({ masks, onChange, onAdd, onRemove, parentRoi }: BlackoutMaskProps) {
  const t = useTranslations('bench')
  const overlayRef = useRef<HTMLDivElement>(null)

  const dragRef = useRef<{
    maskId: string
    type: 'move' | 'resize'
    handle?: Handle
    startMouseX: number
    startMouseY: number
    startMask: MaskRect
  } | null>(null)

  const masksRef = useRef(masks)
  masksRef.current = masks

  const onChangeRef = useRef(onChange)
  onChangeRef.current = onChange
  const parentRoiRef = useRef(parentRoi)
  parentRoiRef.current = parentRoi

  // Register global move/end listeners once
  useEffect(() => {
    function handleMove(clientX: number, clientY: number) {
      const drag = dragRef.current
      if (!drag) return

      const overlay = overlayRef.current
      if (!overlay) return
      const rect = overlay.getBoundingClientRect()
      if (rect.width === 0 || rect.height === 0) return

      // Convert pixel delta to % of overlay, then scale to mask coordinate space
      const pr = parentRoiRef.current
      const scaleX = pr ? (100 / pr.width) : 1
      const scaleY = pr ? (100 / pr.height) : 1
      const dx = ((clientX - drag.startMouseX) / rect.width) * 100 * scaleX
      const dy = ((clientY - drag.startMouseY) / rect.height) * 100 * scaleY
      const s = drag.startMask
      let updated: MaskRect

      if (drag.type === 'move') {
        updated = {
          ...s,
          x: clamp(s.x + dx, 0, 100 - s.width),
          y: clamp(s.y + dy, 0, 100 - s.height),
        }
      } else if (drag.type === 'resize' && drag.handle) {
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

        updated = { id: s.id, x: newX, y: newY, width: newW, height: newH }
      } else {
        return
      }

      const newMasks = masksRef.current.map(m => m.id === drag.maskId ? updated : m)
      masksRef.current = newMasks
      onChangeRef.current(newMasks)
    }

    function handleEnd() {
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
    clientX: number,
    clientY: number,
    maskId: string,
    type: 'move' | 'resize',
    handle?: Handle,
  ) {
    const mask = masksRef.current.find(m => m.id === maskId)
    if (!mask) return
    dragRef.current = {
      maskId,
      type,
      handle,
      startMouseX: clientX,
      startMouseY: clientY,
      startMask: { ...mask },
    }
  }

  function handleMouseDown(e: React.MouseEvent, maskId: string, type: 'move' | 'resize', handle?: Handle) {
    e.preventDefault()
    e.stopPropagation()
    startDrag(e.clientX, e.clientY, maskId, type, handle)
  }

  function handleTouchStart(e: React.TouchEvent, maskId: string, type: 'move' | 'resize', handle?: Handle) {
    e.stopPropagation()
    const touch = e.touches[0]
    if (e.touches.length === 1 && touch) {
      startDrag(touch.clientX, touch.clientY, maskId, type, handle)
    }
  }

  const corners: Handle[] = ['nw', 'ne', 'sw', 'se']
  const edges: Handle[] = ['n', 's', 'e', 'w']
  const allHandles: Handle[] = [...corners, ...edges]

  const getHandleStyle = (handle: Handle): React.CSSProperties => {
    const base: React.CSSProperties = {
      position: 'absolute',
      backgroundColor: 'white',
      border: '1px solid #666',
      borderRadius: 1,
      zIndex: 72,
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
    <>
      {/* Overlay container for mask rectangles */}
      <div
        ref={overlayRef}
        style={{
          position: 'absolute',
          inset: 0,
          zIndex: 65,
          pointerEvents: 'none',
        }}
      >
        {masks.map((mask, idx) => (
          <div
            key={mask.id}
            style={{
              position: 'absolute',
              left: `${mask.x}%`,
              top: `${mask.y}%`,
              width: `${mask.width}%`,
              height: `${mask.height}%`,
              backgroundColor: 'rgba(255, 0, 0, 1.0)',
              border: '2px dashed rgba(255, 255, 255, 0.8)',
              cursor: 'move',
              pointerEvents: 'auto',
              boxSizing: 'border-box',
              touchAction: 'none',
              overflow: 'visible',
              zIndex: 70,
            }}
            onMouseDown={(e) => handleMouseDown(e, mask.id, 'move')}
            onTouchStart={(e) => handleTouchStart(e, mask.id, 'move')}
          >
            {/* Label */}
            <span
              style={{
                position: 'absolute',
                top: 2,
                left: 4,
                fontSize: 9,
                color: 'rgba(255, 255, 255, 0.8)',
                pointerEvents: 'none',
                userSelect: 'none',
                lineHeight: 1,
              }}
            >
              Mask {idx + 1}
            </span>

            {/* Remove button */}
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation()
                onRemove(mask.id)
              }}
              style={{
                position: 'absolute',
                top: -6,
                right: -6,
                width: 16,
                height: 16,
                borderRadius: '50%',
                backgroundColor: '#ef4444',
                color: 'white',
                border: 'none',
                fontSize: 10,
                lineHeight: '16px',
                textAlign: 'center',
                cursor: 'pointer',
                pointerEvents: 'auto',
                zIndex: 75,
                padding: 0,
              }}
              title={t('removeMask')}
            >
              ×
            </button>

            {/* Resize handles (corners + edges) */}
            {allHandles.map((handle) => (
              <div
                key={handle}
                style={getHandleStyle(handle)}
                onMouseDown={(e) => handleMouseDown(e, mask.id, 'resize', handle)}
                onTouchStart={(e) => handleTouchStart(e, mask.id, 'resize', handle)}
              />
            ))}
          </div>
        ))}
      </div>

      {/* Add mask button — positioned below the overlay */}
      <div
        style={{
          position: 'absolute',
          bottom: 8,
          left: 8,
          zIndex: 80,
          pointerEvents: 'auto',
        }}
      >
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation()
            onAdd()
          }}
          className="flex items-center gap-1 bg-black/60 hover:bg-black/80 text-white text-xs rounded-md px-2 py-1 transition-colors"
          title={t('addMask')}
        >
          <span className="text-sm font-bold">+</span>
          <span>{t('masks')}</span>
        </button>
      </div>
    </>
  )
}

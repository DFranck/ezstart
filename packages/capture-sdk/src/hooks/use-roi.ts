'use client'

import { useCallback, useState } from 'react'

import type { ROIConfig } from '../types'

interface ROIRect {
  x: number
  y: number
  width: number
  height: number
}

interface UseROIReturn {
  roi: ROIRect
  setROI: (roi: ROIRect) => void
  resetROI: () => void
}

const DEFAULT_ROI: ROIRect = { x: 0, y: 0, width: 100, height: 100 }

/**
 * Region of Interest selection hook.
 * Manages a crop region with percentage-based coordinates (0-100).
 * Supports min size constraints and aspect ratio locking.
 */
export function useROI(config?: ROIConfig): UseROIReturn {
  const { initial, minSize = 5, aspectRatio = null } = config ?? {}

  const initialROI: ROIRect = initial ?? DEFAULT_ROI

  const [roi, setROIState] = useState<ROIRect>(initialROI)

  const setROI = useCallback(
    (newROI: ROIRect) => {
      let { x, y, width, height } = newROI

      // Enforce minimum size
      width = Math.max(width, minSize)
      height = Math.max(height, minSize)

      // Enforce aspect ratio if set
      if (aspectRatio !== null && aspectRatio > 0) {
        // Adjust height to match the desired aspect ratio based on current width
        height = width / aspectRatio
        if (height < minSize) {
          height = minSize
          width = height * aspectRatio
        }
      }

      // Clamp to 0-100 bounds
      x = Math.max(0, Math.min(x, 100 - width))
      y = Math.max(0, Math.min(y, 100 - height))
      width = Math.min(width, 100 - x)
      height = Math.min(height, 100 - y)

      setROIState({ x, y, width, height })
    },
    [minSize, aspectRatio]
  )

  const resetROI = useCallback(() => {
    setROIState(initialROI)
  }, [initialROI])

  return { roi, setROI, resetROI }
}

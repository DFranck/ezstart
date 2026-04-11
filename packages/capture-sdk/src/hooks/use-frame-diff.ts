'use client'

import { useCallback, useRef, useState } from 'react'

import type { FrameDiffConfig, MaskRegion } from '../types'

interface UseFrameDiffReturn {
  /** 0-100, percentage of sampled pixels that changed */
  diffScore: number
  /** True when the image has not changed for at least stabilizeMs */
  isStable: boolean
  /** Feed each captured frame into this function */
  processFrame: (frame: ImageData) => void
  /** The last frame captured after stabilization */
  lastStableFrame: ImageData | null
}

function computeGrayscale(r: number, g: number, b: number): number {
  return (r + g + b) / 3
}

/**
 * Compares successive frames and detects significant visual changes.
 *
 * Uses grayscale sampling for performance: only 1/sampleRate pixels are compared,
 * and RGB is reduced to a single grayscale value before diffing.
 *
 * A stabilization debounce ensures the callback only fires once the content has
 * stopped changing and the image is no longer in motion.
 *
 * All intermediate values (diffScore, stability) are tracked via refs to avoid
 * re-rendering the parent on every frame. Only the stabilized result triggers
 * a state update.
 */
export function useFrameDiff(options: FrameDiffConfig = {}): UseFrameDiffReturn {
  const {
    threshold = 5,
    pixelThreshold = 20,
    sampleRate = 4,
    stabilizeMs = 500,
    onSignificantChange,
    masks,
  } = options

  // Only lastStableFrame uses state - it changes rarely (after stabilization)
  const [lastStableFrame, setLastStableFrame] = useState<ImageData | null>(null)

  // Track diffScore and isStable via refs to avoid re-renders on every frame
  const diffScoreRef = useRef(0)
  const isStableRef = useRef(true)

  const prevFrameRef = useRef<ImageData | null>(null)
  const stabilizeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const latestFrameRef = useRef<ImageData | null>(null)
  const onChangeRef = useRef(onSignificantChange)
  onChangeRef.current = onSignificantChange

  const processFrame = useCallback(
    (frame: ImageData) => {
      const prev = prevFrameRef.current
      prevFrameRef.current = frame

      if (!prev) {
        // First frame - nothing to compare yet
        return
      }

      // Frames must match in size to be comparable
      if (prev.width !== frame.width || prev.height !== frame.height) {
        return
      }

      const data = frame.data
      const prevData = prev.data
      const totalPixels = frame.width * frame.height

      // Pre-compute masks in absolute pixel coordinates once per frame
      const absMasks = computeAbsoluteMasks(masks, frame.width, frame.height)

      let sampledCount = 0
      let changedCount = 0

      // Walk through pixels with the configured sample rate
      // Each pixel occupies 4 bytes (RGBA) in the ImageData array
      for (let i = 0; i < totalPixels; i += sampleRate) {
        // Skip pixels inside masked regions
        if (absMasks) {
          const px = i % frame.width
          const py = Math.floor(i / frame.width)
          let masked = false
          for (let m = 0; m < absMasks.length; m++) {
            const mask = absMasks[m]
            if (mask && px >= mask.x1 && px < mask.x2 && py >= mask.y1 && py < mask.y2) {
              masked = true
              break
            }
          }
          if (masked) {
            continue
          }
        }

        const offset = i * 4
        const gray = computeGrayscale(data[offset]!, data[offset + 1]!, data[offset + 2]!)
        const prevGray = computeGrayscale(
          prevData[offset]!,
          prevData[offset + 1]!,
          prevData[offset + 2]!
        )

        sampledCount++
        if (Math.abs(gray - prevGray) > pixelThreshold) {
          changedCount++
        }
      }

      // Score uses only non-masked pixels
      const score = sampledCount > 0 ? (changedCount / sampledCount) * 100 : 0
      diffScoreRef.current = score

      const isSignificant = score >= threshold

      if (isSignificant) {
        // Frame is changing - not stable (ref only, no re-render)
        isStableRef.current = false
        latestFrameRef.current = frame

        // Reset the stabilization timer on every significant change
        if (stabilizeTimerRef.current !== null) {
          clearTimeout(stabilizeTimerRef.current)
        }

        stabilizeTimerRef.current = setTimeout(() => {
          // No new significant change occurred during the stabilization window
          isStableRef.current = true
          const stableFrame = latestFrameRef.current
          if (stableFrame) {
            setLastStableFrame(stableFrame)
            onChangeRef.current?.(stableFrame)
          }
          stabilizeTimerRef.current = null
        }, stabilizeMs)
      }
    },
    [threshold, pixelThreshold, sampleRate, stabilizeMs, masks]
  )

  return {
    diffScore: diffScoreRef.current,
    isStable: isStableRef.current,
    processFrame,
    lastStableFrame,
  }
}

function computeAbsoluteMasks(
  masks: MaskRegion[] | undefined,
  width: number,
  height: number
): Array<{ x1: number; y1: number; x2: number; y2: number }> | null {
  if (!masks || !Array.isArray(masks) || masks.length === 0) return null

  return masks.map(m => ({
    x1: Math.floor((m.x / 100) * width),
    y1: Math.floor((m.y / 100) * height),
    x2: Math.floor(((m.x + m.width) / 100) * width),
    y2: Math.floor(((m.y + m.height) / 100) * height),
  }))
}

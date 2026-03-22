'use client'

import { useCallback, useRef, useState } from 'react'

interface UseFrameDiffOptions {
  /** % of sampled pixels that must differ to consider a significant change (default: 15) */
  threshold?: number
  /** Minimum per-pixel grayscale difference to count as "changed" (default: 30) */
  pixelThreshold?: number
  /** Sample 1 pixel every N pixels for performance (default: 4) */
  sampleRate?: number
  /** Wait this many ms of stability before triggering onChange (default: 300) */
  stabilizeMs?: number
  /** Called once the frame has stabilized after a significant change */
  onSignificantChange?: (frame: ImageData) => void
}

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
 * Designed for rune-scrolling detection in Summoners War screen capture.
 *
 * Uses grayscale sampling for performance: only 1/sampleRate pixels are compared,
 * and RGB is reduced to a single grayscale value before diffing.
 *
 * A stabilization debounce ensures the callback only fires once the user has
 * stopped scrolling and the image is no longer changing.
 */
export function useFrameDiff(options: UseFrameDiffOptions = {}): UseFrameDiffReturn {
  const {
    threshold = 15,
    pixelThreshold = 30,
    sampleRate = 4,
    stabilizeMs = 300,
    onSignificantChange,
  } = options

  const [diffScore, setDiffScore] = useState(0)
  const [isStable, setIsStable] = useState(true)
  const [lastStableFrame, setLastStableFrame] = useState<ImageData | null>(null)

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
        // First frame — nothing to compare yet
        return
      }

      // Frames must match in size to be comparable
      if (prev.width !== frame.width || prev.height !== frame.height) {
        return
      }

      const data = frame.data
      const prevData = prev.data
      const totalPixels = frame.width * frame.height

      let sampledCount = 0
      let changedCount = 0

      // Walk through pixels with the configured sample rate
      // Each pixel occupies 4 bytes (RGBA) in the ImageData array
      for (let i = 0; i < totalPixels; i += sampleRate) {
        const offset = i * 4
        const gray = computeGrayscale(data[offset], data[offset + 1], data[offset + 2])
        const prevGray = computeGrayscale(prevData[offset], prevData[offset + 1], prevData[offset + 2])

        sampledCount++
        if (Math.abs(gray - prevGray) > pixelThreshold) {
          changedCount++
        }
      }

      const score = sampledCount > 0 ? (changedCount / sampledCount) * 100 : 0
      setDiffScore(score)

      const isSignificant = score >= threshold

      if (isSignificant) {
        // Frame is changing — not stable
        setIsStable(false)
        latestFrameRef.current = frame

        // Reset the stabilization timer on every significant change
        if (stabilizeTimerRef.current !== null) {
          clearTimeout(stabilizeTimerRef.current)
        }

        stabilizeTimerRef.current = setTimeout(() => {
          // No new significant change occurred during the stabilization window
          setIsStable(true)
          const stableFrame = latestFrameRef.current
          if (stableFrame) {
            setLastStableFrame(stableFrame)
            onChangeRef.current?.(stableFrame)
          }
          stabilizeTimerRef.current = null
        }, stabilizeMs)
      }
    },
    [threshold, pixelThreshold, sampleRate, stabilizeMs],
  )

  return { diffScore, isStable, processFrame, lastStableFrame }
}

/**
 * Performance Monitor Hook
 *
 * Tracks FPS, frame time, and rendering performance with minimal overhead.
 * Updates metrics every 500ms to avoid impacting performance.
 */

import { useEffect, useRef, useState } from 'react'

export interface PerformanceMetrics {
  fps: number
  minFps: number
  maxFps: number
  avgFrameTime: number
  maxFrameTime: number
  slowFrames: number // Frames > 16.67ms (<60 FPS)
  droppedFrames: number // Frames > 33.33ms (<30 FPS)
  totalFrames: number
  memoryMB: number | null
}

const FRAME_THRESHOLD_60FPS = 16.67 // ms
const FRAME_THRESHOLD_30FPS = 33.33 // ms
const UPDATE_INTERVAL = 500 // Update metrics every 500ms

export function usePerformanceMonitor(enabled: boolean = true) {
  const [metrics, setMetrics] = useState<PerformanceMetrics>({
    fps: 60,
    minFps: 60,
    maxFps: 60,
    avgFrameTime: 16.67,
    maxFrameTime: 16.67,
    slowFrames: 0,
    droppedFrames: 0,
    totalFrames: 0,
    memoryMB: null,
  })

  const frameTimesRef = useRef<number[]>([])
  const lastFrameTimeRef = useRef<number>(performance.now())
  const lastUpdateTimeRef = useRef<number>(performance.now())
  const frameCountRef = useRef<number>(0)
  const slowFramesRef = useRef<number>(0)
  const droppedFramesRef = useRef<number>(0)
  const animationFrameIdRef = useRef<number | null>(null)

  useEffect(() => {
    if (!enabled) {
      if (animationFrameIdRef.current) {
        cancelAnimationFrame(animationFrameIdRef.current)
        animationFrameIdRef.current = null
      }
      return
    }

    const measureFrame = () => {
      const now = performance.now()
      const frameTime = now - lastFrameTimeRef.current
      lastFrameTimeRef.current = now

      // Skip first frame (startup)
      if (frameCountRef.current > 0) {
        frameTimesRef.current.push(frameTime)

        if (frameTime > FRAME_THRESHOLD_60FPS) slowFramesRef.current++
        if (frameTime > FRAME_THRESHOLD_30FPS) droppedFramesRef.current++
      }

      frameCountRef.current++

      // Update metrics every UPDATE_INTERVAL
      if (now - lastUpdateTimeRef.current >= UPDATE_INTERVAL) {
        const frameTimes = frameTimesRef.current

        if (frameTimes.length > 0) {
          const avgFrameTime = frameTimes.reduce((a, b) => a + b, 0) / frameTimes.length
          const maxFrameTime = Math.max(...frameTimes)
          const minFrameTime = Math.min(...frameTimes)

          // Get memory usage if available
          let memoryMB: number | null = null
          if ('memory' in performance && (performance as any).memory) {
            memoryMB = Math.round((performance as any).memory.usedJSHeapSize / 1024 / 1024)
          }

          setMetrics({
            fps: Math.round(1000 / avgFrameTime),
            minFps: Math.round(1000 / maxFrameTime),
            maxFps: Math.round(1000 / minFrameTime),
            avgFrameTime: Math.round(avgFrameTime * 100) / 100,
            maxFrameTime: Math.round(maxFrameTime * 100) / 100,
            slowFrames: slowFramesRef.current,
            droppedFrames: droppedFramesRef.current,
            totalFrames: frameCountRef.current,
            memoryMB,
          })
        }

        // Reset counters
        frameTimesRef.current = []
        slowFramesRef.current = 0
        droppedFramesRef.current = 0
        lastUpdateTimeRef.current = now
      }

      animationFrameIdRef.current = requestAnimationFrame(measureFrame)
    }

    animationFrameIdRef.current = requestAnimationFrame(measureFrame)

    return () => {
      if (animationFrameIdRef.current) {
        cancelAnimationFrame(animationFrameIdRef.current)
      }
    }
  }, [enabled])

  return metrics
}

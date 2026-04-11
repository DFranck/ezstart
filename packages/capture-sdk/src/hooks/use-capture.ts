'use client'

import { useCallback, useEffect, useRef, useState } from 'react'

import type { CaptureConfig, CaptureFrame, CaptureProvider, CaptureState } from '../types'
import type { CaptureProviderInstance } from '../providers/screen'
import { createScreenProvider } from '../providers/screen'
import { createCameraProvider } from '../providers/camera'
import { createUploadProvider } from '../providers/upload'

function detectProvider(): CaptureProvider {
  if (
    typeof navigator !== 'undefined' &&
    typeof navigator.mediaDevices !== 'undefined' &&
    typeof navigator.mediaDevices.getDisplayMedia === 'function'
  ) {
    return 'screen'
  }
  if (
    typeof navigator !== 'undefined' &&
    typeof navigator.mediaDevices !== 'undefined' &&
    typeof navigator.mediaDevices.getUserMedia === 'function'
  ) {
    return 'camera'
  }
  return 'upload'
}

function createProvider(type: CaptureProvider): CaptureProviderInstance {
  switch (type) {
    case 'screen':
      return createScreenProvider()
    case 'camera':
      return createCameraProvider()
    case 'upload':
      return createUploadProvider()
  }
}

/**
 * Provider-agnostic capture hook.
 * Auto-detects the best provider: screen (desktop) > camera (mobile) > upload (fallback).
 * Extracts frames at the configured interval and invokes the onFrame callback.
 */
export function useCapture(config?: CaptureConfig): CaptureState & {
  startCapture: () => Promise<void>
  stopCapture: () => void
} {
  const { provider: requestedProvider = 'auto', frameInterval = 500, onFrame } = config ?? {}

  const [isCapturing, setIsCapturing] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [currentFrame, setCurrentFrame] = useState<CaptureFrame | null>(null)
  const [activeProvider, setActiveProvider] = useState<CaptureProvider | null>(null)
  const [isSupported, setIsSupported] = useState(false)

  const providerRef = useRef<CaptureProviderInstance | null>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const videoRef = useRef<HTMLVideoElement | null>(null)
  const canvasRef = useRef<HTMLCanvasElement | null>(null)
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const onFrameRef = useRef(onFrame)
  onFrameRef.current = onFrame

  // Check support after mount (SSR-safe)
  useEffect(() => {
    const resolvedType = requestedProvider === 'auto' ? detectProvider() : requestedProvider
    const instance = createProvider(resolvedType)
    setIsSupported(instance.isSupported())
  }, [requestedProvider])

  const cleanup = useCallback(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current)
      intervalRef.current = null
    }

    if (streamRef.current) {
      for (const track of streamRef.current.getTracks()) {
        track.stop()
      }
      streamRef.current = null
    }

    if (videoRef.current) {
      videoRef.current.srcObject = null
      videoRef.current = null
    }

    providerRef.current?.stop()
    providerRef.current = null
    canvasRef.current = null
    setIsCapturing(false)
  }, [])

  const extractFrame = useCallback(() => {
    const video = videoRef.current
    const canvas = canvasRef.current
    if (!video || !canvas || video.readyState < video.HAVE_CURRENT_DATA) return

    const ctx = canvas.getContext('2d', { willReadFrequently: true })
    if (!ctx) return

    // Sync canvas size with video dimensions
    if (canvas.width !== video.videoWidth || canvas.height !== video.videoHeight) {
      canvas.width = video.videoWidth
      canvas.height = video.videoHeight
    }

    ctx.drawImage(video, 0, 0)
    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height)

    const frame: CaptureFrame = {
      imageData,
      canvas,
      timestamp: Date.now(),
      width: canvas.width,
      height: canvas.height,
    }

    setCurrentFrame(frame)
    onFrameRef.current?.(frame)
  }, [])

  const stopCapture = useCallback(() => {
    cleanup()
    setError(null)
    setActiveProvider(null)
  }, [cleanup])

  const startCapture = useCallback(async () => {
    setError(null)
    cleanup()

    const resolvedType = requestedProvider === 'auto' ? detectProvider() : requestedProvider
    const instance = createProvider(resolvedType)
    providerRef.current = instance

    if (!instance.isSupported()) {
      setError(`Provider "${resolvedType}" is not supported in this browser.`)
      return
    }

    try {
      const stream = await instance.start()
      streamRef.current = stream
      setActiveProvider(resolvedType)

      // Listen for user stopping the share via browser UI
      const [videoTrack] = stream.getVideoTracks()
      if (videoTrack) {
        videoTrack.onended = () => {
          cleanup()
          setActiveProvider(null)
        }
      }

      // Create hidden video element to read the stream
      const video = document.createElement('video')
      video.srcObject = stream
      video.muted = true
      video.playsInline = true
      videoRef.current = video

      await video.play()

      // Create offscreen canvas for frame extraction
      canvasRef.current = document.createElement('canvas')

      setIsCapturing(true)

      // Start frame extraction loop
      extractFrame()
      intervalRef.current = setInterval(extractFrame, frameInterval)
    } catch (err) {
      cleanup()
      setActiveProvider(null)

      if (err instanceof DOMException) {
        if (err.name === 'NotAllowedError') {
          setError('Permission denied: capture was cancelled by the user.')
          return
        }
        if (err.name === 'NotFoundError') {
          setError('No capture source found.')
          return
        }
        if (err.name === 'NotReadableError') {
          setError('Unable to read the capture stream.')
          return
        }
      }

      setError(err instanceof Error ? err.message : 'Unknown capture error.')
    }
  }, [cleanup, extractFrame, frameInterval, requestedProvider])

  // Cleanup on unmount
  useEffect(() => {
    return cleanup
  }, [cleanup])

  return {
    isCapturing,
    isSupported,
    provider: activeProvider,
    error,
    currentFrame,
    startCapture,
    stopCapture,
  }
}

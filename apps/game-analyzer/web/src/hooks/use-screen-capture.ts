'use client'

import { useCallback, useEffect, useRef, useState } from 'react'

interface UseScreenCaptureOptions {
  frameInterval?: number
  onFrame?: (frame: ImageData, canvas: HTMLCanvasElement) => void
}

interface UseScreenCaptureReturn {
  isCapturing: boolean
  isSupported: boolean
  startCapture: () => Promise<void>
  stopCapture: () => void
  error: string | null
  currentFrame: ImageData | null
}

export function useScreenCapture(
  options: UseScreenCaptureOptions = {}
): UseScreenCaptureReturn {
  const { frameInterval = 500, onFrame } = options

  const [isCapturing, setIsCapturing] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [currentFrame, setCurrentFrame] = useState<ImageData | null>(null)

  const streamRef = useRef<MediaStream | null>(null)
  const videoRef = useRef<HTMLVideoElement | null>(null)
  const canvasRef = useRef<HTMLCanvasElement | null>(null)
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const onFrameRef = useRef(onFrame)
  onFrameRef.current = onFrame

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

    setCurrentFrame(imageData)
    onFrameRef.current?.(imageData, canvas)
  }, [])

  const stopCapture = useCallback(() => {
    cleanup()
    setError(null)
  }, [cleanup])

  const startCapture = useCallback(async () => {
    setError(null)

    // Clean up any previous capture
    cleanup()

    try {
      const stream = await navigator.mediaDevices.getDisplayMedia({
        video: { cursor: 'never' } as MediaTrackConstraints,
      })

      streamRef.current = stream

      // Listen for user stopping the share via browser UI
      const [videoTrack] = stream.getVideoTracks()
      if (videoTrack) {
        videoTrack.onended = () => {
          cleanup()
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

      if (err instanceof DOMException) {
        if (err.name === 'NotAllowedError') {
          setError('Permission refusée : la capture d\'écran a été annulée.')
          return
        }
        if (err.name === 'NotFoundError') {
          setError('Aucune source de capture trouvée.')
          return
        }
        if (err.name === 'NotReadableError') {
          setError('Impossible de lire le flux de capture.')
          return
        }
      }

      setError(err instanceof Error ? err.message : 'Erreur inconnue lors de la capture.')
    }
  }, [cleanup, extractFrame, frameInterval])

  const isSupported =
    typeof navigator !== 'undefined' &&
    typeof navigator.mediaDevices !== 'undefined' &&
    typeof navigator.mediaDevices.getDisplayMedia === 'function'

  // Cleanup on unmount
  useEffect(() => {
    return cleanup
  }, [cleanup])

  return {
    isCapturing,
    isSupported,
    startCapture,
    stopCapture,
    error,
    currentFrame,
  }
}

import type { CaptureProviderInstance } from './screen'

let activeStream: MediaStream | null = null

/**
 * Camera capture provider using getUserMedia (mobile browsers).
 * Requests the back-facing camera by default.
 */
export function createCameraProvider(): CaptureProviderInstance {
  return {
    isSupported() {
      return (
        typeof navigator !== 'undefined' &&
        typeof navigator.mediaDevices !== 'undefined' &&
        typeof navigator.mediaDevices.getUserMedia === 'function'
      )
    },

    async start() {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment' },
      })
      activeStream = stream
      return stream
    },

    stop() {
      if (activeStream) {
        for (const track of activeStream.getTracks()) {
          track.stop()
        }
        activeStream = null
      }
    },
  }
}

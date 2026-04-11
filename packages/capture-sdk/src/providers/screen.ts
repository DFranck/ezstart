export interface CaptureProviderInstance {
  start: () => Promise<MediaStream>
  stop: () => void
  isSupported: () => boolean
}

let activeStream: MediaStream | null = null

/**
 * Screen capture provider using getDisplayMedia (desktop browsers).
 * Requests screen/window/tab sharing from the user.
 */
export function createScreenProvider(): CaptureProviderInstance {
  return {
    isSupported() {
      return (
        typeof navigator !== 'undefined' &&
        typeof navigator.mediaDevices !== 'undefined' &&
        typeof navigator.mediaDevices.getDisplayMedia === 'function'
      )
    },

    async start() {
      const stream = await navigator.mediaDevices.getDisplayMedia({
        video: { cursor: 'never' } as MediaTrackConstraints,
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

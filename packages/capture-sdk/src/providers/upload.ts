import type { CaptureProviderInstance } from './screen'

/**
 * File upload fallback provider.
 * Creates a hidden file input that accepts images. Returns a MediaStream-like
 * by drawing the selected image onto a canvas and capturing the canvas stream.
 * Always supported as a last-resort fallback.
 */
export function createUploadProvider(): CaptureProviderInstance {
  let inputEl: HTMLInputElement | null = null

  return {
    isSupported() {
      return typeof document !== 'undefined'
    },

    start() {
      return new Promise<MediaStream>((resolve, reject) => {
        inputEl = document.createElement('input')
        inputEl.type = 'file'
        inputEl.accept = 'image/*'
        inputEl.setAttribute('capture', 'environment')
        inputEl.style.display = 'none'
        document.body.appendChild(inputEl)

        inputEl.addEventListener('change', () => {
          const file = inputEl?.files?.[0]
          if (!file) {
            reject(new Error('No file selected'))
            return
          }

          const img = new Image()
          const url = URL.createObjectURL(file)

          img.onload = () => {
            const canvas = document.createElement('canvas')
            canvas.width = img.naturalWidth
            canvas.height = img.naturalHeight

            const ctx = canvas.getContext('2d')
            if (!ctx) {
              URL.revokeObjectURL(url)
              reject(new Error('Failed to create canvas context'))
              return
            }

            ctx.drawImage(img, 0, 0)
            URL.revokeObjectURL(url)

            // Capture the canvas as a MediaStream (single frame)
            const stream = canvas.captureStream(0)
            resolve(stream)
          }

          img.onerror = () => {
            URL.revokeObjectURL(url)
            reject(new Error('Failed to load image'))
          }

          img.src = url
        })

        inputEl.addEventListener('cancel', () => {
          reject(new Error('File selection cancelled'))
        })

        inputEl.click()
      })
    },

    stop() {
      if (inputEl) {
        inputEl.remove()
        inputEl = null
      }
    },
  }
}

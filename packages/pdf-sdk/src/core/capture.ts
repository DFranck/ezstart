import type { CaptureOptions } from './types'

/**
 * Capture a DOM element as a PNG data URL using dom-to-image.
 * Dynamically imports dom-to-image for code splitting.
 */
export async function captureElement(
  element: HTMLElement,
  options: CaptureOptions = {}
): Promise<string> {
  const { width, height, bgcolor = '#ffffff', scale = 2, quality = 1 } = options

  const domtoimageModule = await import('dom-to-image')
  const domtoimage = domtoimageModule.default || domtoimageModule

  const captureWidth = width || element.offsetWidth
  const captureHeight = height || element.offsetHeight

  const dataUrl = await domtoimage.toPng(element, {
    quality,
    width: captureWidth * scale,
    height: captureHeight * scale,
    bgcolor,
    style: {
      transform: `scale(${scale})`,
      transformOrigin: 'top left',
    },
    filter: (node: Node) => {
      const el = node as HTMLElement
      if (el.tagName === 'IFRAME' || el.tagName === 'EMBED') return false
      return true
    },
  })

  return dataUrl
}

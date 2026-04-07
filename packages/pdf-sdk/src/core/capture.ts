import type { CaptureOptions } from './types'

/** Color properties that may contain modern CSS color functions */
const COLOR_PROPERTIES = [
  'color',
  'background-color',
  'border-color',
  'border-top-color',
  'border-right-color',
  'border-bottom-color',
  'border-left-color',
  'outline-color',
  'text-decoration-color',
  'caret-color',
  'fill',
  'stroke',
]

const MODERN_COLOR_RE = /\b(oklab|oklch|lab|lch)\s*\(/i

/** Resolve a CSS color to hex using canvas 2D context */
function resolveColorToHex(color: string): string | null {
  try {
    const canvas = document.createElement('canvas')
    canvas.width = 1
    canvas.height = 1
    const ctx = canvas.getContext('2d')
    if (!ctx) return null
    ctx.fillStyle = '#000000' // reset
    ctx.fillStyle = color // browser resolves to hex/rgba
    return ctx.fillStyle // returns "#rrggbb" or "rgba(...)"
  } catch {
    return null
  }
}

/** Walk all elements in a subtree and convert modern color functions to hex */
function convertModernColorsToHex(root: HTMLElement): void {
  const elements = root.querySelectorAll('*')
  const allElements = [root, ...Array.from(elements)] as HTMLElement[]

  for (const el of allElements) {
    if (!el.style) continue
    const computed = window.getComputedStyle(el)

    for (const prop of COLOR_PROPERTIES) {
      const value = computed.getPropertyValue(prop)
      if (value && MODERN_COLOR_RE.test(value)) {
        const hex = resolveColorToHex(value)
        if (hex) {
          el.style.setProperty(prop, hex, 'important')
        }
      }
    }

    // Also check box-shadow which can contain colors
    const shadow = computed.getPropertyValue('box-shadow')
    if (shadow && MODERN_COLOR_RE.test(shadow)) {
      el.style.setProperty('box-shadow', 'none', 'important')
    }
  }

  // Also override CSS variables on root to ensure they're hex
  const rootComputed = window.getComputedStyle(document.documentElement)
  const style = root.style
  const varNames = [
    '--background',
    '--foreground',
    '--card',
    '--card-foreground',
    '--primary',
    '--primary-foreground',
    '--secondary',
    '--secondary-foreground',
    '--muted',
    '--muted-foreground',
    '--accent',
    '--accent-foreground',
    '--destructive',
    '--destructive-foreground',
    '--border',
    '--input',
    '--ring',
    '--success',
    '--warning',
    '--info',
  ]
  for (const name of varNames) {
    const value = rootComputed.getPropertyValue(name).trim()
    if (value && MODERN_COLOR_RE.test(value)) {
      const hex = resolveColorToHex(value)
      if (hex) style.setProperty(name, hex)
    }
  }
}

async function captureWithHtml2canvas(
  element: HTMLElement,
  width: number,
  height: number,
  scale: number,
  bgcolor: string | null
): Promise<string> {
  const mod = await import('html2canvas')
  const html2canvas = mod.default || mod

  const canvas = await html2canvas(element, {
    width,
    height,
    scale,
    backgroundColor: bgcolor,
    useCORS: true,
    allowTaint: true,
    logging: false,
    scrollX: 0,
    scrollY: 0,
    x: 0,
    y: 0,
    ignoreElements: (el: Element) => {
      const tag = el.tagName
      return tag === 'IFRAME' || tag === 'EMBED'
    },
    onclone: (_doc: Document, clonedEl: HTMLElement) => {
      // Convert all modern CSS color functions (oklab, oklch, lab, lch) to hex
      // html2canvas can't parse these, but browsers can resolve them via canvas
      convertModernColorsToHex(clonedEl)
    },
  })

  return canvas.toDataURL('image/png', 1.0)
}

async function captureWithDomToImage(
  element: HTMLElement,
  width: number,
  height: number,
  scale: number,
  bgcolor: string | null,
  quality: number
): Promise<string> {
  const mod = await import('dom-to-image-more')
  const domtoimage = mod.default || mod

  return domtoimage.toPng(element, {
    quality,
    width: width * scale,
    height: height * scale,
    bgcolor: bgcolor || '#ffffff',
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
}

/**
 * Capture a DOM element as a PNG data URL.
 * Supports multiple capture engines:
 * - 'html2canvas' (default): Better for SVG, CSS transforms, complex DOM. Auto-fixes oklch() colors.
 * - 'dom-to-image': Better for simpler HTML, supports transparent backgrounds natively.
 */
export async function captureElement(
  element: HTMLElement,
  options: CaptureOptions = {}
): Promise<string> {
  const {
    width,
    height,
    bgcolor = '#ffffff',
    scale = 2,
    quality = 1,
    engine = 'html2canvas',
  } = options

  const captureWidth = width || element.offsetWidth
  const captureHeight = height || element.offsetHeight
  const bgColor = bgcolor === 'transparent' ? null : bgcolor

  if (engine === 'html2canvas') {
    return captureWithHtml2canvas(element, captureWidth, captureHeight, scale, bgColor)
  }

  // dom-to-image engine (no oklch fix needed — it serializes computed styles)
  return captureWithDomToImage(element, captureWidth, captureHeight, scale, bgColor, quality)
}

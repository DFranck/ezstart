import { PdfBuilder } from './pdf-builder'
import { captureElement } from './capture'
import type { CaptureOptions } from './types'

// ── Types ──

export interface PdfDocumentOptions {
  format?: 'a4' | 'letter'
  orientation?: 'portrait' | 'landscape'
  pageNumbers?: boolean
}

export interface PdfResult {
  blobUrl: string
  pageCount: number
  /** Data URL preview of each captured page (for thumbnails) */
  previews: string[]
}

interface TextAction {
  type: 'title' | 'subtitle' | 'text' | 'space' | 'separator' | 'image'
  value?: string
  options?: Record<string, unknown>
}

interface PageDefinition {
  kind: 'text' | 'capture' | 'captureMulti'
  textActions?: TextAction[]
  element?: HTMLElement
  captureOptions?: CaptureOptions
  prepare?: (el: HTMLElement) => Promise<void> | void
  cleanup?: (el: HTMLElement) => Promise<void> | void
}

// ── Fluent page builders ──

export class TextPageBuilder {
  /** @internal */
  _actions: TextAction[] = []

  title(text: string, options?: { fontSize?: number; color?: string }): this {
    this._actions.push({ type: 'title', value: text, options })
    return this
  }

  subtitle(text: string, options?: { fontSize?: number; color?: string }): this {
    this._actions.push({ type: 'subtitle', value: text, options })
    return this
  }

  text(
    text: string,
    options?: { fontSize?: number; color?: string; align?: 'left' | 'center' | 'right' }
  ): this {
    this._actions.push({ type: 'text', value: text, options })
    return this
  }

  space(mm: number): this {
    this._actions.push({ type: 'space', options: { mm } })
    return this
  }

  separator(options?: { color?: string }): this {
    this._actions.push({ type: 'separator', options })
    return this
  }

  image(
    dataUrl: string,
    options?: { width?: number; height?: number; align?: 'left' | 'center' | 'right' }
  ): this {
    this._actions.push({ type: 'image', value: dataUrl, options })
    return this
  }
}

export interface CapturePageOptions extends CaptureOptions {
  prepare?: (el: HTMLElement) => Promise<void> | void
  cleanup?: (el: HTMLElement) => Promise<void> | void
}

export class CapturePageBuilder {
  /** @internal */
  _textActions: TextAction[] = []

  title(text: string, options?: { fontSize?: number; color?: string }): this {
    this._textActions.push({ type: 'title', value: text, options })
    return this
  }

  subtitle(text: string, options?: { fontSize?: number; color?: string }): this {
    this._textActions.push({ type: 'subtitle', value: text, options })
    return this
  }
}

// ── Main PdfDocument class ──

/**
 * Declarative, fluent API for composing multi-page PDFs with mixed content types.
 *
 * Built on top of PdfBuilder and captureElement — those remain as internal tools.
 *
 * @example
 * ```ts
 * const doc = new PdfDocument({ format: 'a4' })
 *
 * doc.textPage()
 *   .title('My Report')
 *   .space(10)
 *   .text('Generated on ...')
 *
 * doc.capturePage(myElement, { scale: 2 })
 *   .subtitle('Chart')
 *
 * doc.capturePages(tallElement, { engine: 'dom-to-image' })
 *   .title('Full Data')
 *
 * const result = await doc.build()
 * // result.blobUrl, result.pageCount, result.previews
 * ```
 */
export class PdfDocument {
  private options: Required<PdfDocumentOptions>
  private pages: PageDefinition[] = []

  constructor(options: PdfDocumentOptions = {}) {
    this.options = {
      format: options.format || 'a4',
      orientation: options.orientation || 'portrait',
      pageNumbers: options.pageNumbers !== false, // default true
    }
  }

  /** Add a text-based page (titles, text, separators, spaces, images) */
  textPage(): TextPageBuilder {
    const builder = new TextPageBuilder()
    this.pages.push({
      kind: 'text',
      textActions: builder._actions,
    })
    return builder
  }

  /** Add a page with a captured DOM element (fits one page) */
  capturePage(element: HTMLElement, options?: CapturePageOptions): CapturePageBuilder {
    const builder = new CapturePageBuilder()
    this.pages.push({
      kind: 'capture',
      element,
      captureOptions: options,
      prepare: options?.prepare,
      cleanup: options?.cleanup,
      textActions: builder._textActions,
    })
    return builder
  }

  /** Add auto-paginated capture (tall element split across multiple pages) */
  capturePages(element: HTMLElement, options?: CapturePageOptions): CapturePageBuilder {
    const builder = new CapturePageBuilder()
    this.pages.push({
      kind: 'captureMulti',
      element,
      captureOptions: options,
      prepare: options?.prepare,
      cleanup: options?.cleanup,
      textActions: builder._textActions,
    })
    return builder
  }

  /** Build the PDF document and return blob URL + metadata */
  async build(): Promise<PdfResult> {
    const builder = new PdfBuilder({
      format: this.options.format,
      orientation: this.options.orientation,
    })

    const previewImages: string[] = []

    for (const page of this.pages) {
      switch (page.kind) {
        case 'text':
          this.buildTextPage(builder, page.textActions || [])
          break

        case 'capture':
          await this.buildCapturePage(builder, page, previewImages)
          break

        case 'captureMulti':
          await this.buildCaptureMultiPages(builder, page, previewImages)
          break
      }
    }

    if (this.options.pageNumbers) {
      builder.addPageNumbers()
    }

    const { blobUrl, pageCount } = await builder.build()

    return { blobUrl, pageCount, previews: previewImages }
  }

  // ── Private helpers ──

  private buildTextPage(builder: PdfBuilder, actions: TextAction[]): void {
    builder.addPage()
    for (const action of actions) {
      this.applyTextAction(builder, action)
    }
  }

  private async buildCapturePage(
    builder: PdfBuilder,
    page: PageDefinition,
    previewImages: string[]
  ): Promise<void> {
    if (!page.element) return

    if (page.prepare) await page.prepare(page.element)
    await new Promise(r => setTimeout(r, 800))

    const dataUrl = await captureElement(page.element, {
      bgcolor: page.captureOptions?.bgcolor || '#ffffff',
      scale: page.captureOptions?.scale || 2,
      width: page.captureOptions?.width,
      height: page.captureOptions?.height,
      engine: page.captureOptions?.engine || 'dom-to-image',
    })

    if (page.cleanup) await page.cleanup(page.element)

    builder.addPage()

    // Add text actions (title/subtitle before image)
    for (const action of page.textActions || []) {
      if (action.type === 'title' || action.type === 'subtitle') {
        builder.addSpace(3)
        builder.addSubtitle(action.value!, {
          fontSize: action.type === 'title' ? 16 : 14,
          color: action.type === 'title' ? '#1a1a2e' : '#333333',
          ...(action.options as Record<string, unknown>),
        })
        builder.addSpace(3)
      }
    }

    builder.addImage(dataUrl, { width: 170, height: 170, align: 'center' })
    previewImages.push(dataUrl)
  }

  private async buildCaptureMultiPages(
    builder: PdfBuilder,
    page: PageDefinition,
    previewImages: string[]
  ): Promise<void> {
    if (!page.element) return

    if (page.prepare) await page.prepare(page.element)
    await new Promise(r => setTimeout(r, 800))

    const fullDataUrl = await captureElement(page.element, {
      bgcolor: page.captureOptions?.bgcolor || '#ffffff',
      scale: page.captureOptions?.scale || 2,
      engine: page.captureOptions?.engine || 'dom-to-image',
    })

    if (page.cleanup) await page.cleanup(page.element)

    const contentWidth = builder.contentWidth
    const contentHeight = builder.contentHeight
    const slices = await this.sliceImage(fullDataUrl, contentWidth, contentHeight)

    for (let i = 0; i < slices.length; i++) {
      builder.addPage()
      if (i === 0 && page.textActions?.length) {
        for (const action of page.textActions) {
          if (action.type === 'title' || action.type === 'subtitle') {
            builder.addSpace(3)
            builder.addSubtitle(action.value!, {
              fontSize: action.type === 'title' ? 16 : 14,
              color: action.type === 'title' ? '#1a1a2e' : '#333333',
              ...(action.options as Record<string, unknown>),
            })
            builder.addSpace(3)
          }
        }
        // First page has less space for image due to title
        builder.addImage(slices[i]!, {
          width: contentWidth,
          height: contentHeight - 15,
          align: 'center',
        })
      } else {
        builder.addImage(slices[i]!, {
          width: contentWidth,
          height: contentHeight,
          align: 'center',
        })
      }
    }

    if (slices.length > 0) previewImages.push(...slices)
  }

  private applyTextAction(builder: PdfBuilder, action: TextAction): void {
    const opts = (action.options || {}) as Record<string, unknown>
    switch (action.type) {
      case 'title':
        builder.addTitle(action.value!, opts)
        break
      case 'subtitle':
        builder.addSubtitle(action.value!, opts)
        break
      case 'text':
        builder.addText(action.value!, opts)
        break
      case 'space':
        builder.addSpace((opts.mm as number) || 10)
        break
      case 'separator':
        builder.addSeparator(opts)
        break
      case 'image':
        builder.addImage(action.value!, opts)
        break
    }
  }

  /** Slice a tall image into page-sized chunks */
  private async sliceImage(
    dataUrl: string,
    pageWidthMm: number,
    pageHeightMm: number
  ): Promise<string[]> {
    return new Promise(resolve => {
      const img = new Image()
      img.onload = () => {
        const imgW = img.naturalWidth
        const imgH = img.naturalHeight

        // Calculate page height in pixels based on page aspect ratio
        const pageAspect = pageHeightMm / pageWidthMm
        const pageHeightPx = Math.floor(imgW * pageAspect)

        const totalSlices = Math.max(1, Math.ceil(imgH / pageHeightPx))
        const slices: string[] = []

        for (let i = 0; i < totalSlices; i++) {
          const canvas = document.createElement('canvas')
          canvas.width = imgW
          const remaining = imgH - i * pageHeightPx
          canvas.height = Math.min(pageHeightPx, remaining)

          const ctx = canvas.getContext('2d')
          if (!ctx) continue

          ctx.fillStyle = '#ffffff'
          ctx.fillRect(0, 0, canvas.width, canvas.height)

          ctx.drawImage(
            img,
            0,
            i * pageHeightPx,
            imgW,
            canvas.height,
            0,
            0,
            canvas.width,
            canvas.height
          )

          slices.push(canvas.toDataURL('image/png', 1.0))
        }

        resolve(slices)
      }
      img.onerror = () => resolve([])
      img.src = dataUrl
    })
  }
}

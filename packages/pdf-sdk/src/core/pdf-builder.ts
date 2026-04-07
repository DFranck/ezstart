import type { PdfBuilderOptions, PageOptions, TextOptions, ImageOptions } from './types'

// A4 dimensions in mm
const A4_WIDTH = 210
const A4_HEIGHT = 297
const LETTER_WIDTH = 216
const LETTER_HEIGHT = 279
const DEFAULT_MARGIN = 15

/**
 * Fluent API for building multi-page PDFs.
 * Uses jsPDF under the hood (dynamically imported).
 */
export class PdfBuilder {
  private options: Required<PdfBuilderOptions>
  private pages: PageAction[][] = []
  private currentPage: number = -1
  private pageWidth: number
  private pageHeight: number
  private margin: number = DEFAULT_MARGIN

  constructor(options: PdfBuilderOptions = {}) {
    this.options = {
      format: options.format || 'a4',
      orientation: options.orientation || 'portrait',
      bgColor: options.bgColor || '#ffffff',
      fontFamily: options.fontFamily || 'helvetica',
    }

    if (this.options.format === 'a4') {
      this.pageWidth = this.options.orientation === 'portrait' ? A4_WIDTH : A4_HEIGHT
      this.pageHeight = this.options.orientation === 'portrait' ? A4_HEIGHT : A4_WIDTH
    } else {
      this.pageWidth = this.options.orientation === 'portrait' ? LETTER_WIDTH : LETTER_HEIGHT
      this.pageHeight = this.options.orientation === 'portrait' ? LETTER_HEIGHT : LETTER_WIDTH
    }
  }

  /** Content width (page width minus margins) */
  get contentWidth(): number {
    return this.pageWidth - 2 * this.margin
  }

  /** Content height (page height minus margins) */
  get contentHeight(): number {
    return this.pageHeight - 2 * this.margin
  }

  /** Set margin in mm */
  setMargin(margin: number): PdfBuilder {
    this.margin = margin
    return this
  }

  /** Add a new page */
  addPage(options?: PageOptions): PdfBuilder {
    this.currentPage++
    this.pages[this.currentPage] = []
    const page = this.pages[this.currentPage]!
    if (options?.bgColor) {
      page.push({
        type: 'bg',
        bgColor: options.bgColor,
      })
    }
    return this
  }

  /** Add title text */
  addTitle(text: string, options?: TextOptions): PdfBuilder {
    this.addAction({
      type: 'text',
      text,
      options: {
        fontSize: options?.fontSize || 24,
        fontStyle: options?.fontStyle || 'bold',
        color: options?.color || '#000000',
        align: options?.align || 'center',
        maxWidth: options?.maxWidth,
        lineHeight: options?.lineHeight || 1.3,
      },
    })
    return this
  }

  /** Add subtitle text */
  addSubtitle(text: string, options?: TextOptions): PdfBuilder {
    this.addAction({
      type: 'text',
      text,
      options: {
        fontSize: options?.fontSize || 16,
        fontStyle: options?.fontStyle || 'bold',
        color: options?.color || '#333333',
        align: options?.align || 'center',
        maxWidth: options?.maxWidth,
        lineHeight: options?.lineHeight || 1.3,
      },
    })
    return this
  }

  /** Add body text */
  addText(text: string, options?: TextOptions): PdfBuilder {
    this.addAction({
      type: 'text',
      text,
      options: {
        fontSize: options?.fontSize || 11,
        fontStyle: options?.fontStyle || 'normal',
        color: options?.color || '#333333',
        align: options?.align || 'left',
        maxWidth: options?.maxWidth,
        lineHeight: options?.lineHeight || 1.5,
      },
    })
    return this
  }

  /** Add vertical space in mm */
  addSpace(mm: number): PdfBuilder {
    this.addAction({ type: 'space', mm })
    return this
  }

  /** Add a horizontal line separator */
  addSeparator(options?: { color?: string; thickness?: number }): PdfBuilder {
    this.addAction({
      type: 'separator',
      color: options?.color || '#cccccc',
      thickness: options?.thickness || 0.5,
    })
    return this
  }

  /** Add an image from data URL */
  addImage(dataUrl: string, options?: ImageOptions): PdfBuilder {
    this.addAction({
      type: 'image',
      dataUrl,
      options: {
        width: options?.width,
        height: options?.height,
        align: options?.align || 'center',
        format: options?.format || 'PNG',
      },
    })
    return this
  }

  /** Add page number footer to all pages */
  addPageNumbers(): PdfBuilder {
    this.addAction({ type: 'pageNumbers' })
    return this
  }

  /**
   * Build the PDF and return a blob URL.
   * Dynamically imports jsPDF for code splitting.
   */
  async build(): Promise<{ blobUrl: string; pageCount: number }> {
    const { jsPDF } = await import('jspdf')

    const doc = new jsPDF({
      orientation: this.options.orientation,
      unit: 'mm',
      format: this.options.format,
    })

    doc.setFont(this.options.fontFamily)

    let hasPageNumbers = false
    const totalPages = this.pages.length

    for (let pageIdx = 0; pageIdx < this.pages.length; pageIdx++) {
      if (pageIdx > 0) {
        doc.addPage()
      }

      let cursorY = this.margin
      const actions = this.pages[pageIdx]!

      for (const action of actions) {
        switch (action.type) {
          case 'bg': {
            const r = parseInt(action.bgColor!.slice(1, 3), 16)
            const g = parseInt(action.bgColor!.slice(3, 5), 16)
            const b = parseInt(action.bgColor!.slice(5, 7), 16)
            doc.setFillColor(r, g, b)
            doc.rect(0, 0, this.pageWidth, this.pageHeight, 'F')
            break
          }

          case 'text': {
            const opts = action.options!
            const r = parseInt(opts.color!.slice(1, 3), 16)
            const g = parseInt(opts.color!.slice(3, 5), 16)
            const b = parseInt(opts.color!.slice(5, 7), 16)
            doc.setTextColor(r, g, b)
            doc.setFontSize(opts.fontSize!)
            doc.setFont(this.options.fontFamily, opts.fontStyle!)

            const maxW = opts.maxWidth || this.contentWidth
            const lines = doc.splitTextToSize(action.text!, maxW)
            const lineH = (opts.fontSize! * (opts.lineHeight || 1.3)) / 2.835 // pt to mm

            let x = this.margin
            if (opts.align === 'center') x = this.pageWidth / 2
            else if (opts.align === 'right') x = this.pageWidth - this.margin

            doc.text(lines, x, cursorY, { align: opts.align, maxWidth: maxW })
            cursorY += lines.length * lineH
            break
          }

          case 'space': {
            cursorY += action.mm!
            break
          }

          case 'separator': {
            const sr = parseInt(action.color!.slice(1, 3), 16)
            const sg = parseInt(action.color!.slice(3, 5), 16)
            const sb = parseInt(action.color!.slice(5, 7), 16)
            doc.setDrawColor(sr, sg, sb)
            doc.setLineWidth(action.thickness!)
            doc.line(this.margin, cursorY, this.pageWidth - this.margin, cursorY)
            cursorY += 3
            break
          }

          case 'image': {
            const imgOpts = action.options!
            let imgW = imgOpts.width || this.contentWidth
            let imgH = imgOpts.height || imgW // Default square

            // Ensure it fits in the page
            if (imgW > this.contentWidth) {
              const ratio = this.contentWidth / imgW
              imgW = this.contentWidth
              imgH = imgH * ratio
            }

            let imgX = this.margin
            if (imgOpts.align === 'center') imgX = (this.pageWidth - imgW) / 2
            else if (imgOpts.align === 'right') imgX = this.pageWidth - this.margin - imgW

            doc.addImage(action.dataUrl!, imgOpts.format!, imgX, cursorY, imgW, imgH)
            cursorY += imgH
            break
          }

          case 'pageNumbers': {
            hasPageNumbers = true
            break
          }
        }
      }
    }

    // Add page numbers to all pages if requested
    if (hasPageNumbers) {
      for (let i = 1; i <= totalPages; i++) {
        doc.setPage(i)
        doc.setFontSize(9)
        doc.setTextColor(150, 150, 150)
        doc.text(`${i} / ${totalPages}`, this.pageWidth / 2, this.pageHeight - 8, { align: 'center' })
      }
    }

    const blob = doc.output('blob')
    const blobUrl = URL.createObjectURL(blob)
    return { blobUrl, pageCount: totalPages }
  }

  private addAction(action: PageAction): void {
    if (this.currentPage < 0) {
      this.addPage()
    }
    this.pages[this.currentPage]!.push(action)
  }
}

interface PageAction {
  type: 'text' | 'image' | 'space' | 'separator' | 'bg' | 'pageNumbers'
  text?: string
  dataUrl?: string
  mm?: number
  color?: string
  bgColor?: string
  thickness?: number
  options?: {
    fontSize?: number
    fontStyle?: string
    color?: string
    align?: 'left' | 'center' | 'right'
    maxWidth?: number
    lineHeight?: number
    width?: number
    height?: number
    format?: string
  }
}

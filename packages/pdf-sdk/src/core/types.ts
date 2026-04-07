export interface PdfBuilderOptions {
  format?: 'a4' | 'letter'
  orientation?: 'portrait' | 'landscape'
  /** Background color for pages (hex) */
  bgColor?: string
  /** Default font family */
  fontFamily?: string
}

export interface PageOptions {
  /** Background color override for this page */
  bgColor?: string
}

export interface TextOptions {
  /** Font size in pt */
  fontSize?: number
  /** Font style */
  fontStyle?: 'normal' | 'bold' | 'italic' | 'bolditalic'
  /** Text color (hex) */
  color?: string
  /** Horizontal alignment */
  align?: 'left' | 'center' | 'right'
  /** Max width in mm (for text wrapping) */
  maxWidth?: number
  /** Line height multiplier */
  lineHeight?: number
}

export interface ImageOptions {
  /** Width in mm */
  width?: number
  /** Height in mm */
  height?: number
  /** Horizontal alignment */
  align?: 'left' | 'center' | 'right'
  /** Format of the image */
  format?: 'PNG' | 'JPEG'
}

export interface CaptureOptions {
  /** Width of capture in pixels */
  width?: number
  /** Height of capture in pixels */
  height?: number
  /** Background color */
  bgcolor?: string
  /** Scale factor (default 2 for retina) */
  scale?: number
  /** Quality 0-1 */
  quality?: number
  /** Capture engine to use. html2canvas is better for SVG/complex DOM, dom-to-image for simpler HTML. Default: 'html2canvas' */
  engine?: 'html2canvas' | 'dom-to-image'
}

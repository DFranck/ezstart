export interface CaptureFrame {
  imageData: ImageData
  canvas: HTMLCanvasElement
  timestamp: number
  width: number
  height: number
}

export type CaptureProvider = 'screen' | 'camera' | 'upload'

export interface CaptureConfig {
  /** Capture provider: 'screen' (desktop), 'camera' (mobile), 'upload' (fallback) */
  provider?: CaptureProvider | 'auto'
  /** Frame extraction interval in ms (default: 500) */
  frameInterval?: number
  /** Callback on each new frame */
  onFrame?: (frame: CaptureFrame) => void
}

export interface CaptureState {
  isCapturing: boolean
  isSupported: boolean
  provider: CaptureProvider | null
  error: string | null
  currentFrame: CaptureFrame | null
}

export interface MaskRegion {
  /** Optional identifier for the mask region */
  id?: string
  /** X position as % of frame (0-100) */
  x: number
  /** Y position as % of frame (0-100) */
  y: number
  /** Width as % of frame (0-100) */
  width: number
  /** Height as % of frame (0-100) */
  height: number
}

export interface FrameDiffConfig {
  /** % of sampled pixels that must differ (default: 5) */
  threshold?: number
  /** Min per-pixel grayscale diff to count as changed (default: 20) */
  pixelThreshold?: number
  /** Sample 1 pixel per NxN grid (default: 4) */
  sampleRate?: number
  /** Wait ms of stability before triggering (default: 500) */
  stabilizeMs?: number
  /** Callback when frame stabilizes after change */
  onSignificantChange?: (frame: ImageData) => void
  /** Regions to exclude from comparison */
  masks?: MaskRegion[]
}

export interface ROIConfig {
  /** Initial ROI as % of frame */
  initial?: { x: number; y: number; width: number; height: number }
  /** Min ROI size in % */
  minSize?: number
  /** Aspect ratio constraint (width/height), null = free */
  aspectRatio?: number | null
}

export interface PiPConfig {
  /** Width of PiP window (default: 300) */
  width?: number
  /** Height of PiP window (default: 200) */
  height?: number
}

export interface CropOptions {
  /** Region to crop (% coordinates 0-100) */
  region: { x: number; y: number; width: number; height: number }
  /** Scale factor after crop (default: 1) */
  scale?: number
}

export interface PreprocessOptions {
  /** Convert to grayscale (default: true) */
  grayscale?: boolean
  /** Contrast multiplier (default: 1.0). Values > 1 increase contrast */
  contrast?: number
  /** Binarize with threshold (0-255, undefined = no binarization) */
  binarizeThreshold?: number
  /** Scale factor (2 = double resolution) */
  scale?: number
  /** Apply binarization (default: false). When true, uses binarizeThreshold (default 128) */
  binarize?: boolean
  /** Apply sharpening (default: false) — reserved for future use */
  sharpen?: boolean
}

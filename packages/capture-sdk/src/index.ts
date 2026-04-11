// Hooks
export { useCapture } from './hooks/use-capture'
export { useFrameDiff } from './hooks/use-frame-diff'
export { usePiP, createPortal } from './hooks/use-pip'
export { useROI } from './hooks/use-roi'

// Providers
export type { CaptureProviderInstance } from './providers'
export { createScreenProvider, createCameraProvider, createUploadProvider } from './providers'

// Utils
export { cropImageData, cropCanvas } from './utils/crop'
export { preprocessImageData, preprocessCanvas, getAdaptiveScale } from './utils/preprocess'
export { imageHash, hammingDistance, isSameImage, quickHash } from './utils/hash'
export { canvasFromImageData, imageDataToBlob, imageDataToJpegBase64 } from './utils/convert'
export { applyBlackoutMasks } from './utils/mask'

// Components
export * from './components'

// Types
export type {
  CaptureFrame,
  CaptureProvider,
  CaptureConfig,
  CaptureState,
  MaskRegion,
  FrameDiffConfig,
  ROIConfig,
  PiPConfig,
  CropOptions,
  PreprocessOptions,
} from './types'

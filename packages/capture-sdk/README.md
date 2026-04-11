# @ezstart/capture-sdk

Agnostic media capture & image manipulation SDK — multi-provider screen/camera capture, image cropping, preprocessing, frame analysis, and interactive selection components.

## Purpose

`@ezstart/capture-sdk` centralizes **everything related to visual media** in the monorepo:

- **Capture** — screen sharing, camera feed, file upload (3 providers, auto-detection)
- **Manipulate** — crop, preprocess (grayscale/contrast/binarize/scale), blackout masks
- **Analyze** — frame diff detection (change tracking), perceptual hash (dedup/cache)
- **Display** — ImageCropper, RoiSelector, BlackoutMask, PiP overlay
- **Convert** — ImageData ↔ Canvas ↔ Blob ↔ JPEG base64

100% agnostic — zero game/app-specific logic. Each app plugs its own domain logic on top.

## Installation

```bash
pnpm add @ezstart/capture-sdk
```

Peer dependency: `react ^18 || ^19`

## Architecture

```
@ezstart/capture-sdk/
├── providers/          # Capture sources (multi-provider pattern)
│   ├── screen.ts       # getDisplayMedia (desktop)
│   ├── camera.ts       # getUserMedia (mobile back camera)
│   └── upload.ts       # File input fallback (always available)
├── hooks/              # React hooks
│   ├── use-capture.ts  # Provider-agnostic capture (auto-detect)
│   ├── use-frame-diff.ts # Change detection + stabilization
│   ├── use-pip.ts      # Picture-in-Picture overlay
│   └── use-roi.ts      # Region of Interest state
├── components/         # Interactive UI components
│   ├── image-cropper.tsx  # Pan-zoom & edge-drag cropper
│   ├── roi-selector.tsx   # Draggable rectangle overlay
│   └── blackout-mask.tsx  # Mask regions editor
├── utils/              # Image processing utilities
│   ├── crop.ts         # ROI cropping (% coords)
│   ├── preprocess.ts   # Grayscale, contrast, binarize, scale
│   ├── mask.ts         # Blackout mask application
│   ├── hash.ts         # Perceptual hash + fast dedup hash
│   └── convert.ts      # ImageData ↔ Canvas ↔ Blob ↔ JPEG
└── types.ts            # All shared TypeScript types
```

## Quick Start

### Screen Capture with Change Detection

```tsx
import { useCapture, useFrameDiff } from '@ezstart/capture-sdk'

function LiveScanner() {
  const { processFrame } = useFrameDiff({
    threshold: 5,
    stabilizeMs: 500,
    onSignificantChange: frame => {
      // Auto-triggered when frame stabilizes after a change
      analyzeFrame(frame)
    },
  })

  const { isCapturing, startCapture, stopCapture } = useCapture({
    provider: 'auto',
    frameInterval: 500,
    onFrame: frame => processFrame(frame.imageData),
  })

  return (
    <Button onClick={isCapturing ? stopCapture : startCapture}>
      {isCapturing ? 'Stop' : 'Start Capture'}
    </Button>
  )
}
```

### Image Cropping (Avatar, Plan, etc.)

```tsx
import { ImageCropper } from '@ezstart/capture-sdk'

function AvatarUpload() {
  return (
    <ImageCropper
      image={selectedFile}
      aspectRatio={1}
      onCropComplete={croppedImage => uploadAvatar(croppedImage)}
    />
  )
}
```

### ROI Selection on a Canvas

```tsx
import { RoiSelector, type RoiRect } from '@ezstart/capture-sdk'

function RegionPicker({ canvasRef }: { canvasRef: RefObject<HTMLCanvasElement> }) {
  const [roi, setRoi] = useState<RoiRect>({ x: 10, y: 10, width: 40, height: 30 })

  return (
    <div style={{ position: 'relative' }}>
      <canvas ref={canvasRef} />
      <RoiSelector roi={roi} onChange={setRoi} />
    </div>
  )
}
```

### Image Preprocessing Pipeline

```tsx
import { cropImageData, preprocessImageData, imageDataToBlob } from '@ezstart/capture-sdk'

async function processForOCR(frame: ImageData, roi: RoiRect) {
  // 1. Crop to region of interest
  const cropped = cropImageData(frame, roi)

  // 2. Preprocess for OCR (upscale + grayscale + contrast + binarize)
  const processed = preprocessImageData(cropped, {
    scale: 2,
    grayscale: true,
    contrast: 1.8,
    binarize: true,
    binarizeThreshold: 128,
  })

  // 3. Convert to blob for upload
  const blob = await imageDataToBlob(processed)
  return blob
}
```

### Frame Dedup Cache

```tsx
import { quickHash } from '@ezstart/capture-sdk'

const lastHash = useRef('')

function onNewFrame(frame: ImageData) {
  const hash = quickHash(frame)
  if (hash === lastHash.current) return // Skip duplicate
  lastHash.current = hash
  processFrame(frame)
}
```

## API Reference

### Hooks

#### `useCapture(config?: CaptureConfig)`

Provider-agnostic capture hook with auto-detection.

| Config          | Type                                         | Default  | Description                    |
| --------------- | -------------------------------------------- | -------- | ------------------------------ |
| `provider`      | `'screen' \| 'camera' \| 'upload' \| 'auto'` | `'auto'` | Capture source                 |
| `frameInterval` | `number`                                     | `500`    | Frame extraction interval (ms) |
| `onFrame`       | `(frame: CaptureFrame) => void`              | —        | Called on each new frame       |

Returns: `{ isCapturing, isSupported, provider, error, currentFrame, startCapture, stopCapture }`

#### `useFrameDiff(config?: FrameDiffConfig)`

Frame change detection with stabilization debounce. Compares successive frames using grayscale sampling.

| Config                | Type                         | Default | Description                  |
| --------------------- | ---------------------------- | ------- | ---------------------------- |
| `threshold`           | `number`                     | `5`     | % of pixels that must differ |
| `pixelThreshold`      | `number`                     | `20`    | Min grayscale diff per pixel |
| `sampleRate`          | `number`                     | `4`     | Sample 1 pixel every N       |
| `stabilizeMs`         | `number`                     | `500`   | Debounce before callback     |
| `onSignificantChange` | `(frame: ImageData) => void` | —       | Called when frame stabilizes |
| `masks`               | `MaskRegion[]`               | —       | Regions to exclude           |

Returns: `{ diffScore, isStable, processFrame, lastStableFrame }`

#### `usePiP(config?: PiPConfig)`

Picture-in-Picture overlay. Uses Document PiP API (Chrome 116+) with fallback to floating portal.

Returns: `{ isSupported, isOpen, open, close, update, portalContainer }`

#### `useROI(config?: ROIConfig)`

Region of Interest state management (percentage-based coordinates).

Returns: `{ roi, setROI, resetROI }`

### Components

#### `<ImageCropper />`

Interactive image cropper with two modes: pan-zoom (react-easy-crop) and edge-drag.

| Prop             | Type                   | Description                      |
| ---------------- | ---------------------- | -------------------------------- |
| `image`          | `string \| File`       | Image source                     |
| `aspectRatio`    | `number`               | Width/height ratio (null = free) |
| `onCropComplete` | `(blob: Blob) => void` | Callback with cropped result     |

#### `<RoiSelector />`

Draggable/resizable rectangle overlay for region selection.

| Prop       | Type                     | Description                                        |
| ---------- | ------------------------ | -------------------------------------------------- |
| `roi`      | `RoiRect`                | Current region `{ x, y, width, height }` (% 0-100) |
| `onChange` | `(roi: RoiRect) => void` | Called on drag/resize                              |

#### `<BlackoutMask />`

Mask editor for blacking out regions (useful for OCR preprocessing).

| Prop       | Type                            | Description                 |
| ---------- | ------------------------------- | --------------------------- |
| `masks`    | `MaskRegion[]`                  | Current masks               |
| `onChange` | `(masks: MaskRegion[]) => void` | Called on add/remove/resize |
| `labels`   | `{ addMask?, removeMask? }`     | Custom label text           |

### Utils

#### Image Manipulation

| Function                          | Input                    | Output    | Description                          |
| --------------------------------- | ------------------------ | --------- | ------------------------------------ |
| `cropImageData(data, roi)`        | ImageData + RoiRect      | ImageData | Crop to % region                     |
| `preprocessImageData(data, opts)` | ImageData + options      | ImageData | Grayscale, contrast, binarize, scale |
| `applyBlackoutMasks(data, masks)` | ImageData + MaskRegion[] | ImageData | Black out regions                    |
| `getAdaptiveScale(width)`         | number                   | number    | Auto scale factor (3x/2x/1x)         |

#### Conversion

| Function                          | Input     | Output            | Description              |
| --------------------------------- | --------- | ----------------- | ------------------------ |
| `canvasFromImageData(data)`       | ImageData | HTMLCanvasElement | Create canvas            |
| `imageDataToBlob(data)`           | ImageData | Promise\<Blob\>   | Convert to PNG blob      |
| `imageDataToJpegBase64(data, q?)` | ImageData | string            | Convert to JPEG data URL |

#### Hashing

| Function                  | Input                   | Output  | Description                              |
| ------------------------- | ----------------------- | ------- | ---------------------------------------- |
| `quickHash(data)`         | ImageData               | string  | Fast numeric hash (~1000 pixels sampled) |
| `imageHash(data, size?)`  | ImageData               | string  | Perceptual hash (average hash algorithm) |
| `hammingDistance(h1, h2)` | string, string          | number  | Distance between two hashes              |
| `isSameImage(h1, h2, t?)` | string, string, number? | boolean | Similarity check                         |

### Provider Selection Guide

| Provider | Best for               | API               | Browser support          |
| -------- | ---------------------- | ----------------- | ------------------------ |
| `screen` | Desktop screen capture | `getDisplayMedia` | Chrome, Edge, Firefox    |
| `camera` | Mobile photo/video     | `getUserMedia`    | All modern browsers      |
| `upload` | Universal fallback     | File input        | All browsers             |
| `auto`   | Any context            | Auto-detect       | Falls back automatically |

## Used by

| App                | Usage                                                                |
| ------------------ | -------------------------------------------------------------------- |
| **gacha-analyzer** | Screen capture + frame diff + ROI + masks + crop + preprocess + hash |
| **auth-sdk**       | ImageCropper for avatar upload (AccountModal)                        |
| **fengshui**       | ImageCropper for floor plan upload (PlanUploader)                    |

## Related packages

- `@ezstart/ocr-sdk` — OCR processing (consumes capture frames)
- `@ezstart/ui` — UI primitives used by SDK components
- `@ezstart/ai-sdk` — AI vision support (consumes preprocessed images)

# @ezstart/capture-sdk

Provider-agnostic screen/camera capture SDK with frame diffing, ROI selection, Picture-in-Picture overlay, and image preprocessing utilities.

## Overview

`@ezstart/capture-sdk` extracts and generalizes screen capture functionality into a reusable, agnostic SDK. It supports:

- **Screen capture** (desktop via `getDisplayMedia`)
- **Camera capture** (mobile via `getUserMedia`)
- **File upload** fallback (universal)
- **Frame diff detection** with stabilization
- **Picture-in-Picture** overlay (native API + fallback)
- **ROI selection** (region of interest)
- **Image utilities** (crop, preprocess, perceptual hash)

## Installation

```bash
pnpm add @ezstart/capture-sdk
```

Peer dependency: `react ^18 || ^19`

## Quick Start

```tsx
import { useCapture, useFrameDiff } from '@ezstart/capture-sdk'

function CaptureView() {
  const { processFrame, lastStableFrame } = useFrameDiff({
    threshold: 5,
    stabilizeMs: 500,
    onSignificantChange: frame => {
      // Process the stabilized frame (e.g., OCR, analysis)
    },
  })

  const { isCapturing, startCapture, stopCapture, error } = useCapture({
    provider: 'auto', // screen > camera > upload
    frameInterval: 500,
    onFrame: frame => {
      processFrame(frame.imageData)
    },
  })

  return (
    <div>
      {isCapturing ? (
        <button onClick={stopCapture}>Stop</button>
      ) : (
        <button onClick={startCapture}>Start Capture</button>
      )}
      {error && <p>{error}</p>}
    </div>
  )
}
```

## API Reference

### Hooks

#### `useCapture(config?: CaptureConfig)`

Provider-agnostic capture hook. Auto-detects the best provider based on browser capabilities.

| Config          | Type                                         | Default  | Description                  |
| --------------- | -------------------------------------------- | -------- | ---------------------------- |
| `provider`      | `'screen' \| 'camera' \| 'upload' \| 'auto'` | `'auto'` | Capture source               |
| `frameInterval` | `number`                                     | `500`    | Frame extraction interval ms |
| `onFrame`       | `(frame: CaptureFrame) => void`              | -        | Called on each new frame     |

Returns: `CaptureState & { startCapture, stopCapture }`

#### `useFrameDiff(config?: FrameDiffConfig)`

Frame change detection with stabilization debounce.

| Config                | Type                         | Default | Description                         |
| --------------------- | ---------------------------- | ------- | ----------------------------------- |
| `threshold`           | `number`                     | `5`     | % of pixels that must differ        |
| `pixelThreshold`      | `number`                     | `20`    | Min grayscale diff per pixel        |
| `sampleRate`          | `number`                     | `4`     | Sample 1 pixel every N              |
| `stabilizeMs`         | `number`                     | `500`   | Debounce before triggering callback |
| `onSignificantChange` | `(frame: ImageData) => void` | -       | Called when frame stabilizes        |
| `masks`               | `MaskRegion[]`               | -       | Regions to exclude from comparison  |

Returns: `{ diffScore, isStable, processFrame, lastStableFrame }`

#### `usePiP(config?: PiPConfig)`

Picture-in-Picture overlay. Uses Document PiP API (Chrome 116+) with fallback to floating div.

Returns: `{ isSupported, isOpen, open, close, update, portalContainer }`

#### `useROI(config?: ROIConfig)`

Region of Interest selection with percentage-based coordinates.

Returns: `{ roi, setROI, resetROI }`

### Utils

#### `cropImageData(imageData, options)` / `cropCanvas(canvas, options)`

Crop to a region defined in percentage coordinates (0-100).

#### `preprocessImageData(imageData, options)` / `preprocessCanvas(canvas, options)`

Apply transformations: grayscale, contrast, binarization, scaling.

#### `imageHash(imageData, hashSize?)` / `hammingDistance(h1, h2)` / `isSameImage(h1, h2, threshold?)`

Perceptual image hashing for deduplication and cache.

### Provider Selection Guide

| Provider | Best for           | API used          | Browser support          |
| -------- | ------------------ | ----------------- | ------------------------ |
| `screen` | Desktop apps       | `getDisplayMedia` | Chrome, Edge, Firefox    |
| `camera` | Mobile apps        | `getUserMedia`    | All modern browsers      |
| `upload` | Universal fallback | File input        | All browsers             |
| `auto`   | Any context        | Auto-detect       | Falls back automatically |

## Used by

- gacha-analyzer
- (future: fengshui, ezbill)

## Related packages

- `@ezstart/ocr-sdk` — OCR processing (consumes capture frames)
- `@ezstart/ui` — UI components for capture overlays

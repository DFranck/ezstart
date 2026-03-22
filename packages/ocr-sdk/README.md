# @ezstart/ocr-sdk

OCR SDK with Tesseract.js engine and extensible game-specific parsers.

## Installation

```bash
pnpm add @ezstart/ocr-sdk
```

## Usage

### Recognize text from an image

```typescript
import { recognize } from '@ezstart/ocr-sdk'
import { readFileSync } from 'fs'

const image = readFileSync('./screenshot.png')
const result = await recognize(image, { language: 'eng' })

console.log(result.text)       // Full recognized text
console.log(result.confidence) // Overall confidence (0-100)
console.log(result.regions)    // Word-level regions with bounding boxes
```

### Parser helpers

```typescript
import { cleanText, extractNumbers, matchPattern } from '@ezstart/ocr-sdk'

cleanText('  HP:  1250 |')        // 'HP: 1250'
extractNumbers('ATK 3200 DEF 1800') // [3200, 1800]
matchPattern('Level 40', /Level (\d+)/) // '40'
```

### Implement a game parser

```typescript
import type { GameParser, OcrResult } from '@ezstart/ocr-sdk'
import { cleanText, successResult, failedResult } from '@ezstart/ocr-sdk'

const myParser: GameParser = {
  gameName: 'my-game',
  parse(ocrResult: OcrResult) {
    const text = cleanText(ocrResult.text)
    // ... extract game-specific data
    return successResult({ name: 'Unit', atk: 3200 })
  },
}
```

## Architecture

```
src/
├── index.ts           # Public exports
├── types.ts           # Core types (OcrResult, GameParser, etc.)
├── engines/
│   └── tesseract.ts   # Tesseract.js wrapper
└── parsers/
    └── base-parser.ts # GameParser interface + shared helpers
```

# @ezstart/pdf-sdk

Multi-engine PDF generation SDK — fluent multi-page builder, DOM capture, and React-PDF renderer.

## Install

```bash
pnpm add @ezstart/pdf-sdk
```

Peer dependency: `react >=18`. Underlying engines (`jspdf`, `html2canvas`, `dom-to-image-more`, `@react-pdf/renderer`) are dynamically imported, so they don't bloat your bundle until you call them.

## Architecture

```
@ezstart/pdf-sdk/
├── core/
│   ├── pdf-builder.ts    # Low-level fluent API on top of jsPDF
│   ├── pdf-document.ts   # High-level multi-page composition (text + capture)
│   ├── capture.ts        # captureElement() — DOM -> PNG data URL
│   └── types.ts          # Shared option types
├── hooks/
│   └── use-generate-pdf.tsx  # React hook for @react-pdf/renderer
└── index.ts              # Barrel: re-exports everything
```

The package ships two independent PDF generation paths:

- **`PdfDocument` / `PdfBuilder`** — imperative, jsPDF-based. Best for mixed text + DOM-captured chart pages.
- **`useGeneratePDF`** — declarative, `@react-pdf/renderer`-based. Best when the document is itself a React component tree.

Pick the one that matches your authoring style; you don't need both.

## Quickstart — Fluent multi-page document (text + DOM capture)

Compose a multi-page PDF that mixes text pages and screenshots of live DOM elements (charts, dashboards, etc.).

```tsx
import { PdfDocument } from '@ezstart/pdf-sdk'

async function exportReport(chartEl: HTMLElement) {
  const doc = new PdfDocument({ format: 'a4', orientation: 'portrait' })

  doc
    .textPage()
    .title('Q1 Report')
    .space(8)
    .text('Generated on ' + new Date().toLocaleDateString())
    .separator()

  doc.capturePage(chartEl, { engine: 'html2canvas', scale: 2 }).subtitle('Revenue chart')

  const result = await doc.build()
  // result.blobUrl  -> open / download
  // result.pageCount
  // result.previews -> data URLs for thumbnails
  return result.blobUrl
}
```

For long elements that don't fit on one page, use `capturePages()` to auto-paginate:

```tsx
doc.capturePages(longTableEl, { engine: 'dom-to-image' }).title('Full ledger')
```

## Quickstart — React-PDF declarative document

When your document is naturally a React component tree (`@react-pdf/renderer` primitives), use the hook.

```tsx
'use client'
import { Document, Page, Text, View } from '@react-pdf/renderer'
import { useGeneratePDF } from '@ezstart/pdf-sdk'
import { Button } from '@ezstart/ui/components'
import { toast } from 'sonner'

function InvoiceDoc({ amount }: { amount: number }) {
  return (
    <Document>
      <Page size="A4">
        <View>
          <Text>Invoice</Text>
          <Text>Total: ${amount}</Text>
        </View>
      </Page>
    </Document>
  )
}

export function DownloadButton() {
  const { downloadPDF, isGenerating, error } = useGeneratePDF({
    filename: 'invoice.pdf',
    onSuccess: () => toast.success('Downloaded'),
    onError: err => toast.error(err.message),
  })

  return (
    <Button onClick={() => downloadPDF(<InvoiceDoc amount={1234} />)} disabled={isGenerating}>
      {isGenerating ? 'Generating…' : 'Download invoice'}
    </Button>
  )
}
```

## Quickstart — Capture a DOM element to PNG

Standalone helper if you only need a screenshot (no PDF wrapping).

```ts
import { captureElement } from '@ezstart/pdf-sdk'

const dataUrl = await captureElement(node, {
  engine: 'html2canvas', // or 'dom-to-image'
  scale: 2,
  bgcolor: '#ffffff',
})
// dataUrl is a 'data:image/png;base64,...' string
```

`captureElement` auto-fixes modern CSS color functions (`oklch()`, `oklab()`, `lab()`, `lch()`) by resolving them to hex via a hidden canvas, so html2canvas can render them. Use `'dom-to-image'` engine for transparent backgrounds.

## API

### `PdfDocument`

High-level fluent composer for multi-page PDFs that mix text pages and DOM captures.

| Method                    | Description                                                                    |
| ------------------------- | ------------------------------------------------------------------------------ |
| `textPage()`              | Start a text-only page (returns `TextPageBuilder` for `.title/.text/.image/…`) |
| `capturePage(el, opts?)`  | Add a page that screenshots `el` (returns `CapturePageBuilder` for title/sub)  |
| `capturePages(el, opts?)` | Same as above but auto-splits a tall element across multiple pages             |
| `build()`                 | Returns `{ blobUrl, pageCount, previews }` (previews = per-page PNG data URLs) |

### `PdfBuilder`

Lower-level fluent jsPDF wrapper. Use directly if you need fine-grained control over each page's layout.

Chainable methods: `addPage`, `addTitle`, `addSubtitle`, `addText`, `addSpace`, `addSeparator`, `addImage`, `addPageNumbers`, `setMargin`, then `await build()` to get `{ blobUrl, pageCount }`.

### `captureElement(el, options?)`

Capture a DOM element as a PNG `data:` URL. Engines: `'html2canvas'` (default, handles SVG and modern colors) or `'dom-to-image'` (better for transparent backgrounds and simpler HTML).

### `useGeneratePDF(options?)`

React hook around `@react-pdf/renderer`.

| Property       | Description                                                             |
| -------------- | ----------------------------------------------------------------------- |
| `generatePDF`  | `(component) => Promise<void>` — render to blob without downloading     |
| `downloadPDF`  | `(component, filename?) => Promise<void>` — render and trigger download |
| `isGenerating` | `boolean` — loading state                                               |
| `error`        | `Error \| null` — last error from generation                            |

Options: `filename` (default `'document.pdf'`), `onSuccess`, `onError`.

### Types

`PdfBuilderOptions`, `PdfDocumentOptions`, `PdfResult`, `CapturePageOptions`, `PageOptions`, `TextOptions`, `ImageOptions`, `CaptureOptions`, `UseGeneratePDFOptions`, `UseGeneratePDFReturn`.

## Choosing an engine for capture

| Engine         | Best for                            | Trade-offs                                      |
| -------------- | ----------------------------------- | ----------------------------------------------- |
| `html2canvas`  | SVG, CSS transforms, oklch colors   | Slower; no transparent background               |
| `dom-to-image` | Simple HTML, transparent background | Struggles with complex SVG and modern color CSS |

## Related

- `@ezstart/capture-sdk` — DOM/screen capture, image cropping, frame analysis (input source for `captureElement`)
- `@ezstart/auth-sdk` — authentication SDK (sibling consumer-facing SDK)
- `@ezstart/ai-sdk` — AI provider gateway (often used together to generate PDF reports from AI output)
- `@ezstart/ui` — UI primitives (`Button`, etc.) used in the React quickstart

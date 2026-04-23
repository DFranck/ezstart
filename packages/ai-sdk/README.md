# @ezstart/ai-sdk

Unified AI SDK with multi-provider support for backend and frontend.

## Purpose

Abstracts AI providers (OpenAI, Gemini, Claude) behind a single interface. Provides server-side AI services, a React chat component, and an admin dashboard for managing AI usage across apps.

## Tech Stack

- TypeScript, Zod schemas, React (client components)
- Provider adapters: OpenAI, Google Gemini, Anthropic Claude

## Architecture

```
ai-sdk/src/
├── server/        # Backend AI service (createAIService, provider routing)
├── client/        # React components (AIChat, AIAdminDashboard)
├── components/    # Shared UI components
├── schemas.ts     # Zod validation schemas
└── ai-types.ts    # Shared types
```

## Install

```bash
pnpm add @ezstart/ai-sdk
```

## Usage

```typescript
// Backend — create AI service with provider routing
import { createAIService } from '@ezstart/ai-sdk'

// Frontend — chat component
import { AIChat } from '@ezstart/ai-sdk/client'

// Frontend — admin dashboard
import { AIAdminDashboard } from '@ezstart/ai-sdk/client'
```

## Providers

All providers implement the `IAIProvider` interface exported from `./server/providers/base.js` and share the same `sendMessage(message, options)` surface (non-streaming + streaming + vision + JSON extraction).

| Provider           | Class               | Default model       | Env var             |
| ------------------ | ------------------- | ------------------- | ------------------- |
| OpenAI             | `OpenAIProvider`    | `gpt-4o`            | `OPENAI_API_KEY`    |
| Google Gemini      | `GeminiProvider`    | `gemini-2.5-flash`  | `GEMINI_API_KEY`    |
| Anthropic (Claude) | `AnthropicProvider` | `claude-sonnet-4-5` | `ANTHROPIC_API_KEY` |

### Direct usage

```typescript
import { AnthropicProvider } from '@ezstart/ai-sdk'

const provider = new AnthropicProvider({
  apiKey: process.env.ANTHROPIC_API_KEY,
  model: 'claude-sonnet-4-5', // optional override
})

// Non-streaming
const result = await provider.sendMessage('Hello', {
  systemPrompt: 'You are a helpful assistant',
  temperature: 0.7,
  maxTokens: 1024,
})
console.log(result.text, result.tokensUsed)

// Streaming
await provider.sendMessage('Tell me a story', {
  streaming: {
    enabled: true,
    onChunk: chunk => process.stdout.write(chunk),
    onComplete: full => console.log('\n---', full.length, 'chars'),
  },
})

// Vision (base64 image)
await provider.sendMessage('Describe this image', {
  images: [{ data: base64String, mimeType: 'image/png' }],
})

// JSON extraction
const extracted = await provider.sendMessage('Return {"ok":true}', {
  extractJson: true,
})
console.log(extracted.extractedData) // { ok: true }
```

### Registry usage

For multi-provider routing, register providers with the `ProviderRegistry`:

```typescript
import { providerRegistry } from '@ezstart/ai-sdk'

providerRegistry.register({
  id: 'claude-prod',
  name: 'Claude Sonnet 4.5',
  type: 'anthropic',
  enabled: true,
  apiKey: process.env.ANTHROPIC_API_KEY,
  model: 'claude-sonnet-4-5',
  capabilities: {
    text: true,
    vision: true,
    audio: false,
    streaming: true,
    functionCalling: true,
    jsonMode: true,
  },
})

const provider = providerRegistry.getInstance('claude-prod')
const result = await provider.sendMessage('Hello')
```

## Streaming (SSE)

The AI SDK supports Server-Sent Events for token-by-token streaming end-to-end.

### Backend — SSE route

`apps/ezstart/api` exposes `POST /api/ai/chat/stream` which emits:

```
data: {"type":"meta","provider":"openai","conversationId":"..."}\n\n
data: {"type":"chunk","content":"Hel"}\n\n
data: {"type":"chunk","content":"lo"}\n\n
data: [DONE]\n\n
```

On server-side provider failure mid-stream, an error frame is emitted before `[DONE]`:

```
data: {"type":"error","error":"provider offline"}\n\n
data: [DONE]\n\n
```

The backend handles client abort (`req.on('close')`) and forwards provider errors as SSE events when the response headers have already been sent.

### Frontend — `useAIChatStream` (minimal)

Lightweight React hook for consumers that own their own message list:

```tsx
import { useAIChatStream } from '@ezstart/ai-sdk/client'

function ChatBox() {
  const { send, streamingText, fullText, loading, error, abort } = useAIChatStream({
    appName: 'myapp',
    onChunk: chunk => console.log('chunk:', chunk),
    onComplete: text => console.log('final:', text),
  })

  return (
    <>
      <button onClick={() => send('Tell me a joke')} disabled={loading}>
        Send
      </button>
      <pre>{streamingText || fullText}</pre>
      {error && <p role="alert">{error}</p>}
      {loading && <button onClick={abort}>Cancel</button>}
    </>
  )
}
```

### Frontend — `useAIThread` (full)

For the full experience (conversations, provider switching, persistence) use `useAIThread`, which wraps `useAIChatStream` semantics inside the conversation machinery.

```tsx
import { useAIThread } from '@ezstart/ai-sdk/client'

const thread = useAIThread({ appName: 'myapp', streaming: true })
```

## Environment variables

Add to your API `.env.local` / `.env.example`:

```env
# AI providers (at least one required)
OPENAI_API_KEY=
GEMINI_API_KEY=
ANTHROPIC_API_KEY=
```

## Testing

```bash
pnpm --filter @ezstart/ai-sdk test
```

Tests mock the upstream SDKs (`@anthropic-ai/sdk`, `openai`, `@google/generative-ai`) — no network calls.

## Used By

- apps/ezstart (API + web) — centralized AI management
- apps/ezbill (API) — invoice AI assistance
- apps/green-pulse (API + web) — ESG chat assistant

## Related

- [@ezstart/api-core](../api-core) — API infrastructure for AI routes

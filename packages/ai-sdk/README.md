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

## Usage

```typescript
// Backend — create AI service with provider routing
import { createAIService } from '@ezstart/ai-sdk'

// Frontend — chat component
import { AIChat } from '@ezstart/ai-sdk/client'

// Frontend — admin dashboard
import { AIAdminDashboard } from '@ezstart/ai-sdk/client'
```

## Used By

- apps/ezstart (API + web) — centralized AI management
- apps/ezbill (API) — invoice AI assistance
- apps/green-pulse (API + web) — ESG chat assistant

## Related

- [@ezstart/api-core](../api-core) — API infrastructure for AI routes

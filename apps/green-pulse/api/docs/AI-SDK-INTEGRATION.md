# AI SDK Integration - GreenPulse

This document explains how GreenPulse uses `@ezstart/ai-sdk` for AI chat functionality.

## Overview

GreenPulse now has **two chat endpoints**:

1. `/api/chat` - Original implementation (direct OpenAI calls)
2. `/api/chat-v2` - New implementation using `@ezstart/ai-sdk` ✨

Both endpoints work identically from the client's perspective, but `/api/chat-v2` uses the reusable AI SDK.

## Why Use @ezstart/ai-sdk?

✅ **Reusable** - Same SDK can be used in EZStart, EZBill, etc.
✅ **Hooks System** - beforeRequest/afterResponse for custom logic
✅ **Type-Safe** - Full TypeScript support
✅ **Multi-Provider** - Easy to switch between OpenAI, Anthropic, etc.
✅ **Maintainable** - Centralized AI logic

## Architecture

```
@ezstart/ai-sdk (package)
├── AIAgent class
├── Providers (OpenAI, Anthropic, custom)
└── Types

GreenPulse API
├── services/lia.service.ts
│   ├── liaAgent (general chat)
│   └── esgExtractionAgent (data extraction)
│
└── routes/chat-v2.ts
    └── POST /api/chat-v2 (uses liaAgent)
```

## Usage in GreenPulse

### 1. LIA Service (`services/lia.service.ts`)

```typescript
import { AIAgent } from '@ezstart/ai-sdk'

// General chat agent
export const liaAgent = new AIAgent({
  provider: 'openai',
  model: 'gpt-4o',
  preprompt: 'You are GreenPulse.AI, an ESG advisor...',
  temperature: 0.7,

  // Hook: Before request
  beforeRequest: async (context) => {
    console.log(`[LIA] User ${context.userId}: ${context.message}`)
    return context
  },

  // Hook: After response - saves to database
  afterResponse: async (context) => {
    await Conversation.findByIdAndUpdate(context.conversationId, {
      $push: { messages: [...] }
    })
    return context
  },

  // Hook: On error
  onError: async (error, context) => {
    console.error('[LIA] Error:', error.message)
  }
})

// ESG extraction agent (different config)
export const esgExtractionAgent = new AIAgent({
  provider: 'openai',
  model: 'gpt-4o',
  preprompt: 'You are a structured extractor...',
  temperature: 0.1, // Low temp for consistency

  // Parses JSON response
  afterResponse: async (context) => {
    const extracted = JSON.parse(context.response)
    context.metadata = { extractedData: extracted }
    return context
  }
})
```

### 2. Chat Route (`routes/chat-v2.ts`)

```typescript
import { chatWithLIA } from '../services/lia.service.js'

// POST /api/chat-v2
const result = await chatWithLIA(message, {
  extractEsg: extract_esg,
  conversationId: conversation_id,
  userId,
  history: conversationHistory,
})

res.json({
  success: true,
  data: {
    response: result.response,
    extracted_data: result.extractedData,
    conversation_id,
  },
  sdk_version: '@ezstart/ai-sdk@1.0.0', // Indicates using SDK
})
```

## Testing

### Test with cURL

```bash
# Test general chat
curl -X POST http://localhost:6160/api/chat-v2 \
  -H "Content-Type: application/json" \
  -d '{
    "message": "Tell me about ESG reporting",
    "extract_esg": false
  }'

# Test with ESG extraction
curl -X POST http://localhost:6160/api/chat-v2 \
  -H "Content-Type: application/json" \
  -d '{
    "message": "My company ABC Corp in Singapore used 5000 kWh in January 2024",
    "extract_esg": true
  }'
```

### Frontend Integration

No changes needed! The frontend can use `/api/chat-v2` exactly like `/api/chat`:

```typescript
// In green-pulse web
const config = {
  endpoint: `${getApiUrl('green-pulse')}/api/chat-v2`, // Just change endpoint
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  formatRequest: (message: string) => ({
    message,
    extract_esg: false,
    userId: user?._id,
    conversation_id: activeConversationId,
  }),
  formatResponse: (data: any) => data.response,
}
```

## Hooks Behavior

### beforeRequest Hook

Called **before** sending message to AI:

- Log user requests
- Add custom context
- Modify preprompt dynamically
- Load user preferences

### afterResponse Hook

Called **after** receiving AI response:

- Save to database (conversations)
- Send analytics
- Parse/validate extracted data
- Trigger webhooks

### onError Hook

Called when errors occur:

- Log errors
- Send alerts
- Fallback logic
- Retry mechanisms

## Configuration Per App

Each app can have different AI configs:

```typescript
// GreenPulse - ESG focused
const greenPulseAgent = new AIAgent({
  model: 'gpt-4o',
  preprompt: 'You are an ESG advisor...',
  temperature: 0.7,
})

// EZBill - Support focused
const ezbillAgent = new AIAgent({
  model: 'gpt-4',
  preprompt: 'You are an invoicing support assistant...',
  temperature: 0.5,
})

// EZStart - General help
const ezstartAgent = new AIAgent({
  model: 'gpt-3.5-turbo',
  preprompt: 'You are a helpful assistant...',
  temperature: 0.8,
})
```

## Migration Guide

To migrate `/api/chat` to use SDK:

1. ✅ Install `@ezstart/ai-sdk` in package.json
2. ✅ Create AI agents in `services/lia.service.ts`
3. ✅ Create new route `routes/chat-v2.ts`
4. ✅ Test both endpoints work identically
5. ⏭️ Update frontend to use `/api/chat-v2`
6. ⏭️ Deprecate old `/api/chat` endpoint

## Benefits Demonstrated

**Before (openai.service.ts):**

```typescript
// Direct OpenAI calls - hard to reuse
const response = await openai.chat.completions.create({
  model: 'gpt-4o',
  messages,
})

// Manual conversation saving in route
await Conversation.findByIdAndUpdate(...)
```

**After (lia.service.ts):**

```typescript
// Reusable agent - works in any project
const result = await liaAgent.chat(message, { conversationId })

// Automatic saving via afterResponse hook ✨
// No need to repeat DB logic in routes
```

## Next Steps

1. Test `/api/chat-v2` in production
2. Update frontend to use new endpoint
3. Add more hooks (analytics, rate limiting, etc.)
4. Create similar AI agents for EZBill, EZStart
5. Add Anthropic provider support

## Related Files

- `packages/ai-sdk/` - AI SDK package
- `apps/green-pulse/api/src/services/lia.service.ts` - GreenPulse AI agents
- `apps/green-pulse/api/src/routes/chat-v2.ts` - New chat endpoint
- `apps/green-pulse/api/src/routes/chat.ts` - Original endpoint (compare)

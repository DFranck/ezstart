# @ezstart/ai-sdk

Reusable AI SDK for backend APIs with configurable providers, preprompts, and hooks.

## Features

- ✅ **Multi-Provider Support** - OpenAI, Anthropic (coming soon), custom providers
- ✅ **Hooks System** - `beforeRequest` / `afterResponse` for custom logic
- ✅ **Streaming Support** - Real-time token-by-token responses
- ✅ **Type-Safe** - Full TypeScript support
- ✅ **Conversation History** - Pass message history for context
- ✅ **Error Handling** - Built-in error handling with `onError` hook
- ✅ **Token Tracking** - Track API usage automatically

## Installation

```bash
pnpm add @ezstart/ai-sdk
```

## Quick Start

```typescript
import { AIAgent } from '@ezstart/ai-sdk'

// Create AI agent with config
const agent = new AIAgent({
  provider: 'openai',
  model: 'gpt-4',
  preprompt: 'You are a helpful assistant for form generation.',
  temperature: 0.7,
  maxTokens: 2000,
})

// Send message
const response = await agent.chat('Create a contact form with name, email, and message fields')

console.log(response.text) // AI response
console.log(response.tokensUsed) // { prompt: 45, completion: 234, total: 279 }
```

## With Hooks

```typescript
const agent = new AIAgent({
  provider: 'openai',
  model: 'gpt-4',
  preprompt: 'You are a form generation assistant.',

  // Hook: Before sending request
  beforeRequest: async (context) => {
    console.log('📤 Sending to AI:', context.message)

    // Add custom context
    context.metadata = {
      timestamp: new Date().toISOString(),
      source: 'web-app'
    }

    return context
  },

  // Hook: After receiving response
  afterResponse: async (context) => {
    console.log('📥 Received from AI:', context.response)

    // Save to database
    await saveConversation({
      userId: context.userId,
      conversationId: context.conversationId,
      message: context.message,
      response: context.response,
      tokensUsed: context.tokensUsed
    })

    return context
  },

  // Hook: On error
  onError: async (error, context) => {
    console.error('❌ AI Error:', error.message)
    await logError(error, context)
  }
})

// Use agent
const response = await agent.chat('Generate a signup form', {
  userId: '123',
  conversationId: 'conv-456',
  metadata: { source: 'api' }
})
```

## Streaming Responses

```typescript
const agent = new AIAgent({
  provider: 'openai',
  model: 'gpt-4',
  streaming: {
    enabled: true,
    onChunk: (chunk) => {
      // Stream to client
      res.write(chunk)
    },
    onComplete: (fullText) => {
      console.log('Streaming complete:', fullText)
      res.end()
    }
  }
})

const response = await agent.chat('Explain React hooks')
```

## With Conversation History

```typescript
const history = [
  { role: 'user', content: 'What is React?' },
  { role: 'assistant', content: 'React is a JavaScript library...' }
]

const response = await agent.chat('Tell me more about hooks', {
  history,
  conversationId: 'conv-789'
})
```

## API Reference

### `AIAgent`

Main class for AI interactions.

#### Constructor

```typescript
new AIAgent(config: AIAgentConfig)
```

#### Methods

##### `chat(message, options?)`

Send message to AI and get response.

```typescript
await agent.chat('Your message', {
  history?: ChatMessage[]
  userId?: string
  conversationId?: string
  metadata?: Record<string, any>
})
```

##### `getInfo()`

Get agent configuration info.

```typescript
agent.getInfo()
// { provider: 'openai', model: 'gpt-4', temperature: 0.7, streaming: false }
```

### Types

#### `AIAgentConfig`

```typescript
interface AIAgentConfig {
  provider: 'openai' | 'anthropic' | 'custom'
  apiKey?: string // Optional if using env vars
  model: string
  preprompt?: string
  temperature?: number // 0-2 (default: 0.7)
  maxTokens?: number
  streaming?: StreamingOptions
  beforeRequest?: (context: AIRequestContext) => Promise<AIRequestContext>
  afterResponse?: (context: AIResponseContext) => Promise<AIResponseContext>
  onError?: (error: Error, context: AIRequestContext) => Promise<void>
}
```

#### `AIAgentResponse`

```typescript
interface AIAgentResponse {
  text: string
  tokensUsed?: {
    prompt: number
    completion: number
    total: number
  }
  raw?: any
  metadata?: Record<string, any>
}
```

## Environment Variables

```bash
# OpenAI
OPENAI_API_KEY=sk-...

# Anthropic (coming soon)
ANTHROPIC_API_KEY=...
```

## Examples

### GreenPulse Form Generation

```typescript
const formAgent = new AIAgent({
  provider: 'openai',
  model: 'gpt-4',
  preprompt: `You are an expert at generating web forms.
Generate form schemas with proper validation rules.
Output JSON format with fields, types, and validation.`,
  temperature: 0.7,
  beforeRequest: async (context) => {
    // Log request
    console.log('[FormGen]', context.message)
    return context
  },
  afterResponse: async (context) => {
    // Save generated form
    await saveForm(context.response, context.userId)
    return context
  }
})

const response = await formAgent.chat(
  'Create an employee onboarding form',
  { userId: 'user-123' }
)
```

### EZBill Support Chat

```typescript
const supportAgent = new AIAgent({
  provider: 'openai',
  model: 'gpt-4',
  preprompt: `You are a support assistant for EZBill invoicing software.
Help users with invoice creation, client management, and troubleshooting.
Be concise and helpful.`,
  temperature: 0.5,
  beforeRequest: async (context) => {
    // Add user context
    const user = await getUser(context.userId)
    context.metadata = {
      userPlan: user.plan,
      accountAge: user.accountAge
    }
    return context
  }
})

const response = await supportAgent.chat(
  'How do I create a recurring invoice?',
  { userId: 'user-456' }
)
```

## Roadmap

- [ ] Anthropic (Claude) provider
- [ ] Azure OpenAI provider
- [ ] Local model support (Ollama)
- [ ] Response caching
- [ ] Rate limiting
- [ ] Cost tracking

## License

MIT

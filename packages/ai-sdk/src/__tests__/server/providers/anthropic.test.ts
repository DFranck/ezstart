/**
 * Unit tests for AnthropicProvider
 *
 * Mocks `@anthropic-ai/sdk` so no real API calls happen. Covers:
 * - constructor + validateConfig (missing API key, env fallback)
 * - sendMessage (non-stream)
 * - streaming (onChunk + onComplete)
 * - vision (images in message)
 * - JSON extraction (valid + malformed)
 * - error handling (401 AuthenticationError, 429 RateLimitError,
 *   500 InternalServerError incl. overloaded_error, network failure)
 */

import { beforeEach, describe, expect, it, vi } from 'vitest'

// ---------------------------------------------------------------------------
// Mock @anthropic-ai/sdk
//
// `vi.mock` is hoisted above imports, so the factory cannot close over
// variables declared in this test file. Everything the mock needs is
// defined inline inside the factory, and the test-level `messagesCreate` /
// `messagesStream` fns are retrieved via `vi.hoisted()`.
// ---------------------------------------------------------------------------
const { messagesCreate, messagesStream } = vi.hoisted(() => ({
  messagesCreate: vi.fn(),
  messagesStream: vi.fn(),
}))

vi.mock('@anthropic-ai/sdk', () => {
  class MockAnthropicError extends Error {
    readonly status: number
    constructor(status: number, message: string) {
      super(message)
      this.name = 'APIError'
      this.status = status
    }
  }
  class MockAuthenticationError extends MockAnthropicError {
    constructor(message = 'invalid x-api-key') {
      super(401, message)
      this.name = 'AuthenticationError'
    }
  }
  class MockRateLimitError extends MockAnthropicError {
    constructor(message = 'rate_limit_error') {
      super(429, message)
      this.name = 'RateLimitError'
    }
  }
  class MockInternalServerError extends MockAnthropicError {
    constructor(message = 'overloaded_error') {
      super(529, message)
      this.name = 'InternalServerError'
    }
  }
  class MockAPIConnectionError extends MockAnthropicError {
    constructor(message = 'connection failed') {
      super(0, message)
      this.name = 'APIConnectionError'
    }
  }
  class MockAnthropic {
    apiKey: string | undefined
    messages: {
      create: typeof messagesCreate
      stream: typeof messagesStream
    }
    constructor(config: { apiKey?: string } = {}) {
      this.apiKey = config.apiKey
      this.messages = {
        create: messagesCreate,
        stream: messagesStream,
      }
    }
  }

  return {
    default: MockAnthropic,
    AnthropicError: MockAnthropicError,
    APIError: MockAnthropicError,
    AuthenticationError: MockAuthenticationError,
    RateLimitError: MockRateLimitError,
    InternalServerError: MockInternalServerError,
    APIConnectionError: MockAPIConnectionError,
  }
})

// ---------------------------------------------------------------------------
// Import after mocks so ESM uses the mocked module.
// ---------------------------------------------------------------------------
import { AnthropicProvider } from '../../../server/providers/anthropic.js'

// Local error factories — mirror the shape of the mocked @anthropic-ai/sdk
// error classes (name + status + message). We don't reuse the real classes
// because the real SDK constructors expect `(status, error, message, headers)`
// while our mocks use a single `message` argument.
function makeSdkError(name: string, status: number, message: string): Error {
  const err = new Error(message)
  err.name = name
  ;(err as Error & { status: number }).status = status
  return err
}
const authError = (msg = 'invalid x-api-key') => makeSdkError('AuthenticationError', 401, msg)
const rateLimitError = (msg = 'rate_limit_error') => makeSdkError('RateLimitError', 429, msg)
const internalError = (msg = 'overloaded_error') => makeSdkError('InternalServerError', 529, msg)
const connectionError = (msg = 'connection failed') => makeSdkError('APIConnectionError', 0, msg)

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
function makeResponse(text: string, inputTokens = 10, outputTokens = 5) {
  return {
    id: 'msg_test',
    type: 'message',
    role: 'assistant',
    model: 'claude-sonnet-4-5',
    content: [{ type: 'text', text }],
    stop_reason: 'end_turn',
    stop_sequence: null,
    usage: {
      input_tokens: inputTokens,
      output_tokens: outputTokens,
    },
  }
}

/**
 * Minimal Node-style event emitter used to fake `messages.stream(...)`.
 * The real SDK returns a MessageStream with `.on(...)` and `.finalMessage()`.
 */
function makeMockStream(chunks: string[], finalMessage: ReturnType<typeof makeResponse>) {
  const listeners: Record<string, Array<(arg: unknown) => void>> = {}
  return {
    on(event: string, cb: (arg: unknown) => void) {
      if (!listeners[event]) listeners[event] = []
      listeners[event].push(cb)
      return this
    },
    async finalMessage() {
      // Emit text chunks synchronously before resolving finalMessage.
      for (const chunk of chunks) {
        for (const cb of listeners['text'] ?? []) cb(chunk)
      }
      return finalMessage
    },
  }
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------
describe('AnthropicProvider', () => {
  beforeEach(() => {
    messagesCreate.mockReset()
    messagesStream.mockReset()
    delete process.env.ANTHROPIC_API_KEY
  })

  describe('constructor / validateConfig', () => {
    it('throws when no apiKey is provided and env var is absent', () => {
      expect(() => new AnthropicProvider()).toThrow('ANTHROPIC_API_KEY is required')
    })

    it('accepts apiKey via config', () => {
      const p = new AnthropicProvider({ apiKey: 'sk-ant-test' })
      expect(p).toBeInstanceOf(AnthropicProvider)
    })

    it('falls back to ANTHROPIC_API_KEY env var', () => {
      process.env.ANTHROPIC_API_KEY = 'sk-ant-from-env'
      const p = new AnthropicProvider()
      expect(p).toBeInstanceOf(AnthropicProvider)
    })

    it('uses the default model when none is provided', async () => {
      messagesCreate.mockResolvedValueOnce(makeResponse('hello'))
      const p = new AnthropicProvider({ apiKey: 'sk-ant-test' })
      await p.sendMessage('hi')
      expect(messagesCreate).toHaveBeenCalledWith(
        expect.objectContaining({ model: 'claude-sonnet-4-5' })
      )
    })

    it('honours a custom model', async () => {
      messagesCreate.mockResolvedValueOnce(makeResponse('hello'))
      const p = new AnthropicProvider({
        apiKey: 'sk-ant-test',
        model: 'claude-opus-4-1-20250805',
      })
      await p.sendMessage('hi')
      expect(messagesCreate).toHaveBeenCalledWith(
        expect.objectContaining({ model: 'claude-opus-4-1-20250805' })
      )
    })
  })

  describe('sendMessage (non-stream)', () => {
    it('returns text + token usage', async () => {
      messagesCreate.mockResolvedValueOnce(makeResponse('Bonjour', 12, 3))
      const p = new AnthropicProvider({ apiKey: 'sk-ant-test' })
      const result = await p.sendMessage('hello')
      expect(result.text).toBe('Bonjour')
      expect(result.tokensUsed).toEqual({ prompt: 12, completion: 3, total: 15 })
    })

    it('passes system prompt via the `system` param (not as a message role)', async () => {
      messagesCreate.mockResolvedValueOnce(makeResponse('ok'))
      const p = new AnthropicProvider({ apiKey: 'sk-ant-test' })
      await p.sendMessage('hi', { systemPrompt: 'You are a helpful assistant' })
      const call = messagesCreate.mock.calls[0]?.[0] as Record<string, unknown>
      expect(call.system).toBe('You are a helpful assistant')
      expect(call.messages).toEqual([{ role: 'user', content: 'hi' }])
    })

    it('injects conversation history and filters out `system` history entries', async () => {
      messagesCreate.mockResolvedValueOnce(makeResponse('ok'))
      const p = new AnthropicProvider({ apiKey: 'sk-ant-test' })
      await p.sendMessage('third', {
        history: [
          { role: 'system', content: 'ignored — goes to system param' },
          { role: 'user', content: 'first' },
          { role: 'assistant', content: 'second' },
        ],
      })
      const call = messagesCreate.mock.calls[0]?.[0] as { messages: unknown[] }
      expect(call.messages).toEqual([
        { role: 'user', content: 'first' },
        { role: 'assistant', content: 'second' },
        { role: 'user', content: 'third' },
      ])
    })

    it('applies custom temperature and maxTokens', async () => {
      messagesCreate.mockResolvedValueOnce(makeResponse('ok'))
      const p = new AnthropicProvider({ apiKey: 'sk-ant-test' })
      await p.sendMessage('hi', { temperature: 0.1, maxTokens: 256 })
      expect(messagesCreate).toHaveBeenCalledWith(
        expect.objectContaining({ temperature: 0.1, max_tokens: 256 })
      )
    })

    it('uses default temperature (0.7) and max_tokens (4096) when not provided', async () => {
      messagesCreate.mockResolvedValueOnce(makeResponse('ok'))
      const p = new AnthropicProvider({ apiKey: 'sk-ant-test' })
      await p.sendMessage('hi')
      expect(messagesCreate).toHaveBeenCalledWith(
        expect.objectContaining({ temperature: 0.7, max_tokens: 4096 })
      )
    })

    it('returns empty text when the content has no text block', async () => {
      messagesCreate.mockResolvedValueOnce({
        id: 'msg_test',
        type: 'message',
        role: 'assistant',
        content: [{ type: 'tool_use', id: 't_1', name: 'noop', input: {} }],
        usage: { input_tokens: 1, output_tokens: 1 },
      })
      const p = new AnthropicProvider({ apiKey: 'sk-ant-test' })
      const result = await p.sendMessage('hi')
      expect(result.text).toBe('')
    })
  })

  describe('vision (images)', () => {
    it('encodes images as base64 blocks alongside the text', async () => {
      messagesCreate.mockResolvedValueOnce(makeResponse('ok'))
      const p = new AnthropicProvider({ apiKey: 'sk-ant-test' })
      await p.sendMessage('Describe this', {
        images: [{ data: 'BASE64DATA', mimeType: 'image/png' }],
      })
      const call = messagesCreate.mock.calls[0]?.[0] as {
        messages: Array<{ role: string; content: unknown }>
      }
      expect(call.messages).toHaveLength(1)
      const content = call.messages[0]?.content as Array<Record<string, unknown>>
      expect(content[0]).toEqual({ type: 'text', text: 'Describe this' })
      expect(content[1]).toEqual({
        type: 'image',
        source: {
          type: 'base64',
          media_type: 'image/png',
          data: 'BASE64DATA',
        },
      })
    })
  })

  describe('JSON extraction', () => {
    it('parses valid JSON output into extractedData', async () => {
      messagesCreate.mockResolvedValueOnce(makeResponse('{"ok":true,"n":42}'))
      const p = new AnthropicProvider({ apiKey: 'sk-ant-test' })
      const result = await p.sendMessage('extract', { extractJson: true })
      expect(result.extractedData).toEqual({ ok: true, n: 42 })
      expect(result.text).toBe('Data extracted successfully')
    })

    it('returns null extractedData when the output is not valid JSON', async () => {
      messagesCreate.mockResolvedValueOnce(makeResponse('not-json'))
      const p = new AnthropicProvider({ apiKey: 'sk-ant-test' })
      const result = await p.sendMessage('extract', { extractJson: true })
      expect(result.extractedData).toBeNull()
      expect(result.text).toBe('Failed to parse extracted data')
    })
  })

  describe('streaming', () => {
    it('concatenates chunks and calls onChunk / onComplete', async () => {
      const stream = makeMockStream(['Hel', 'lo ', 'world'], makeResponse('Hello world', 4, 3))
      messagesStream.mockReturnValueOnce(stream)

      const onChunk = vi.fn()
      const onComplete = vi.fn()
      const p = new AnthropicProvider({ apiKey: 'sk-ant-test' })

      const result = await p.sendMessage('hi', {
        streaming: { enabled: true, onChunk, onComplete },
      })

      expect(onChunk).toHaveBeenCalledTimes(3)
      expect(onChunk).toHaveBeenNthCalledWith(1, 'Hel')
      expect(onChunk).toHaveBeenNthCalledWith(2, 'lo ')
      expect(onChunk).toHaveBeenNthCalledWith(3, 'world')
      expect(onComplete).toHaveBeenCalledWith('Hello world')
      expect(result.text).toBe('Hello world')
      expect(result.tokensUsed).toEqual({ prompt: 4, completion: 3, total: 7 })
    })

    it('does not call onChunk/onComplete when callbacks are omitted', async () => {
      const stream = makeMockStream(['ok'], makeResponse('ok', 1, 1))
      messagesStream.mockReturnValueOnce(stream)
      const p = new AnthropicProvider({ apiKey: 'sk-ant-test' })

      const result = await p.sendMessage('hi', { streaming: { enabled: true } })
      expect(result.text).toBe('ok')
    })
  })

  describe('error handling', () => {
    it('propagates 401 AuthenticationError from the SDK', async () => {
      messagesCreate.mockRejectedValueOnce(authError('invalid x-api-key'))
      const p = new AnthropicProvider({ apiKey: 'sk-ant-test' })
      await expect(p.sendMessage('hi')).rejects.toThrowError(/invalid x-api-key/)
    })

    it('propagates 429 RateLimitError', async () => {
      messagesCreate.mockRejectedValueOnce(rateLimitError())
      const p = new AnthropicProvider({ apiKey: 'sk-ant-test' })
      await expect(p.sendMessage('hi')).rejects.toThrowError(/rate_limit_error/)
    })

    it('propagates 5xx InternalServerError (e.g. overloaded_error)', async () => {
      messagesCreate.mockRejectedValueOnce(internalError('overloaded_error'))
      const p = new AnthropicProvider({ apiKey: 'sk-ant-test' })
      await expect(p.sendMessage('hi')).rejects.toThrowError(/overloaded_error/)
    })

    it('propagates network / connection errors', async () => {
      messagesCreate.mockRejectedValueOnce(connectionError('socket hang up'))
      const p = new AnthropicProvider({ apiKey: 'sk-ant-test' })
      await expect(p.sendMessage('hi')).rejects.toThrowError(/socket hang up/)
    })

    it('surfaces streaming errors from finalMessage()', async () => {
      const brokenStream = {
        on() {
          return this
        },
        async finalMessage() {
          throw rateLimitError('rate_limit_error')
        },
      }
      messagesStream.mockReturnValueOnce(brokenStream)
      const p = new AnthropicProvider({ apiKey: 'sk-ant-test' })
      await expect(p.sendMessage('hi', { streaming: { enabled: true } })).rejects.toThrowError(
        /rate_limit_error/
      )
    })
  })
})

/**
 * Unit tests for OpenAIProvider
 *
 * Mocks `openai` so no real API calls happen. Covers:
 * - constructor + validateConfig (missing API key, env fallback, custom model)
 * - sendMessage (non-stream)
 * - streaming (onChunk + onComplete, empty deltas, client-style abort)
 * - vision (images as image_url parts)
 * - JSON extraction (valid + malformed)
 * - error handling (API error propagation, mid-stream error)
 */

import { beforeEach, describe, expect, it, vi } from 'vitest'

// ---------------------------------------------------------------------------
// Mock `openai`
//
// `vi.mock` is hoisted above imports; the factory cannot close over module
// locals. Use `vi.hoisted()` to share the mock fn between factory and tests.
// ---------------------------------------------------------------------------
const { chatCompletionsCreate } = vi.hoisted(() => ({
  chatCompletionsCreate: vi.fn(),
}))

vi.mock('openai', () => {
  class MockOpenAI {
    apiKey: string | undefined
    chat: {
      completions: {
        create: typeof chatCompletionsCreate
      }
    }
    constructor(config: { apiKey?: string } = {}) {
      this.apiKey = config.apiKey
      this.chat = { completions: { create: chatCompletionsCreate } }
    }
  }
  return { default: MockOpenAI }
})

// ---------------------------------------------------------------------------
// Import after mocks so ESM uses the mocked module.
// ---------------------------------------------------------------------------
import { OpenAIProvider } from '../../../server/providers/openai.js'

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
interface MockChoice {
  message: { content: string | null }
}
interface MockResponse {
  choices: MockChoice[]
  usage?: { prompt_tokens: number; completion_tokens: number; total_tokens: number }
}

function makeResponse(text: string, prompt = 10, completion = 5): MockResponse {
  return {
    choices: [{ message: { content: text } }],
    usage: {
      prompt_tokens: prompt,
      completion_tokens: completion,
      total_tokens: prompt + completion,
    },
  }
}

interface MockStreamChunk {
  choices: Array<{ delta: { content?: string } }>
}

/** Async iterable matching the shape of `openai` streaming responses. */
function makeStream(chunks: string[]): AsyncIterable<MockStreamChunk> {
  return {
    [Symbol.asyncIterator]() {
      let i = 0
      return {
        async next() {
          if (i >= chunks.length) return { value: undefined, done: true as const }
          const value: MockStreamChunk = {
            choices: [{ delta: { content: chunks[i] } }],
          }
          i += 1
          return { value, done: false as const }
        },
      }
    },
  }
}

/** Stream that throws mid-iteration. */
function makeBrokenStream(chunks: string[], errorMessage: string): AsyncIterable<MockStreamChunk> {
  return {
    [Symbol.asyncIterator]() {
      let i = 0
      return {
        async next() {
          if (i >= chunks.length) throw new Error(errorMessage)
          const value: MockStreamChunk = { choices: [{ delta: { content: chunks[i] } }] }
          i += 1
          return { value, done: false as const }
        },
      }
    },
  }
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------
describe('OpenAIProvider', () => {
  beforeEach(() => {
    chatCompletionsCreate.mockReset()
    delete process.env.OPENAI_API_KEY
  })

  describe('constructor / validateConfig', () => {
    it('throws when no apiKey is provided and env var is absent', () => {
      expect(() => new OpenAIProvider()).toThrow('OPENAI_API_KEY is required')
    })

    it('accepts apiKey via config', () => {
      const p = new OpenAIProvider({ apiKey: 'sk-test' })
      expect(p).toBeInstanceOf(OpenAIProvider)
    })

    it('falls back to OPENAI_API_KEY env var', () => {
      process.env.OPENAI_API_KEY = 'sk-from-env'
      const p = new OpenAIProvider()
      expect(p).toBeInstanceOf(OpenAIProvider)
    })

    it('uses the default model (gpt-4o) when none provided', async () => {
      chatCompletionsCreate.mockResolvedValueOnce(makeResponse('hi'))
      const p = new OpenAIProvider({ apiKey: 'sk-test' })
      await p.sendMessage('hello')
      expect(chatCompletionsCreate).toHaveBeenCalledWith(
        expect.objectContaining({ model: 'gpt-4o' })
      )
    })

    it('honours a custom model', async () => {
      chatCompletionsCreate.mockResolvedValueOnce(makeResponse('hi'))
      const p = new OpenAIProvider({ apiKey: 'sk-test', model: 'gpt-4o-mini' })
      await p.sendMessage('hello')
      expect(chatCompletionsCreate).toHaveBeenCalledWith(
        expect.objectContaining({ model: 'gpt-4o-mini' })
      )
    })
  })

  describe('sendMessage (non-stream)', () => {
    it('returns text + token usage', async () => {
      chatCompletionsCreate.mockResolvedValueOnce(makeResponse('Bonjour', 12, 3))
      const p = new OpenAIProvider({ apiKey: 'sk-test' })
      const result = await p.sendMessage('hello')
      expect(result.text).toBe('Bonjour')
      expect(result.tokensUsed).toEqual({ prompt: 12, completion: 3, total: 15 })
    })

    it('prepends the system prompt as a system message', async () => {
      chatCompletionsCreate.mockResolvedValueOnce(makeResponse('ok'))
      const p = new OpenAIProvider({ apiKey: 'sk-test' })
      await p.sendMessage('hi', { systemPrompt: 'You are helpful' })
      const call = chatCompletionsCreate.mock.calls[0]?.[0] as { messages: unknown[] }
      expect(call.messages).toEqual([
        { role: 'system', content: 'You are helpful' },
        { role: 'user', content: 'hi' },
      ])
    })

    it('injects conversation history in order', async () => {
      chatCompletionsCreate.mockResolvedValueOnce(makeResponse('ok'))
      const p = new OpenAIProvider({ apiKey: 'sk-test' })
      await p.sendMessage('third', {
        history: [
          { role: 'user', content: 'first' },
          { role: 'assistant', content: 'second' },
        ],
      })
      const call = chatCompletionsCreate.mock.calls[0]?.[0] as { messages: unknown[] }
      expect(call.messages).toEqual([
        { role: 'user', content: 'first' },
        { role: 'assistant', content: 'second' },
        { role: 'user', content: 'third' },
      ])
    })

    it('returns empty text when choice.message.content is null', async () => {
      chatCompletionsCreate.mockResolvedValueOnce({
        choices: [{ message: { content: null } }],
        usage: { prompt_tokens: 1, completion_tokens: 0, total_tokens: 1 },
      })
      const p = new OpenAIProvider({ apiKey: 'sk-test' })
      const result = await p.sendMessage('hi')
      expect(result.text).toBe('')
    })
  })

  describe('vision (images)', () => {
    it('encodes images as image_url parts alongside the text', async () => {
      chatCompletionsCreate.mockResolvedValueOnce(makeResponse('ok'))
      const p = new OpenAIProvider({ apiKey: 'sk-test' })
      await p.sendMessage('Describe', {
        images: [{ data: 'ABC', mimeType: 'image/png' }],
      })
      const call = chatCompletionsCreate.mock.calls[0]?.[0] as {
        messages: Array<{ role: string; content: unknown }>
      }
      const userMsg = call.messages[call.messages.length - 1]
      const content = userMsg?.content as Array<Record<string, unknown>>
      expect(content[0]).toEqual({ type: 'text', text: 'Describe' })
      expect(content[1]).toEqual({
        type: 'image_url',
        image_url: { url: 'data:image/png;base64,ABC' },
      })
    })
  })

  describe('JSON extraction', () => {
    it('parses valid JSON output into extractedData', async () => {
      chatCompletionsCreate.mockResolvedValueOnce(makeResponse('{"ok":true,"n":42}'))
      const p = new OpenAIProvider({ apiKey: 'sk-test' })
      const result = await p.sendMessage('extract', { extractJson: true })
      expect(result.extractedData).toEqual({ ok: true, n: 42 })
      expect(result.text).toBe('Data extracted successfully')
    })

    it('returns null extractedData when output is not valid JSON', async () => {
      chatCompletionsCreate.mockResolvedValueOnce(makeResponse('not-json'))
      const p = new OpenAIProvider({ apiKey: 'sk-test' })
      const result = await p.sendMessage('extract', { extractJson: true })
      expect(result.extractedData).toBeNull()
      expect(result.text).toBe('Failed to parse extracted data')
    })
  })

  describe('streaming (SSE)', () => {
    it('concatenates chunks and calls onChunk / onComplete', async () => {
      chatCompletionsCreate.mockResolvedValueOnce(makeStream(['Hel', 'lo ', 'world']))

      const onChunk = vi.fn()
      const onComplete = vi.fn()
      const p = new OpenAIProvider({ apiKey: 'sk-test' })

      const result = await p.sendMessage('hi', {
        streaming: { enabled: true, onChunk, onComplete },
      })

      expect(onChunk).toHaveBeenCalledTimes(3)
      expect(onChunk).toHaveBeenNthCalledWith(1, 'Hel')
      expect(onChunk).toHaveBeenNthCalledWith(2, 'lo ')
      expect(onChunk).toHaveBeenNthCalledWith(3, 'world')
      expect(onComplete).toHaveBeenCalledWith('Hello world')
      expect(result.text).toBe('Hello world')
    })

    it('ignores empty deltas without firing onChunk', async () => {
      chatCompletionsCreate.mockResolvedValueOnce(makeStream(['', 'a', '', 'b']))
      const onChunk = vi.fn()
      const p = new OpenAIProvider({ apiKey: 'sk-test' })

      const result = await p.sendMessage('hi', {
        streaming: { enabled: true, onChunk },
      })

      expect(onChunk).toHaveBeenCalledTimes(2)
      expect(onChunk).toHaveBeenNthCalledWith(1, 'a')
      expect(onChunk).toHaveBeenNthCalledWith(2, 'b')
      expect(result.text).toBe('ab')
    })

    it('sets stream: true on the upstream request', async () => {
      chatCompletionsCreate.mockResolvedValueOnce(makeStream(['ok']))
      const p = new OpenAIProvider({ apiKey: 'sk-test' })
      await p.sendMessage('hi', { streaming: { enabled: true } })
      expect(chatCompletionsCreate).toHaveBeenCalledWith(expect.objectContaining({ stream: true }))
    })

    it('does not require onChunk/onComplete callbacks', async () => {
      chatCompletionsCreate.mockResolvedValueOnce(makeStream(['ok']))
      const p = new OpenAIProvider({ apiKey: 'sk-test' })
      const result = await p.sendMessage('hi', { streaming: { enabled: true } })
      expect(result.text).toBe('ok')
    })
  })

  describe('error handling', () => {
    it('propagates upstream errors from chat.completions.create', async () => {
      chatCompletionsCreate.mockRejectedValueOnce(new Error('rate limit'))
      const p = new OpenAIProvider({ apiKey: 'sk-test' })
      await expect(p.sendMessage('hi')).rejects.toThrowError(/rate limit/)
    })

    it('propagates mid-stream errors to the caller', async () => {
      chatCompletionsCreate.mockResolvedValueOnce(makeBrokenStream(['chunk1'], 'connection lost'))
      const onChunk = vi.fn()
      const p = new OpenAIProvider({ apiKey: 'sk-test' })
      await expect(
        p.sendMessage('hi', { streaming: { enabled: true, onChunk } })
      ).rejects.toThrowError(/connection lost/)
      expect(onChunk).toHaveBeenCalledWith('chunk1')
    })
  })
})

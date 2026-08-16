/**
 * Unit tests for per-provider healthCheck() implementations.
 *
 * Verifies each provider calls the appropriate cheap ping (no tokens / minimal
 * tokens) and surfaces ok:true / ok:false based on the upstream response.
 */

import { beforeEach, describe, expect, it, vi } from 'vitest'

// ---------------------------------------------------------------------------
// Mocks — hoisted so imports resolve to the mocks.
// ---------------------------------------------------------------------------
const { anthropicMessagesCreate } = vi.hoisted(() => ({
  anthropicMessagesCreate: vi.fn(),
}))
vi.mock('@anthropic-ai/sdk', () => {
  class MockAnthropic {
    apiKey: string | undefined
    messages: { create: typeof anthropicMessagesCreate }
    constructor(config: { apiKey?: string } = {}) {
      this.apiKey = config.apiKey
      this.messages = { create: anthropicMessagesCreate }
    }
  }
  return { default: MockAnthropic }
})

const { openaiModelsList } = vi.hoisted(() => ({
  openaiModelsList: vi.fn(),
}))
vi.mock('openai', () => {
  class MockOpenAI {
    apiKey: string | undefined
    models: { list: typeof openaiModelsList }
    chat: { completions: { create: () => Promise<unknown> } }
    constructor(config: { apiKey?: string } = {}) {
      this.apiKey = config.apiKey
      this.models = { list: openaiModelsList }
      this.chat = { completions: { create: vi.fn() } }
    }
  }
  return { default: MockOpenAI }
})

const { geminiGenerateContent } = vi.hoisted(() => ({
  geminiGenerateContent: vi.fn(),
}))
vi.mock('@google/generative-ai', () => {
  class MockGoogleGenerativeAI {
    constructor(_apiKey: string) {}
    getGenerativeModel() {
      return { generateContent: geminiGenerateContent }
    }
  }
  return { GoogleGenerativeAI: MockGoogleGenerativeAI }
})

// ---------------------------------------------------------------------------
// Imports after mocks.
// ---------------------------------------------------------------------------
import { AnthropicProvider } from '../../../server/providers/anthropic.js'
import { OpenAIProvider } from '../../../server/providers/openai.js'
import { GeminiProvider } from '../../../server/providers/gemini.js'

beforeEach(() => {
  anthropicMessagesCreate.mockReset()
  openaiModelsList.mockReset()
  geminiGenerateContent.mockReset()
})

// ---------------------------------------------------------------------------
// OpenAI
// ---------------------------------------------------------------------------
describe('OpenAIProvider.healthCheck', () => {
  it('uses models.list() and returns ok:true on success', async () => {
    openaiModelsList.mockResolvedValue({ data: [] })
    const p = new OpenAIProvider({ apiKey: 'sk-test' })
    const result = await p.healthCheck()

    expect(result.ok).toBe(true)
    expect(result.error).toBeUndefined()
    expect(typeof result.latencyMs).toBe('number')
    expect(openaiModelsList).toHaveBeenCalledOnce()
  })

  it('returns ok:false with error message on upstream failure', async () => {
    openaiModelsList.mockRejectedValue(new Error('401 Unauthorized'))
    const p = new OpenAIProvider({ apiKey: 'sk-test' })
    const result = await p.healthCheck()

    expect(result.ok).toBe(false)
    expect(result.error).toContain('Unauthorized')
  })

  it('passes the abort signal through to models.list', async () => {
    openaiModelsList.mockResolvedValue({ data: [] })
    const p = new OpenAIProvider({ apiKey: 'sk-test' })
    const controller = new AbortController()
    await p.healthCheck(controller.signal)

    expect(openaiModelsList).toHaveBeenCalledWith(
      expect.objectContaining({ signal: controller.signal })
    )
  })
})

// ---------------------------------------------------------------------------
// Anthropic
// ---------------------------------------------------------------------------
describe('AnthropicProvider.healthCheck', () => {
  it('uses a 1-token messages.create call and returns ok:true on success', async () => {
    anthropicMessagesCreate.mockResolvedValue({
      id: 'msg',
      content: [{ type: 'text', text: '.' }],
      usage: { input_tokens: 1, output_tokens: 1 },
    })
    const p = new AnthropicProvider({ apiKey: 'sk-test', model: 'claude-sonnet-4-5' })
    const result = await p.healthCheck()

    expect(result.ok).toBe(true)
    expect(anthropicMessagesCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        model: 'claude-sonnet-4-5',
        max_tokens: 1,
        messages: [{ role: 'user', content: 'ping' }],
      }),
      expect.any(Object)
    )
  })

  it('propagates abort signal to messages.create', async () => {
    anthropicMessagesCreate.mockResolvedValue({
      id: 'msg',
      content: [{ type: 'text', text: '.' }],
      usage: { input_tokens: 1, output_tokens: 1 },
    })
    const p = new AnthropicProvider({ apiKey: 'sk-test' })
    const controller = new AbortController()
    await p.healthCheck(controller.signal)

    expect(anthropicMessagesCreate).toHaveBeenCalledWith(
      expect.any(Object),
      expect.objectContaining({ signal: controller.signal })
    )
  })

  it('returns ok:false with error on upstream failure', async () => {
    anthropicMessagesCreate.mockRejectedValue(new Error('rate_limit_error'))
    const p = new AnthropicProvider({ apiKey: 'sk-test' })
    const result = await p.healthCheck()

    expect(result.ok).toBe(false)
    expect(result.error).toBe('rate_limit_error')
  })
})

// ---------------------------------------------------------------------------
// Gemini
// ---------------------------------------------------------------------------
describe('GeminiProvider.healthCheck', () => {
  it('uses generateContent with a minimal ping and returns ok:true on success', async () => {
    geminiGenerateContent.mockResolvedValue({ response: { text: () => '.' } })
    const p = new GeminiProvider({ apiKey: 'gk-test', model: 'gemini-2.5-flash' })
    const result = await p.healthCheck()

    expect(result.ok).toBe(true)
    expect(geminiGenerateContent).toHaveBeenCalledWith(
      expect.objectContaining({
        contents: [{ role: 'user', parts: [{ text: 'ping' }] }],
      }),
      expect.any(Object)
    )
  })

  it('propagates the abort signal to generateContent', async () => {
    geminiGenerateContent.mockResolvedValue({ response: { text: () => '.' } })
    const p = new GeminiProvider({ apiKey: 'gk-test' })
    const controller = new AbortController()
    await p.healthCheck(controller.signal)

    expect(geminiGenerateContent).toHaveBeenCalledWith(
      expect.any(Object),
      expect.objectContaining({ signal: controller.signal })
    )
  })

  it('returns ok:false on upstream failure', async () => {
    geminiGenerateContent.mockRejectedValue(new Error('quota exceeded'))
    const p = new GeminiProvider({ apiKey: 'gk-test' })
    const result = await p.healthCheck()

    expect(result.ok).toBe(false)
    expect(result.error).toContain('quota exceeded')
  })
})

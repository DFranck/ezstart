/**
 * Unit tests for runtime model override on AI providers.
 *
 * Two layers of override exist:
 *   1. Per-request — `options.model` in `sendMessage(...)`. Does NOT mutate
 *      `provider.model`. Concurrency-safe (in-flight requests keep their
 *      original model; new calls without override fall back to default).
 *   2. Default — `provider.setModel(newModel)` and the registry-level
 *      `registry.updateModel(id, newModel)`. Both update the provider's
 *      stored default; subsequent calls without `options.model` use it.
 *
 * Mocks `@anthropic-ai/sdk`, `openai`, and `@google/generative-ai` so no real
 * network calls happen.
 */

import { beforeEach, describe, expect, it, vi } from 'vitest'

// ---------------------------------------------------------------------------
// Mock @anthropic-ai/sdk
// ---------------------------------------------------------------------------
const { anthropicMessagesCreate } = vi.hoisted(() => ({
  anthropicMessagesCreate: vi.fn(),
}))
vi.mock('@anthropic-ai/sdk', () => {
  class MockAnthropic {
    apiKey: string | undefined
    messages: { create: typeof anthropicMessagesCreate; stream: typeof anthropicMessagesCreate }
    constructor(config: { apiKey?: string } = {}) {
      this.apiKey = config.apiKey
      this.messages = { create: anthropicMessagesCreate, stream: anthropicMessagesCreate }
    }
  }
  return { default: MockAnthropic }
})

// ---------------------------------------------------------------------------
// Mock openai
// ---------------------------------------------------------------------------
const { openaiCreate } = vi.hoisted(() => ({
  openaiCreate: vi.fn(),
}))
vi.mock('openai', () => {
  class MockOpenAI {
    apiKey: string | undefined
    chat: { completions: { create: typeof openaiCreate } }
    constructor(config: { apiKey?: string } = {}) {
      this.apiKey = config.apiKey
      this.chat = { completions: { create: openaiCreate } }
    }
  }
  return { default: MockOpenAI }
})

// ---------------------------------------------------------------------------
// Mock @google/generative-ai
// ---------------------------------------------------------------------------
const { geminiGenerateContent, geminiGetModel } = vi.hoisted(() => ({
  geminiGenerateContent: vi.fn(),
  geminiGetModel: vi.fn(),
}))
vi.mock('@google/generative-ai', () => {
  class MockGoogleGenerativeAI {
    constructor(_apiKey: string) {
      // Empty constructor — apiKey is captured by the SDK in real life.
    }
    getGenerativeModel(config: { model: string }) {
      geminiGetModel(config)
      return {
        generateContent: geminiGenerateContent,
        startChat: () => ({ sendMessage: geminiGenerateContent }),
      }
    }
  }
  return { GoogleGenerativeAI: MockGoogleGenerativeAI }
})

// ---------------------------------------------------------------------------
// Imports after mocks so ESM uses the mocked modules.
// ---------------------------------------------------------------------------
import { AnthropicProvider } from '../../../server/providers/anthropic.js'
import { OpenAIProvider } from '../../../server/providers/openai.js'
import { GeminiProvider } from '../../../server/providers/gemini.js'
import { ProviderRegistry } from '../../../server/registry/ProviderRegistry.js'
import { assertValidModelName } from '../../../server/providers/base.js'

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
function anthropicResponse(text: string) {
  return {
    id: 'msg_test',
    type: 'message',
    role: 'assistant',
    content: [{ type: 'text', text }],
    usage: { input_tokens: 1, output_tokens: 1 },
  }
}

function openaiResponse(text: string) {
  return {
    choices: [{ message: { content: text } }],
    usage: { prompt_tokens: 1, completion_tokens: 1, total_tokens: 2 },
  }
}

function geminiResponse(text: string) {
  return { response: { text: () => text } }
}

beforeEach(() => {
  anthropicMessagesCreate.mockReset()
  openaiCreate.mockReset()
  geminiGenerateContent.mockReset()
  geminiGetModel.mockReset()
  delete process.env.ANTHROPIC_API_KEY
  delete process.env.OPENAI_API_KEY
  delete process.env.GEMINI_API_KEY
})

// ---------------------------------------------------------------------------
// assertValidModelName
// ---------------------------------------------------------------------------
describe('assertValidModelName', () => {
  it('accepts a non-empty string', () => {
    expect(() => assertValidModelName('claude-sonnet-4-5')).not.toThrow()
  })

  it('rejects empty string', () => {
    expect(() => assertValidModelName('')).toThrowError(/non-empty string/)
  })

  it('rejects whitespace-only string', () => {
    expect(() => assertValidModelName('   ')).toThrowError(/non-empty string/)
  })

  it('rejects null/undefined/numbers', () => {
    expect(() => assertValidModelName(null)).toThrowError(/non-empty string/)
    expect(() => assertValidModelName(undefined)).toThrowError(/non-empty string/)
    expect(() => assertValidModelName(42)).toThrowError(/non-empty string/)
  })
})

// ---------------------------------------------------------------------------
// AnthropicProvider — setModel + per-request override
// ---------------------------------------------------------------------------
describe('AnthropicProvider — model override', () => {
  it('getModel returns the model set via constructor', () => {
    const p = new AnthropicProvider({ apiKey: 'sk-test', model: 'claude-opus-4-1-20250805' })
    expect(p.getModel()).toBe('claude-opus-4-1-20250805')
  })

  it('setModel updates the default model used by next sendMessage', async () => {
    anthropicMessagesCreate.mockResolvedValue(anthropicResponse('ok'))
    const p = new AnthropicProvider({ apiKey: 'sk-test', model: 'claude-sonnet-4-5' })
    p.setModel('claude-opus-4-1-20250805')
    expect(p.getModel()).toBe('claude-opus-4-1-20250805')
    await p.sendMessage('hi')
    expect(anthropicMessagesCreate).toHaveBeenCalledWith(
      expect.objectContaining({ model: 'claude-opus-4-1-20250805' })
    )
  })

  it('setModel rejects an invalid model name', () => {
    const p = new AnthropicProvider({ apiKey: 'sk-test' })
    expect(() => p.setModel('')).toThrowError(/non-empty string/)
    expect(() => p.setModel('   ')).toThrowError(/non-empty string/)
    // Default model unchanged after a failed setModel call.
    expect(p.getModel()).toBe('claude-sonnet-4-5')
  })

  it('per-request options.model overrides default WITHOUT mutating it', async () => {
    anthropicMessagesCreate.mockResolvedValue(anthropicResponse('ok'))
    const p = new AnthropicProvider({ apiKey: 'sk-test', model: 'claude-sonnet-4-5' })
    await p.sendMessage('hi', { model: 'claude-opus-4-1-20250805' })
    expect(anthropicMessagesCreate).toHaveBeenLastCalledWith(
      expect.objectContaining({ model: 'claude-opus-4-1-20250805' })
    )
    // Default unchanged.
    expect(p.getModel()).toBe('claude-sonnet-4-5')
    // Next call without override falls back to default.
    await p.sendMessage('hi')
    expect(anthropicMessagesCreate).toHaveBeenLastCalledWith(
      expect.objectContaining({ model: 'claude-sonnet-4-5' })
    )
  })

  it('per-request options.model with invalid value throws', async () => {
    const p = new AnthropicProvider({ apiKey: 'sk-test' })
    await expect(p.sendMessage('hi', { model: '' })).rejects.toThrowError(/non-empty string/)
  })

  it('concurrent in-flight requests keep their original model after setModel()', async () => {
    // Capture the model value at the moment messages.create is called.
    const seenModels: string[] = []
    anthropicMessagesCreate.mockImplementation(async (args: { model: string }) => {
      seenModels.push(args.model)
      // Hold the response a tick to simulate a real network roundtrip.
      await new Promise(resolve => setTimeout(resolve, 5))
      return anthropicResponse('ok')
    })

    const p = new AnthropicProvider({ apiKey: 'sk-test', model: 'claude-sonnet-4-5' })

    // Start a request, then mutate model BEFORE it resolves.
    const inFlight = p.sendMessage('hi')
    p.setModel('claude-opus-4-1-20250805')
    await inFlight

    // The in-flight call captured the OLD model (set when create() was called).
    expect(seenModels[0]).toBe('claude-sonnet-4-5')

    // A NEW call uses the NEW default.
    await p.sendMessage('hi')
    expect(seenModels[1]).toBe('claude-opus-4-1-20250805')
  })
})

// ---------------------------------------------------------------------------
// OpenAIProvider — setModel + per-request override
// ---------------------------------------------------------------------------
describe('OpenAIProvider — model override', () => {
  it('getModel returns constructor model (default fallback applies)', () => {
    const p = new OpenAIProvider({ apiKey: 'sk-test' })
    expect(p.getModel()).toBe('gpt-4o')
  })

  it('setModel updates the default used by next sendMessage', async () => {
    openaiCreate.mockResolvedValue(openaiResponse('ok'))
    const p = new OpenAIProvider({ apiKey: 'sk-test' })
    p.setModel('gpt-4o-mini')
    await p.sendMessage('hi')
    expect(openaiCreate).toHaveBeenCalledWith(expect.objectContaining({ model: 'gpt-4o-mini' }))
  })

  it('setModel throws on empty model name', () => {
    const p = new OpenAIProvider({ apiKey: 'sk-test' })
    expect(() => p.setModel('')).toThrowError(/non-empty string/)
  })

  it('per-request options.model overrides without mutating default', async () => {
    openaiCreate.mockResolvedValue(openaiResponse('ok'))
    const p = new OpenAIProvider({ apiKey: 'sk-test', model: 'gpt-4o' })
    await p.sendMessage('hi', { model: 'gpt-4o-mini' })
    expect(openaiCreate).toHaveBeenLastCalledWith(expect.objectContaining({ model: 'gpt-4o-mini' }))
    expect(p.getModel()).toBe('gpt-4o')
  })
})

// ---------------------------------------------------------------------------
// GeminiProvider — setModel + per-request override
// ---------------------------------------------------------------------------
describe('GeminiProvider — model override', () => {
  it('getModel returns the model set via constructor', () => {
    const p = new GeminiProvider({ apiKey: 'gk-test', model: 'gemini-2.5-pro' })
    expect(p.getModel()).toBe('gemini-2.5-pro')
  })

  it('setModel updates the default used by next sendMessage', async () => {
    geminiGenerateContent.mockResolvedValue(geminiResponse('ok'))
    const p = new GeminiProvider({ apiKey: 'gk-test', model: 'gemini-2.5-flash' })
    p.setModel('gemini-2.5-pro')
    await p.sendMessage('hi')
    expect(geminiGetModel).toHaveBeenCalledWith(
      expect.objectContaining({ model: 'gemini-2.5-pro' })
    )
  })

  it('per-request options.model overrides without mutating default', async () => {
    geminiGenerateContent.mockResolvedValue(geminiResponse('ok'))
    const p = new GeminiProvider({ apiKey: 'gk-test', model: 'gemini-2.5-flash' })
    await p.sendMessage('hi', { model: 'gemini-2.5-pro' })
    expect(geminiGetModel).toHaveBeenLastCalledWith(
      expect.objectContaining({ model: 'gemini-2.5-pro' })
    )
    expect(p.getModel()).toBe('gemini-2.5-flash')
  })

  it('setModel rejects empty string', () => {
    const p = new GeminiProvider({ apiKey: 'gk-test' })
    expect(() => p.setModel('')).toThrowError(/non-empty string/)
  })
})

// ---------------------------------------------------------------------------
// ProviderRegistry — updateModel
// ---------------------------------------------------------------------------
describe('ProviderRegistry — updateModel', () => {
  function makeRegistry() {
    const reg = new ProviderRegistry()
    reg.register({
      id: 'anthropic-default',
      name: 'Claude Sonnet',
      type: 'anthropic',
      enabled: true,
      apiKey: 'sk-test',
      model: 'claude-sonnet-4-5',
      capabilities: {
        text: true,
        vision: true,
        audio: false,
        streaming: true,
        functionCalling: false,
        jsonMode: true,
      },
    })
    reg.register({
      id: 'openai-default',
      name: 'OpenAI GPT-4o',
      type: 'openai',
      enabled: true,
      apiKey: 'sk-test',
      model: 'gpt-4o',
      capabilities: {
        text: true,
        vision: true,
        audio: false,
        streaming: true,
        functionCalling: true,
        jsonMode: true,
      },
    })
    return reg
  }

  it('updates the live instance + stored config', async () => {
    anthropicMessagesCreate.mockResolvedValue(anthropicResponse('ok'))
    const reg = makeRegistry()

    reg.updateModel('anthropic-default', 'claude-opus-4-1-20250805')

    // Live instance now uses the new model.
    const instance = reg.getInstance('anthropic-default')
    expect(instance.getModel()).toBe('claude-opus-4-1-20250805')

    // list() / getConfig() reflect the change.
    expect(reg.getConfig('anthropic-default')?.model).toBe('claude-opus-4-1-20250805')
    const listed = reg.list().find(p => p.id === 'anthropic-default')
    expect(listed?.model).toBe('claude-opus-4-1-20250805')

    // Sanity: a subsequent sendMessage actually uses it on the wire.
    await instance.sendMessage('hi')
    expect(anthropicMessagesCreate).toHaveBeenCalledWith(
      expect.objectContaining({ model: 'claude-opus-4-1-20250805' })
    )
  })

  it('only the targeted provider is affected', () => {
    const reg = makeRegistry()
    reg.updateModel('anthropic-default', 'claude-opus-4-1-20250805')
    expect(reg.getConfig('openai-default')?.model).toBe('gpt-4o')
    expect(reg.getInstance('openai-default').getModel()).toBe('gpt-4o')
  })

  it('throws on unknown provider id', () => {
    const reg = makeRegistry()
    expect(() => reg.updateModel('does-not-exist', 'claude-opus-4-1-20250805')).toThrowError(
      /Provider "does-not-exist" not found/
    )
  })

  it('throws on invalid model name', () => {
    const reg = makeRegistry()
    expect(() => reg.updateModel('anthropic-default', '')).toThrowError(/non-empty string/)
    // Stored config is unchanged after a failed update.
    expect(reg.getConfig('anthropic-default')?.model).toBe('claude-sonnet-4-5')
    expect(reg.getInstance('anthropic-default').getModel()).toBe('claude-sonnet-4-5')
  })
})

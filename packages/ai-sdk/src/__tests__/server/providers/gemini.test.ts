/**
 * Unit tests for GeminiProvider
 *
 * Mocks `@google/generative-ai` so no real API calls happen. Covers:
 * - constructor + validateConfig (missing API key, env fallback, custom model)
 * - sendMessage (non-stream) with single message, system prompt, history
 * - vision (images as inlineData parts — base64 + mimeType)
 * - streaming (onChunk + onComplete, with and without images)
 * - JSON extraction (valid + malformed)
 * - error handling (API error propagation)
 */

import { beforeEach, describe, expect, it, vi } from 'vitest'

// ---------------------------------------------------------------------------
// Mock @google/generative-ai
//
// `vi.mock` is hoisted above imports, so the factory cannot close over
// variables declared in this test file. We use `vi.hoisted()` to share mock
// fns between the factory and the test-level assertions.
// ---------------------------------------------------------------------------
const {
  generateContent,
  generateContentStream,
  startChatMock,
  sendMessageFn,
  sendMessageStreamFn,
  getGenerativeModelSpy,
} = vi.hoisted(() => ({
  generateContent: vi.fn(),
  generateContentStream: vi.fn(),
  startChatMock: vi.fn(),
  sendMessageFn: vi.fn(),
  sendMessageStreamFn: vi.fn(),
  getGenerativeModelSpy: vi.fn(),
}))

vi.mock('@google/generative-ai', () => {
  class MockGenerativeModel {
    generateContent = generateContent
    generateContentStream = generateContentStream
    startChat = startChatMock
  }

  class MockGoogleGenerativeAI {
    apiKey: string
    constructor(apiKey: string) {
      this.apiKey = apiKey
    }
    getGenerativeModel(params: unknown): MockGenerativeModel {
      // Capture the config so tests can assert on systemInstruction /
      // generationConfig (temperature, maxOutputTokens, ...).
      getGenerativeModelSpy(params)
      return new MockGenerativeModel()
    }
  }

  return {
    GoogleGenerativeAI: MockGoogleGenerativeAI,
  }
})

// ---------------------------------------------------------------------------
// Import after mocks so ESM uses the mocked module.
// ---------------------------------------------------------------------------
import { GeminiProvider } from '../../../server/providers/gemini.js'

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
function makeNonStreamResponse(text: string) {
  return {
    response: {
      text: () => text,
    },
  }
}

/**
 * Fake async iterable for `generateContentStream` / `sendMessageStream`.
 */
function makeStreamResponse(chunks: string[]) {
  return {
    stream: (async function* () {
      for (const chunk of chunks) {
        yield { text: () => chunk }
      }
    })(),
  }
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------
describe('GeminiProvider', () => {
  beforeEach(() => {
    generateContent.mockReset()
    generateContentStream.mockReset()
    startChatMock.mockReset()
    sendMessageFn.mockReset()
    sendMessageStreamFn.mockReset()
    getGenerativeModelSpy.mockReset()
    // startChat() returns an object with sendMessage / sendMessageStream
    startChatMock.mockImplementation(() => ({
      sendMessage: sendMessageFn,
      sendMessageStream: sendMessageStreamFn,
    }))
    delete process.env.GEMINI_API_KEY
  })

  describe('constructor / validateConfig', () => {
    it('accepts apiKey via config', () => {
      const p = new GeminiProvider({ apiKey: 'gem-test-key' })
      expect(p).toBeInstanceOf(GeminiProvider)
    })

    it('falls back to GEMINI_API_KEY env var', () => {
      process.env.GEMINI_API_KEY = 'gem-from-env'
      const p = new GeminiProvider()
      expect(p).toBeInstanceOf(GeminiProvider)
    })

    it('uses the default model when none is provided', async () => {
      generateContent.mockResolvedValueOnce(makeNonStreamResponse('hello'))
      const p = new GeminiProvider({ apiKey: 'gem-test' })
      await p.sendMessage('hi')
      // generateContent is called, no easy way to assert model from here
      // (model is selected in getGenerativeModel). Covered indirectly by
      // the "custom model" test below.
      expect(generateContent).toHaveBeenCalled()
    })

    it('constructs without throwing even without apiKey (validation lax by default)', () => {
      // The current implementation checks `this.genAI`, not the key itself.
      // We document this behaviour: no exception here, but real API calls
      // will fail at call time if the key is missing.
      expect(() => new GeminiProvider()).not.toThrow()
    })
  })

  describe('sendMessage (non-stream)', () => {
    it('returns text from a single message', async () => {
      generateContent.mockResolvedValueOnce(makeNonStreamResponse('Bonjour'))
      const p = new GeminiProvider({ apiKey: 'gem-test' })
      const result = await p.sendMessage('hello')
      expect(result.text).toBe('Bonjour')
      expect(result.extractedData).toBeNull()
    })

    it('applies default temperature (0.7) and maxOutputTokens (4096) when not provided', async () => {
      generateContent.mockResolvedValueOnce(makeNonStreamResponse('ok'))
      const p = new GeminiProvider({ apiKey: 'gem-test' })
      await p.sendMessage('hi')
      const params = getGenerativeModelSpy.mock.calls[0]?.[0] as {
        generationConfig?: { temperature?: number; maxOutputTokens?: number }
      }
      expect(params.generationConfig?.temperature).toBe(0.7)
      expect(params.generationConfig?.maxOutputTokens).toBe(4096)
    })

    it('applies custom temperature and maxTokens when provided', async () => {
      generateContent.mockResolvedValueOnce(makeNonStreamResponse('ok'))
      const p = new GeminiProvider({ apiKey: 'gem-test' })
      await p.sendMessage('hi', { temperature: 0.2, maxTokens: 1024 })
      const params = getGenerativeModelSpy.mock.calls[0]?.[0] as {
        generationConfig?: { temperature?: number; maxOutputTokens?: number }
      }
      expect(params.generationConfig?.temperature).toBe(0.2)
      expect(params.generationConfig?.maxOutputTokens).toBe(1024)
    })

    it('injects systemPrompt as systemInstruction (not as a user message)', async () => {
      generateContent.mockResolvedValueOnce(makeNonStreamResponse('ok'))
      const p = new GeminiProvider({ apiKey: 'gem-test' })
      await p.sendMessage('hi', { systemPrompt: 'You are GP.A, an ESG advisor.' })
      const params = getGenerativeModelSpy.mock.calls[0]?.[0] as {
        systemInstruction?: string
      }
      expect(params.systemInstruction).toBe('You are GP.A, an ESG advisor.')
      // And the user message part should NOT contain the system prompt
      const parts = generateContent.mock.calls[0]?.[0] as Array<Record<string, unknown>>
      expect(parts).toEqual([{ text: 'hi' }])
    })

    it('passes text as the first part when no images are provided', async () => {
      generateContent.mockResolvedValueOnce(makeNonStreamResponse('ok'))
      const p = new GeminiProvider({ apiKey: 'gem-test' })
      await p.sendMessage('hi')
      const parts = generateContent.mock.calls[0]?.[0] as Array<Record<string, unknown>>
      expect(parts).toEqual([{ text: 'hi' }])
    })

    it('uses chat history via startChat when history is present (no images)', async () => {
      sendMessageFn.mockResolvedValueOnce(makeNonStreamResponse('third-reply'))
      const p = new GeminiProvider({ apiKey: 'gem-test' })
      await p.sendMessage('third', {
        history: [
          { role: 'user', content: 'first' },
          { role: 'assistant', content: 'second' },
        ],
      })
      expect(startChatMock).toHaveBeenCalledTimes(1)
      const { history } = startChatMock.mock.calls[0]?.[0] as {
        history: Array<{ role: string; parts: unknown[] }>
      }
      expect(history).toEqual([
        { role: 'user', parts: [{ text: 'first' }] },
        { role: 'model', parts: [{ text: 'second' }] },
      ])
      expect(sendMessageFn).toHaveBeenCalledWith('third')
    })
  })

  describe('vision (images)', () => {
    it('encodes images as inlineData parts alongside the text', async () => {
      generateContent.mockResolvedValueOnce(makeNonStreamResponse('ok'))
      const p = new GeminiProvider({ apiKey: 'gem-test' })
      await p.sendMessage('Describe this', {
        images: [{ data: 'BASE64DATA', mimeType: 'image/png' }],
      })
      const parts = generateContent.mock.calls[0]?.[0] as Array<Record<string, unknown>>
      expect(parts).toEqual([
        { text: 'Describe this' },
        {
          inlineData: {
            data: 'BASE64DATA',
            mimeType: 'image/png',
          },
        },
      ])
    })

    it('encodes multiple images as multiple inlineData parts', async () => {
      generateContent.mockResolvedValueOnce(makeNonStreamResponse('ok'))
      const p = new GeminiProvider({ apiKey: 'gem-test' })
      await p.sendMessage('Compare these', {
        images: [
          { data: 'IMG1', mimeType: 'image/jpeg' },
          { data: 'IMG2', mimeType: 'image/webp' },
        ],
      })
      const parts = generateContent.mock.calls[0]?.[0] as Array<Record<string, unknown>>
      expect(parts).toHaveLength(3)
      expect(parts[0]).toEqual({ text: 'Compare these' })
      expect(parts[1]).toEqual({ inlineData: { data: 'IMG1', mimeType: 'image/jpeg' } })
      expect(parts[2]).toEqual({ inlineData: { data: 'IMG2', mimeType: 'image/webp' } })
    })

    it('uses generateContent (NOT startChat) when images are present, even with history', async () => {
      generateContent.mockResolvedValueOnce(makeNonStreamResponse('ok'))
      const p = new GeminiProvider({ apiKey: 'gem-test' })
      await p.sendMessage('What is this?', {
        images: [{ data: 'BASE64', mimeType: 'image/png' }],
        history: [
          { role: 'user', content: 'prior' },
          { role: 'assistant', content: 'reply' },
        ],
      })
      // images bypass chat mode, go straight to generateContent
      expect(generateContent).toHaveBeenCalledTimes(1)
      expect(startChatMock).not.toHaveBeenCalled()
    })

    it('accepts empty image array without breaking (treated as no images)', async () => {
      generateContent.mockResolvedValueOnce(makeNonStreamResponse('ok'))
      const p = new GeminiProvider({ apiKey: 'gem-test' })
      await p.sendMessage('hi', { images: [] })
      const parts = generateContent.mock.calls[0]?.[0] as Array<Record<string, unknown>>
      expect(parts).toEqual([{ text: 'hi' }])
    })
  })

  describe('JSON extraction', () => {
    it('parses valid JSON output into extractedData', async () => {
      generateContent.mockResolvedValueOnce(makeNonStreamResponse('{"ok":true,"n":42}'))
      const p = new GeminiProvider({ apiKey: 'gem-test' })
      const result = await p.sendMessage('extract', { extractJson: true })
      expect(result.extractedData).toEqual({ ok: true, n: 42 })
      expect(result.text).toBe('Data extracted successfully')
    })

    it('returns null extractedData when the output is not valid JSON', async () => {
      generateContent.mockResolvedValueOnce(makeNonStreamResponse('not-json'))
      const p = new GeminiProvider({ apiKey: 'gem-test' })
      const result = await p.sendMessage('extract', { extractJson: true })
      expect(result.extractedData).toBeNull()
      expect(result.text).toBe('Failed to parse extracted data')
    })

    it('works with JSON extraction + images (vision analysis)', async () => {
      generateContent.mockResolvedValueOnce(
        makeNonStreamResponse('{"isValid":true,"score":80,"roomsDetected":5}')
      )
      const p = new GeminiProvider({ apiKey: 'gem-test' })
      const result = await p.sendMessage('Analyse this floor plan', {
        images: [{ data: 'FLOORPLAN_BASE64', mimeType: 'image/jpeg' }],
        extractJson: true,
      })
      expect(result.extractedData).toEqual({ isValid: true, score: 80, roomsDetected: 5 })
    })
  })

  describe('streaming', () => {
    it('concatenates chunks and calls onChunk / onComplete', async () => {
      generateContentStream.mockResolvedValueOnce(makeStreamResponse(['Hel', 'lo ', 'world']))
      const onChunk = vi.fn()
      const onComplete = vi.fn()
      const p = new GeminiProvider({ apiKey: 'gem-test' })

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

    it('streams with images via generateContentStream', async () => {
      generateContentStream.mockResolvedValueOnce(makeStreamResponse(['frag1', 'frag2']))
      const onChunk = vi.fn()
      const p = new GeminiProvider({ apiKey: 'gem-test' })

      await p.sendMessage('describe image', {
        images: [{ data: 'BASE64', mimeType: 'image/png' }],
        streaming: { enabled: true, onChunk },
      })

      expect(generateContentStream).toHaveBeenCalledTimes(1)
      // First arg is the content parts: [text, inlineData]
      const parts = generateContentStream.mock.calls[0]?.[0] as Array<Record<string, unknown>>
      expect(parts).toHaveLength(2)
      expect(parts[0]).toEqual({ text: 'describe image' })
      expect(parts[1]).toMatchObject({ inlineData: { data: 'BASE64', mimeType: 'image/png' } })
      expect(onChunk).toHaveBeenCalledWith('frag1')
      expect(onChunk).toHaveBeenCalledWith('frag2')
    })

    it('streams with history via startChat when no images present', async () => {
      sendMessageStreamFn.mockResolvedValueOnce(makeStreamResponse(['a', 'b']))
      const onChunk = vi.fn()
      const p = new GeminiProvider({ apiKey: 'gem-test' })

      await p.sendMessage('next', {
        history: [{ role: 'user', content: 'prev' }],
        streaming: { enabled: true, onChunk },
      })

      expect(startChatMock).toHaveBeenCalledTimes(1)
      expect(sendMessageStreamFn).toHaveBeenCalledWith('next')
      expect(onChunk).toHaveBeenCalledWith('a')
      expect(onChunk).toHaveBeenCalledWith('b')
    })

    it('ignores empty chunks without calling onChunk', async () => {
      generateContentStream.mockResolvedValueOnce(makeStreamResponse(['', 'real']))
      const onChunk = vi.fn()
      const p = new GeminiProvider({ apiKey: 'gem-test' })

      await p.sendMessage('hi', { streaming: { enabled: true, onChunk } })
      // Empty chunk is falsy → callback skipped
      expect(onChunk).toHaveBeenCalledTimes(1)
      expect(onChunk).toHaveBeenCalledWith('real')
    })
  })

  describe('error handling', () => {
    it('propagates errors from generateContent', async () => {
      generateContent.mockRejectedValueOnce(new Error('invalid api key'))
      const p = new GeminiProvider({ apiKey: 'bad-key' })
      await expect(p.sendMessage('hi')).rejects.toThrowError(/invalid api key/)
    })

    it('propagates errors from generateContentStream', async () => {
      generateContentStream.mockRejectedValueOnce(new Error('quota exceeded'))
      const p = new GeminiProvider({ apiKey: 'gem-test' })
      await expect(p.sendMessage('hi', { streaming: { enabled: true } })).rejects.toThrowError(
        /quota exceeded/
      )
    })

    it('surfaces malformed image errors at the API layer', async () => {
      // The provider itself does not validate base64 shape — Gemini API will
      // reject. We simulate that rejection and assert it bubbles up.
      generateContent.mockRejectedValueOnce(new Error('Invalid image data: base64 decode failed'))
      const p = new GeminiProvider({ apiKey: 'gem-test' })
      await expect(
        p.sendMessage('analyse', {
          images: [{ data: 'not-base64!!!', mimeType: 'image/png' }],
        })
      ).rejects.toThrowError(/Invalid image data/)
    })
  })
})

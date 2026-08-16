/**
 * useAIChatStream
 *
 * Lightweight SSE consumer for the `/api/ai/chat/stream` endpoint.
 *
 * Unlike `useAIThread` (full thread + conversations + providers machinery),
 * this hook is a minimal primitive: one user message → streaming tokens →
 * final assistant message. Consumers own their own message list and UI.
 *
 * Server protocol (mirrors `apps/ezstart/api/src/routes/ai/chat/streamMessage.ts`):
 *
 *     data: {"type":"meta","provider":"...","conversationId":"..."}\n\n
 *     data: {"type":"chunk","content":"Hel"}\n\n
 *     data: {"type":"chunk","content":"lo"}\n\n
 *     data: {"type":"error","error":"..."}\n\n       (optional, on failure)
 *     data: [DONE]\n\n
 *
 * @example
 * ```tsx
 * const { send, streamingText, fullText, loading, error, abort } =
 *   useAIChatStream({ appName: 'myapp' })
 *
 * await send('Hello!')
 * ```
 */
'use client'

import { logger } from '@ezstart/logger'
import { getApiUrl } from '@ezstart/config'
import { useCallback, useEffect, useRef, useState } from 'react'
import type { AppName } from '@ezstart/config/urls'

export type AIChatStreamEvent =
  | { type: 'meta'; provider?: string; conversationId?: string }
  | { type: 'chunk'; content: string }
  | { type: 'error'; error: string }
  | { type: 'done' }

export interface UseAIChatStreamConfig {
  /** App scope forwarded to the server for provider resolution. */
  appName: AppName
  /** Optional existing conversation id. If omitted, server auto-creates. */
  conversationId?: string
  /** Optional explicit provider id. If omitted, server cascades through app providers. */
  providerId?: string
  /** Locale hint (e.g. 'en', 'fr'). */
  locale?: string
  /** Auth token getter. Defaults to reading `ezauth-storage` from `localStorage`. */
  getToken?: () => string | null
  /** Override endpoint (defaults to `{ezstart API}/api/ai/chat/stream`). */
  endpoint?: string
  /** Fires for every SSE event (including meta / error). */
  onEvent?: (event: AIChatStreamEvent) => void
  /** Fires once per received chunk with the delta text. */
  onChunk?: (chunk: string) => void
  /** Fires after the stream ends cleanly with the concatenated full text. */
  onComplete?: (fullText: string) => void
  /** Fires on server-side stream errors or transport failures. */
  onError?: (error: Error) => void
}

export interface UseAIChatStreamReturn {
  /** Accumulated text for the in-flight response (resets between sends). */
  streamingText: string
  /** Last completed response (set when `[DONE]` arrives). */
  fullText: string
  /** True while a send is in flight. */
  loading: boolean
  /** Last error message, `null` otherwise. */
  error: string | null
  /** Provider reported via the `meta` event, `null` until received. */
  provider: string | null
  /** Conversation id reported via the `meta` event, `null` until received. */
  conversationId: string | null
  /** Open the stream with a user message. */
  send: (message: string) => Promise<string>
  /** Abort the in-flight request. No-op if idle. */
  abort: () => void
  /** Reset streamingText, fullText, error, provider, conversationId. */
  reset: () => void
}

function defaultGetToken(): string | null {
  if (typeof window === 'undefined') return null
  try {
    const store = window.localStorage.getItem('ezauth-storage')
    const parsed = store ? (JSON.parse(store) as { state?: { accessToken?: string } }) : null
    return parsed?.state?.accessToken ?? null
  } catch {
    return null
  }
}

/** Parse a single `data: ...` SSE payload. Returns `null` for unparseable lines. */
function parseSseData(dataStr: string): AIChatStreamEvent | null {
  if (dataStr === '[DONE]') return { type: 'done' }
  try {
    const parsed: unknown = JSON.parse(dataStr)
    if (parsed && typeof parsed === 'object') {
      const obj = parsed as Record<string, unknown>
      if (obj.type === 'meta') {
        return {
          type: 'meta',
          provider: typeof obj.provider === 'string' ? obj.provider : undefined,
          conversationId: typeof obj.conversationId === 'string' ? obj.conversationId : undefined,
        }
      }
      if (obj.type === 'chunk' && typeof obj.content === 'string') {
        return { type: 'chunk', content: obj.content }
      }
      if (obj.type === 'error' && typeof obj.error === 'string') {
        return { type: 'error', error: obj.error }
      }
    }
  } catch {
    logger.warn(`[useAIChatStream] Failed to parse SSE data: ${dataStr.slice(0, 120)}`)
  }
  return null
}

/**
 * Read an SSE body stream and dispatch typed events.
 *
 * @internal exported for testing
 */
export async function readSseStream(
  body: ReadableStream<Uint8Array>,
  onEvent: (event: AIChatStreamEvent) => void
): Promise<void> {
  const reader = body.getReader()
  const decoder = new TextDecoder()
  let buffer = ''

  try {
    while (true) {
      const { done, value } = await reader.read()
      if (done) break
      buffer += decoder.decode(value, { stream: true })

      // SSE events are separated by a blank line (`\n\n`). Use a regex so we
      // also handle `\r\n\r\n` which some proxies emit.
      let sepMatch = buffer.match(/\r?\n\r?\n/)
      while (sepMatch && sepMatch.index !== undefined) {
        const rawBlock = buffer.slice(0, sepMatch.index)
        buffer = buffer.slice(sepMatch.index + sepMatch[0].length)

        for (const line of rawBlock.split(/\r?\n/)) {
          if (!line.startsWith('data:')) continue
          const dataStr = line.slice(5).replace(/^ /, '').trim()
          if (!dataStr) continue
          const parsed = parseSseData(dataStr)
          if (parsed) onEvent(parsed)
        }

        sepMatch = buffer.match(/\r?\n\r?\n/)
      }
    }
  } finally {
    try {
      reader.releaseLock()
    } catch {
      /* reader already released on abort */
    }
  }
}

export function useAIChatStream(config: UseAIChatStreamConfig): UseAIChatStreamReturn {
  const {
    appName,
    conversationId: initialConversationId,
    providerId,
    locale,
    getToken = defaultGetToken,
    endpoint,
    onEvent,
    onChunk,
    onComplete,
    onError,
  } = config

  const [streamingText, setStreamingText] = useState('')
  const [fullText, setFullText] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [provider, setProvider] = useState<string | null>(null)
  const [conversationId, setConversationId] = useState<string | null>(initialConversationId ?? null)

  const abortRef = useRef<AbortController | null>(null)

  // Abort on unmount — prevents state updates on unmounted component and
  // ensures the server-side handler sees `req.on('close')`.
  useEffect(() => {
    return () => {
      abortRef.current?.abort()
    }
  }, [])

  const abort = useCallback(() => {
    abortRef.current?.abort()
    abortRef.current = null
  }, [])

  const reset = useCallback(() => {
    setStreamingText('')
    setFullText('')
    setError(null)
    setProvider(null)
    setConversationId(initialConversationId ?? null)
  }, [initialConversationId])

  const send = useCallback(
    async (message: string): Promise<string> => {
      if (!message.trim()) return ''

      // Abort any previous in-flight request.
      abortRef.current?.abort()
      const controller = new AbortController()
      abortRef.current = controller

      setLoading(true)
      setError(null)
      setStreamingText('')
      setFullText('')

      const url = endpoint ?? `${getApiUrl('ezstart')}/api/ai/chat/stream`
      const token = getToken()
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
        Accept: 'text/event-stream',
      }
      if (token) headers.Authorization = `Bearer ${token}`

      const body: Record<string, unknown> = { message, appName }
      if (conversationId) body.conversationId = conversationId
      if (providerId) body.providerId = providerId
      if (locale) body.locale = locale

      let accumulated = ''

      try {
        const response = await fetch(url, {
          method: 'POST',
          headers,
          body: JSON.stringify(body),
          signal: controller.signal,
        })

        if (!response.ok) {
          // Non-streaming JSON error (before headers switched to SSE).
          let errorMessage = `HTTP ${response.status}: ${response.statusText}`
          try {
            const errorData = (await response.json()) as { error?: string | { message?: string } }
            if (typeof errorData.error === 'string') errorMessage = errorData.error
            else if (errorData.error?.message) errorMessage = errorData.error.message
          } catch {
            /* keep default */
          }
          throw new Error(errorMessage)
        }

        if (!response.body) {
          throw new Error('Response has no readable body')
        }

        let streamError: string | null = null

        await readSseStream(response.body, event => {
          onEvent?.(event)

          if (event.type === 'meta') {
            if (event.provider) setProvider(event.provider)
            if (event.conversationId) setConversationId(event.conversationId)
            return
          }
          if (event.type === 'chunk') {
            accumulated += event.content
            setStreamingText(accumulated)
            onChunk?.(event.content)
            return
          }
          if (event.type === 'error') {
            streamError = event.error
            return
          }
          // `done` — terminal, handled after read loop exits.
        })

        if (streamError) {
          throw new Error(streamError)
        }

        setFullText(accumulated)
        onComplete?.(accumulated)
        return accumulated
      } catch (err) {
        if (err instanceof DOMException && err.name === 'AbortError') {
          // User-initiated abort — swallow, don't fire onError.
          return accumulated
        }
        const message = err instanceof Error ? err.message : 'Failed to stream chat response'
        setError(message)
        onError?.(err instanceof Error ? err : new Error(message))
        return accumulated
      } finally {
        if (abortRef.current === controller) abortRef.current = null
        setLoading(false)
      }
    },
    [
      appName,
      conversationId,
      providerId,
      locale,
      getToken,
      endpoint,
      onEvent,
      onChunk,
      onComplete,
      onError,
    ]
  )

  return {
    streamingText,
    fullText,
    loading,
    error,
    provider,
    conversationId,
    send,
    abort,
    reset,
  }
}

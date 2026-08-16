// @vitest-environment jsdom
/**
 * TurnstileWidget — no-op + script injection tests.
 *
 * The widget MUST render nothing when `siteKey` is empty so the SDK can
 * ship without captcha and consumers enable it later by setting
 * `NEXT_PUBLIC_TURNSTILE_SITE_KEY`. When the key IS present, the widget
 * mounts the Cloudflare-hosted challenge via the global `window.turnstile`
 * API (script injected lazily) and surfaces the obtained token via
 * `onSuccess`.
 *
 * Originally lived in `@ezstart/auth-sdk` (TurnstileWidget) — moved to
 * `@ezstart/api-sdk` 2026-05-01 because Cloudflare Turnstile is a generic
 * captcha integration, not auth-specific.
 */
import * as matchers from '@testing-library/jest-dom/matchers'
import React from 'react'
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render } from '@testing-library/react'

import { TurnstileWidget } from '../../integrations/turnstile-widget.js'

expect.extend(matchers)

interface TurnstileMock {
  render: ReturnType<typeof vi.fn>
  remove: ReturnType<typeof vi.fn>
  reset: ReturnType<typeof vi.fn>
}

function setupTurnstile(): TurnstileMock {
  const mock: TurnstileMock = {
    render: vi.fn(() => 'widget-id-123'),
    remove: vi.fn(),
    reset: vi.fn(),
  }
  ;(window as unknown as { turnstile: TurnstileMock }).turnstile = mock
  return mock
}

function clearTurnstile() {
  delete (window as unknown as { turnstile?: TurnstileMock }).turnstile
  delete (window as unknown as { onloadTurnstileCallback?: () => void }).onloadTurnstileCallback
  for (const script of Array.from(
    document.querySelectorAll('script[src*="challenges.cloudflare.com/turnstile"]')
  )) {
    script.remove()
  }
}

describe('TurnstileWidget', () => {
  beforeEach(() => {
    clearTurnstile()
  })

  afterEach(() => {
    clearTurnstile()
    vi.restoreAllMocks()
  })

  it('renders nothing when siteKey is undefined (no-op)', () => {
    const { container } = render(<TurnstileWidget onSuccess={() => {}} />)
    expect(container.firstChild).toBeNull()
  })

  it('renders nothing when siteKey is an empty string (no-op)', () => {
    const { container } = render(<TurnstileWidget siteKey="" onSuccess={() => {}} />)
    expect(container.firstChild).toBeNull()
  })

  it('does NOT inject the Cloudflare script when siteKey is empty', () => {
    render(<TurnstileWidget onSuccess={() => {}} />)
    const script = document.querySelector('script[src*="challenges.cloudflare.com/turnstile"]')
    expect(script).toBeNull()
  })

  it('renders the container div when siteKey is set', () => {
    const turnstile = setupTurnstile()
    const { container } = render(<TurnstileWidget siteKey="0xABCDEF" onSuccess={() => {}} />)

    expect(container.firstChild).not.toBeNull()
    expect((container.firstChild as HTMLElement).tagName).toBe('DIV')
    expect(turnstile.render).toHaveBeenCalledOnce()
  })

  it('passes siteKey + theme + appearance to window.turnstile.render', () => {
    const turnstile = setupTurnstile()
    render(
      <TurnstileWidget siteKey="0x123" onSuccess={() => {}} theme="dark" appearance="always" />
    )

    expect(turnstile.render).toHaveBeenCalledOnce()
    const opts = turnstile.render.mock.calls[0]![1] as {
      sitekey: string
      theme: string
      appearance: string
    }
    expect(opts.sitekey).toBe('0x123')
    expect(opts.theme).toBe('dark')
    expect(opts.appearance).toBe('always')
  })

  it('invokes onSuccess with the token obtained from Cloudflare callback', () => {
    const turnstile = setupTurnstile()
    const onSuccess = vi.fn()

    render(<TurnstileWidget siteKey="0x123" onSuccess={onSuccess} />)

    expect(turnstile.render).toHaveBeenCalledOnce()
    const opts = turnstile.render.mock.calls[0]![1] as {
      callback?: (token: string) => void
    }
    opts.callback?.('cf-turnstile-token-abc')

    expect(onSuccess).toHaveBeenCalledWith('cf-turnstile-token-abc')
  })

  it('invokes onExpired when the Cloudflare expired-callback fires', () => {
    const turnstile = setupTurnstile()
    const onExpired = vi.fn()

    render(<TurnstileWidget siteKey="0x123" onSuccess={() => {}} onExpired={onExpired} />)

    const opts = turnstile.render.mock.calls[0]![1] as {
      'expired-callback'?: () => void
    }
    opts['expired-callback']?.()

    expect(onExpired).toHaveBeenCalledOnce()
  })

  it('removes the widget on unmount when window.turnstile is available', () => {
    const turnstile = setupTurnstile()
    const { unmount } = render(<TurnstileWidget siteKey="0x123" onSuccess={() => {}} />)

    unmount()

    expect(turnstile.remove).toHaveBeenCalledWith('widget-id-123')
  })

  it('injects the Cloudflare script lazily when window.turnstile is missing', () => {
    expect((window as unknown as { turnstile?: unknown }).turnstile).toBeUndefined()

    render(<TurnstileWidget siteKey="0x123" onSuccess={() => {}} />)

    const script = document.querySelector(
      'script[src*="challenges.cloudflare.com/turnstile"]'
    ) as HTMLScriptElement | null
    expect(script).not.toBeNull()
    expect(script?.async).toBe(true)
    expect(script?.defer).toBe(true)
    expect(
      (window as unknown as { onloadTurnstileCallback?: () => void }).onloadTurnstileCallback
    ).toBeTypeOf('function')
  })

  it('does not crash when window.turnstile.remove throws on unmount (HMR resilience)', () => {
    const turnstile = setupTurnstile()
    turnstile.remove.mockImplementation(() => {
      throw new Error('handle invalid (HMR)')
    })

    const { unmount } = render(<TurnstileWidget siteKey="0x123" onSuccess={() => {}} />)

    expect(() => unmount()).not.toThrow()
  })

  it('routes render failures through the consumer-supplied logger', () => {
    const turnstile = setupTurnstile()
    turnstile.render.mockImplementation(() => {
      throw new Error('cloudflare boom')
    })

    const logger = { warn: vi.fn() }
    render(<TurnstileWidget siteKey="0x123" onSuccess={() => {}} logger={logger} />)

    expect(logger.warn).toHaveBeenCalledWith('[turnstile] render failed', expect.any(Error))
  })
})

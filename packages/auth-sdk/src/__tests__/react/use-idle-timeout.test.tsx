/**
 * Coverage for the `useIdleTimeout` hook (cf. AUTH-V1-IDLETIMEOUT, agent B).
 *
 * The contract:
 * - No-op when `enabled === false` OR `idleMs` falsy OR user is unauthenticated.
 * - Schedules a `warningMs`-before-timeout warning callback + a timeout
 *   callback that fires the canonical logout flow.
 * - Every activity event (mouse/keyboard/touch/scroll/focus) reschedules
 *   both timers.
 * - Cleans up event listeners and timers on unmount.
 */

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { act, renderHook } from '@testing-library/react'
import React from 'react'
import { useIdleTimeout } from '../../react/use-idle-timeout.js'
import { TestAuthProvider, createTestStore } from '../testProvider.js'
import { createTestUser } from '../helpers.js'
import type { AuthStoreApi } from '../../react/store.js'

interface SeededWrapperProps {
  authenticated: boolean
}

function makeWrapper(opts: SeededWrapperProps): {
  Wrapper: React.FC<{ children: React.ReactNode }>
  store: AuthStoreApi
} {
  const store = createTestStore()
  if (opts.authenticated) {
    // Pre-seed an authenticated session — synchronous, runs before the first render.
    store.getState().setAuth(createTestUser(), 'access-tok', 'localStorage', 'refresh-tok')
  }
  const Wrapper: React.FC<{ children: React.ReactNode }> = ({ children }) => (
    <TestAuthProvider store={store}>{children}</TestAuthProvider>
  )
  return { Wrapper, store }
}

describe('useIdleTimeout', () => {
  beforeEach(() => {
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.useRealTimers()
    vi.restoreAllMocks()
  })

  it('is a no-op when `enabled` is false', () => {
    const onWarning = vi.fn()
    const onTimeout = vi.fn()
    const { Wrapper } = makeWrapper({ authenticated: true })

    renderHook(
      () =>
        useIdleTimeout({
          enabled: false,
          idleMs: 100,
          warningMs: 50,
          onWarning,
          onTimeout,
        }),
      { wrapper: Wrapper }
    )

    vi.advanceTimersByTime(10_000)

    expect(onWarning).not.toHaveBeenCalled()
    expect(onTimeout).not.toHaveBeenCalled()
  })

  it('is a no-op when the user is not authenticated', () => {
    const onWarning = vi.fn()
    const onTimeout = vi.fn()
    const { Wrapper } = makeWrapper({ authenticated: false })

    renderHook(
      () =>
        useIdleTimeout({
          idleMs: 100,
          warningMs: 50,
          onWarning,
          onTimeout,
        }),
      { wrapper: Wrapper }
    )

    vi.advanceTimersByTime(10_000)

    expect(onWarning).not.toHaveBeenCalled()
    expect(onTimeout).not.toHaveBeenCalled()
  })

  it('is a no-op when `idleMs` is falsy', () => {
    const onWarning = vi.fn()
    const onTimeout = vi.fn()
    const { Wrapper } = makeWrapper({ authenticated: true })

    renderHook(
      () =>
        useIdleTimeout({
          idleMs: 0,
          onWarning,
          onTimeout,
        }),
      { wrapper: Wrapper }
    )

    vi.advanceTimersByTime(10_000)

    expect(onWarning).not.toHaveBeenCalled()
    expect(onTimeout).not.toHaveBeenCalled()
  })

  it('fires `onWarning` at idleMs - warningMs', () => {
    const onWarning = vi.fn()
    const onTimeout = vi.fn()
    const { Wrapper } = makeWrapper({ authenticated: true })

    renderHook(
      () =>
        useIdleTimeout({
          idleMs: 1000,
          warningMs: 200,
          onWarning,
          onTimeout,
        }),
      { wrapper: Wrapper }
    )

    // Just before the warning — nothing fires.
    vi.advanceTimersByTime(799)
    expect(onWarning).not.toHaveBeenCalled()

    // At the warning boundary (idleMs - warningMs = 800) — onWarning fires
    // exactly once with the remaining ms.
    vi.advanceTimersByTime(1)
    expect(onWarning).toHaveBeenCalledTimes(1)
    expect(onWarning).toHaveBeenCalledWith(200)
    expect(onTimeout).not.toHaveBeenCalled()
  })

  it('fires `onTimeout` at idleMs and only then', () => {
    const onWarning = vi.fn()
    const onTimeout = vi.fn()
    const { Wrapper } = makeWrapper({ authenticated: true })

    renderHook(
      () =>
        useIdleTimeout({
          idleMs: 500,
          warningMs: 100,
          onWarning,
          onTimeout,
        }),
      { wrapper: Wrapper }
    )

    vi.advanceTimersByTime(499)
    expect(onTimeout).not.toHaveBeenCalled()

    vi.advanceTimersByTime(1)
    expect(onTimeout).toHaveBeenCalledTimes(1)
  })

  it('reschedules both timers on every activity event', () => {
    const onWarning = vi.fn()
    const onTimeout = vi.fn()
    const onWarningClear = vi.fn()
    const { Wrapper } = makeWrapper({ authenticated: true })

    renderHook(
      () =>
        useIdleTimeout({
          idleMs: 1000,
          warningMs: 200,
          onWarning,
          onWarningClear,
          onTimeout,
        }),
      { wrapper: Wrapper }
    )

    // Halfway through the idle window.
    vi.advanceTimersByTime(500)
    expect(onWarning).not.toHaveBeenCalled()

    // User wiggles the mouse — both timers reset.
    window.dispatchEvent(new Event('mousemove'))

    // 500ms later (where the warning would have fired without the reset)
    // the warning is still NOT fired because the schedule restarted.
    vi.advanceTimersByTime(500)
    expect(onWarning).not.toHaveBeenCalled()
    expect(onTimeout).not.toHaveBeenCalled()

    // 300ms more brings us to t = 1300 since mount, but only 800ms since
    // the activity reset → onWarning fires now.
    vi.advanceTimersByTime(300)
    expect(onWarning).toHaveBeenCalledTimes(1)
  })

  it('dismisses the warning via `onWarningClear` when activity follows the warning', () => {
    const onWarning = vi.fn()
    const onWarningClear = vi.fn()
    const onTimeout = vi.fn()
    const { Wrapper } = makeWrapper({ authenticated: true })

    renderHook(
      () =>
        useIdleTimeout({
          idleMs: 500,
          warningMs: 200,
          onWarning,
          onWarningClear,
          onTimeout,
        }),
      { wrapper: Wrapper }
    )

    // Walk past the warning boundary so onWarning fires.
    vi.advanceTimersByTime(300)
    expect(onWarning).toHaveBeenCalledTimes(1)
    expect(onWarningClear).not.toHaveBeenCalled()

    // User comes back — activity reset.
    window.dispatchEvent(new Event('mousemove'))
    expect(onWarningClear).toHaveBeenCalledTimes(1)

    // Timeout still has NOT fired (the reset cancelled it).
    vi.advanceTimersByTime(199)
    expect(onTimeout).not.toHaveBeenCalled()
  })

  it('cleans up listeners + timers on unmount', () => {
    const onWarning = vi.fn()
    const onTimeout = vi.fn()
    const removeSpy = vi.spyOn(window, 'removeEventListener')
    const { Wrapper } = makeWrapper({ authenticated: true })

    const { unmount } = renderHook(
      () =>
        useIdleTimeout({
          idleMs: 500,
          warningMs: 200,
          events: ['mousemove', 'keydown'],
          onWarning,
          onTimeout,
        }),
      { wrapper: Wrapper }
    )

    unmount()

    // Both events were unregistered on cleanup.
    const calls = removeSpy.mock.calls.map(args => args[0])
    expect(calls).toContain('mousemove')
    expect(calls).toContain('keydown')

    // After unmount the timers are cancelled — advancing time doesn't
    // fire the callbacks.
    vi.advanceTimersByTime(10_000)
    expect(onWarning).not.toHaveBeenCalled()
    expect(onTimeout).not.toHaveBeenCalled()

    removeSpy.mockRestore()
  })

  it('fires the warning immediately when `warningMs >= idleMs` (compressed window)', () => {
    const onWarning = vi.fn()
    const onTimeout = vi.fn()
    const { Wrapper } = makeWrapper({ authenticated: true })

    renderHook(
      () =>
        useIdleTimeout({
          idleMs: 200,
          warningMs: 500, // larger than idleMs
          onWarning,
          onTimeout,
        }),
      { wrapper: Wrapper }
    )

    // Warning fires on the next macrotask (delay = 0).
    vi.advanceTimersByTime(0)
    expect(onWarning).toHaveBeenCalledTimes(1)
    // Remaining is clamped to idleMs because warningMs > idleMs.
    expect(onWarning).toHaveBeenCalledWith(200)

    // Timeout still respects idleMs.
    vi.advanceTimersByTime(199)
    expect(onTimeout).not.toHaveBeenCalled()
    vi.advanceTimersByTime(1)
    expect(onTimeout).toHaveBeenCalledTimes(1)
  })

  it('returns a stable `reset` callable that reschedules both timers', () => {
    const onWarning = vi.fn()
    const onTimeout = vi.fn()
    const { Wrapper } = makeWrapper({ authenticated: true })

    const { result } = renderHook(
      () =>
        useIdleTimeout({
          idleMs: 1000,
          warningMs: 200,
          onWarning,
          onTimeout,
        }),
      { wrapper: Wrapper }
    )

    // Wait until just before the warning.
    vi.advanceTimersByTime(799)
    expect(onWarning).not.toHaveBeenCalled()

    // Programmatic reset (e.g. user clicks "Stay signed in" CTA).
    result.current.reset()

    // 799ms later — warning still NOT fired (reset restarted the clock).
    vi.advanceTimersByTime(799)
    expect(onWarning).not.toHaveBeenCalled()

    // 1ms more from the reset baseline → warning fires.
    vi.advanceTimersByTime(1)
    expect(onWarning).toHaveBeenCalledTimes(1)
  })

  it('swallows consumer callback throws (timer chain stays alive)', () => {
    const onWarning = vi.fn(() => {
      throw new Error('boom')
    })
    const onTimeout = vi.fn()
    const { Wrapper } = makeWrapper({ authenticated: true })

    renderHook(
      () =>
        useIdleTimeout({
          idleMs: 500,
          warningMs: 200,
          onWarning,
          onTimeout,
        }),
      { wrapper: Wrapper }
    )

    // Trigger the warning — it throws inside the callback.
    vi.advanceTimersByTime(300)
    expect(onWarning).toHaveBeenCalledTimes(1)

    // The throw was swallowed — the timeout still fires on schedule.
    vi.advanceTimersByTime(200)
    expect(onTimeout).toHaveBeenCalledTimes(1)
  })

  it('switches from no-op to active when the user authenticates mid-mount', () => {
    const onWarning = vi.fn()
    const onTimeout = vi.fn()
    const { Wrapper, store } = makeWrapper({ authenticated: false })

    renderHook(
      () =>
        useIdleTimeout({
          idleMs: 500,
          warningMs: 200,
          onWarning,
          onTimeout,
        }),
      { wrapper: Wrapper }
    )

    // Initial: hook is no-op (not authenticated).
    vi.advanceTimersByTime(10_000)
    expect(onWarning).not.toHaveBeenCalled()
    expect(onTimeout).not.toHaveBeenCalled()

    // User logs in — the effect re-runs because `isAuthenticated` flipped.
    // Wrap in act() to flush the React state update + the post-commit
    // effect that arms the timers.
    act(() => {
      store.getState().setAuth(createTestUser(), 'access-tok', 'localStorage', 'refresh-tok')
    })

    // Now the timers run.
    vi.advanceTimersByTime(300)
    expect(onWarning).toHaveBeenCalledTimes(1)
    vi.advanceTimersByTime(200)
    expect(onTimeout).toHaveBeenCalledTimes(1)
  })
})

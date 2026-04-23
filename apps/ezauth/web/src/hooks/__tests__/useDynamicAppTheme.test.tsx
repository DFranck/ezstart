import { describe, it, expect, beforeEach } from 'vitest'
import { renderHook } from '@testing-library/react'
import { useDynamicAppTheme } from '../useDynamicAppTheme'

describe('useDynamicAppTheme', () => {
  beforeEach(() => {
    document.documentElement.removeAttribute('data-app')
  })

  it('sets <html data-app> to the resolved app on mount', () => {
    renderHook(() => useDynamicAppTheme('ezpay'))

    expect(document.documentElement.getAttribute('data-app')).toBe('ezpay')
  })

  it('restores the previous <html data-app> value on unmount', () => {
    document.documentElement.setAttribute('data-app', 'ezauth')

    const { unmount } = renderHook(() => useDynamicAppTheme('ezpay'))

    expect(document.documentElement.getAttribute('data-app')).toBe('ezpay')

    unmount()

    expect(document.documentElement.getAttribute('data-app')).toBe('ezauth')
  })

  it('removes the attribute on unmount when no previous value existed', () => {
    const { unmount } = renderHook(() => useDynamicAppTheme('ezpay'))

    expect(document.documentElement.getAttribute('data-app')).toBe('ezpay')

    unmount()

    expect(document.documentElement.hasAttribute('data-app')).toBe(false)
  })

  it('is a no-op when app is undefined', () => {
    document.documentElement.setAttribute('data-app', 'ezauth')

    renderHook(() => useDynamicAppTheme(undefined))

    // Previous attribute untouched — hook did not mutate the DOM.
    expect(document.documentElement.getAttribute('data-app')).toBe('ezauth')
  })

  it('updates the attribute when the app prop changes', () => {
    const { rerender } = renderHook(({ app }: { app: string }) => useDynamicAppTheme(app), {
      initialProps: { app: 'ezpay' },
    })

    expect(document.documentElement.getAttribute('data-app')).toBe('ezpay')

    rerender({ app: 'ezbill' })

    expect(document.documentElement.getAttribute('data-app')).toBe('ezbill')
  })

  it('skips DOM mutation when the attribute already matches', () => {
    document.documentElement.setAttribute('data-app', 'ezpay')

    const { unmount } = renderHook(() => useDynamicAppTheme('ezpay'))

    // Still 'ezpay' after mount.
    expect(document.documentElement.getAttribute('data-app')).toBe('ezpay')

    unmount()

    // Should stay 'ezpay' — no cleanup restoration because no mutation happened.
    expect(document.documentElement.getAttribute('data-app')).toBe('ezpay')
  })
})

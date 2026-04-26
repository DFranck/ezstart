/**
 * SubscribeSuccessPage — drop-in subscribe success landing.
 *
 * Verifies:
 *   - English defaults render
 *   - texts override works
 *   - session_id reference renders
 *   - auto-redirect fires after delay
 *   - onComplete callback fires before push
 */
import React from 'react'
import { render, screen, act } from '@testing-library/react'
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { uiComponentsMock, loggerMock, sonnerMock, uiUtilsMock } from './component-mocks.js'

const pushMock = vi.fn()
let searchParamsValue = new URLSearchParams()

vi.mock('@ezstart/ui/components', () => uiComponentsMock)
vi.mock('@ezstart/logger', () => loggerMock)
vi.mock('sonner', () => sonnerMock)
vi.mock('@ezstart/ui/utils', () => uiUtilsMock)

vi.mock('next/navigation', () => ({
  useRouter: () => ({
    push: pushMock,
    replace: vi.fn(),
    back: vi.fn(),
    refresh: vi.fn(),
    prefetch: vi.fn(),
  }),
  useSearchParams: () => searchParamsValue,
  usePathname: () => '/',
}))

const { SubscribeSuccessPage } = await import('../../components/SubscribeSuccessPage.js')

describe('SubscribeSuccessPage', () => {
  beforeEach(() => {
    pushMock.mockClear()
    searchParamsValue = new URLSearchParams()
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('renders English defaults', () => {
    render(<SubscribeSuccessPage redirectTo="/dashboard" redirectDelayMs={0} />)
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('Subscription Successful!')
    expect(screen.getByText(/Your subscription is active/)).toBeInTheDocument()
    expect(screen.getByText('Go to dashboard')).toBeInTheDocument()
    expect(screen.getByText('What happens next?')).toBeInTheDocument()
  })

  it('overrides texts via texts prop', () => {
    render(
      <SubscribeSuccessPage
        redirectTo="/x"
        redirectDelayMs={0}
        texts={{
          title: 'Custom Title',
          description: 'Custom desc',
          ctaLabel: 'Custom CTA',
          stepsTitle: 'Custom Steps',
          steps: ['Step A', 'Step B'],
        }}
      />
    )
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('Custom Title')
    expect(screen.getByText('Custom desc')).toBeInTheDocument()
    expect(screen.getByText('Custom CTA')).toBeInTheDocument()
    expect(screen.getByText('Custom Steps')).toBeInTheDocument()
    expect(screen.getByText('Step A')).toBeInTheDocument()
    expect(screen.getByText('Step B')).toBeInTheDocument()
  })

  it('renders session_id reference when present', () => {
    searchParamsValue = new URLSearchParams('session_id=cs_test_abcdef1234567890')
    render(<SubscribeSuccessPage redirectTo="/dashboard" redirectDelayMs={0} />)
    expect(screen.getByText(/Reference:/)).toBeInTheDocument()
    expect(screen.getByText(/abcdef1234567890|f1234567890/)).toBeInTheDocument()
  })

  it('auto-redirects after delay and fires onComplete', async () => {
    const onComplete = vi.fn()
    render(
      <SubscribeSuccessPage
        redirectTo="/dashboard"
        redirectDelayMs={3000}
        onComplete={onComplete}
      />
    )
    expect(pushMock).not.toHaveBeenCalled()
    // Tick the countdown 3 times then once more so the redirect effect fires.
    for (let i = 0; i < 4; i++) {
      await act(async () => {
        await vi.advanceTimersByTimeAsync(1000)
      })
    }
    expect(onComplete).toHaveBeenCalled()
    expect(pushMock).toHaveBeenCalledWith('/dashboard')
  })

  it('does not auto-redirect when redirectDelayMs is 0', () => {
    render(<SubscribeSuccessPage redirectTo="/dashboard" redirectDelayMs={0} />)
    act(() => {
      vi.advanceTimersByTime(10000)
    })
    expect(pushMock).not.toHaveBeenCalled()
  })
})

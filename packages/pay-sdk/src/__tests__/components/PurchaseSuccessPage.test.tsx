/**
 * PurchaseSuccessPage — drop-in purchase success landing.
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

const { PurchaseSuccessPage } = await import('../../components/PurchaseSuccessPage.js')

describe('PurchaseSuccessPage', () => {
  beforeEach(() => {
    pushMock.mockClear()
    searchParamsValue = new URLSearchParams()
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('renders English defaults', () => {
    render(<PurchaseSuccessPage />)
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('Purchase Complete!')
    expect(screen.getByText(/Your purchase has been processed/)).toBeInTheDocument()
    expect(screen.getByText('Back to home')).toBeInTheDocument()
  })

  it('does not auto-redirect by default', () => {
    render(<PurchaseSuccessPage />)
    act(() => {
      vi.advanceTimersByTime(10000)
    })
    expect(pushMock).not.toHaveBeenCalled()
  })

  it('auto-redirects when redirectTo + delay set', async () => {
    render(<PurchaseSuccessPage redirectTo="/account" redirectDelayMs={1500} />)
    // 1500ms = 2 ticks (1000+500 rounded up to 2s, then redirect tick)
    for (let i = 0; i < 3; i++) {
      await act(async () => {
        await vi.advanceTimersByTimeAsync(1000)
      })
    }
    expect(pushMock).toHaveBeenCalledWith('/account')
  })

  it('renders session_id reference when present', () => {
    searchParamsValue = new URLSearchParams('session_id=cs_buy_abcdef1234567890')
    render(<PurchaseSuccessPage />)
    expect(screen.getByText(/Reference:/)).toBeInTheDocument()
  })
})

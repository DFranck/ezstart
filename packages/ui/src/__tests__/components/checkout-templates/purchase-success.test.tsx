/**
 * PurchaseSuccessTemplate — drop-in purchase success landing.
 */
import React from 'react'
import { render, screen, act } from '@testing-library/react'
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'

const pushMock = vi.fn()
let searchParamsValue = new URLSearchParams()

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

const { PurchaseSuccessTemplate } =
  await import('../../../components/checkout-templates/purchase-success')

describe('PurchaseSuccessTemplate', () => {
  beforeEach(() => {
    pushMock.mockClear()
    searchParamsValue = new URLSearchParams()
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('renders English defaults', () => {
    render(<PurchaseSuccessTemplate />)
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('Purchase Complete!')
    expect(screen.getByText(/purchase has been processed/)).toBeInTheDocument()
    expect(screen.getByText('Back to home')).toBeInTheDocument()
    expect(screen.getByText('What happens next?')).toBeInTheDocument()
  })

  it('does not auto-redirect by default', () => {
    render(<PurchaseSuccessTemplate redirectTo="/dashboard" />)
    act(() => {
      vi.advanceTimersByTime(10000)
    })
    expect(pushMock).not.toHaveBeenCalled()
  })

  it('auto-redirects when redirectTo + delay set', async () => {
    render(<PurchaseSuccessTemplate redirectTo="/dashboard" redirectDelayMs={3000} />)
    for (let i = 0; i < 4; i++) {
      await act(async () => {
        await vi.advanceTimersByTimeAsync(1000)
      })
    }
    expect(pushMock).toHaveBeenCalledWith('/dashboard')
  })

  it('renders session_id reference when present', () => {
    searchParamsValue = new URLSearchParams('session_id=cs_test_pq98765')
    render(<PurchaseSuccessTemplate />)
    expect(screen.getByText(/Reference:/)).toBeInTheDocument()
  })
})

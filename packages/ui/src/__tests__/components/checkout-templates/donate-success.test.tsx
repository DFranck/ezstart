/**
 * DonateSuccessTemplate — drop-in donation success landing.
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

const { DonateSuccessTemplate } =
  await import('../../../components/checkout-templates/donate-success')

describe('DonateSuccessTemplate', () => {
  beforeEach(() => {
    pushMock.mockClear()
    searchParamsValue = new URLSearchParams()
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('renders English defaults', () => {
    render(<DonateSuccessTemplate />)
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('Thank You!')
    expect(screen.getByText(/donation has been received/)).toBeInTheDocument()
    expect(screen.getByText('Back to home')).toBeInTheDocument()
    expect(screen.getByText('What happens next?')).toBeInTheDocument()
  })

  it('does not auto-redirect by default (redirectDelayMs=0)', () => {
    render(<DonateSuccessTemplate redirectTo="/dashboard" />)
    act(() => {
      vi.advanceTimersByTime(10000)
    })
    expect(pushMock).not.toHaveBeenCalled()
  })

  it('auto-redirects when redirectTo + delay are provided', async () => {
    render(<DonateSuccessTemplate redirectTo="/dashboard" redirectDelayMs={3000} />)
    for (let i = 0; i < 4; i++) {
      await act(async () => {
        await vi.advanceTimersByTimeAsync(1000)
      })
    }
    expect(pushMock).toHaveBeenCalledWith('/dashboard')
  })

  it('renders session_id reference when present', () => {
    searchParamsValue = new URLSearchParams('session_id=cs_test_abc123def456ghi789')
    render(<DonateSuccessTemplate />)
    expect(screen.getByText(/Reference:/)).toBeInTheDocument()
  })
})

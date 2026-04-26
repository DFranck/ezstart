/**
 * DonateSuccessPage — drop-in donation success landing.
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

const { DonateSuccessPage } = await import('../../components/DonateSuccessPage.js')

describe('DonateSuccessPage', () => {
  beforeEach(() => {
    pushMock.mockClear()
    searchParamsValue = new URLSearchParams()
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('renders English defaults', () => {
    render(<DonateSuccessPage />)
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('Thank You!')
    expect(screen.getByText(/Your donation has been received/)).toBeInTheDocument()
    expect(screen.getByText('Back to home')).toBeInTheDocument()
  })

  it('does not auto-redirect by default', () => {
    render(<DonateSuccessPage />)
    act(() => {
      vi.advanceTimersByTime(10000)
    })
    expect(pushMock).not.toHaveBeenCalled()
  })

  it('auto-redirects when redirectTo + delay are provided', async () => {
    render(<DonateSuccessPage redirectTo="/thanks" redirectDelayMs={2000} />)
    for (let i = 0; i < 3; i++) {
      await act(async () => {
        await vi.advanceTimersByTimeAsync(1000)
      })
    }
    expect(pushMock).toHaveBeenCalledWith('/thanks')
  })

  it('renders session_id reference when present', () => {
    searchParamsValue = new URLSearchParams('session_id=cs_donate_abcdef1234567890')
    render(<DonateSuccessPage />)
    expect(screen.getByText(/Reference:/)).toBeInTheDocument()
  })
})

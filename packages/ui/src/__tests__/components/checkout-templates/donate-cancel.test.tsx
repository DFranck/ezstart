/**
 * DonateCancelTemplate — drop-in donation cancel landing.
 */
import React from 'react'
import { render, screen } from '@testing-library/react'
import { describe, it, expect, vi } from 'vitest'

vi.mock('next/navigation', () => ({
  useRouter: () => ({
    push: vi.fn(),
    replace: vi.fn(),
    back: vi.fn(),
    refresh: vi.fn(),
    prefetch: vi.fn(),
  }),
  useSearchParams: () => new URLSearchParams(),
  usePathname: () => '/',
}))

const { DonateCancelTemplate } =
  await import('../../../components/checkout-templates/donate-cancel')

describe('DonateCancelTemplate', () => {
  it('renders English defaults', () => {
    render(<DonateCancelTemplate />)
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('Payment Cancelled')
    expect(screen.getByText(/Your payment was cancelled/)).toBeInTheDocument()
    expect(screen.getByText('Try Again')).toBeInTheDocument()
    expect(screen.getByText('Back to Home')).toBeInTheDocument()
    expect(screen.getByText('Need help?')).toBeInTheDocument()
  })

  it('uses custom hrefs', () => {
    const { container } = render(
      <DonateCancelTemplate tryAgainHref="/en/donate" backHomeHref="/en" />
    )
    const links = Array.from(container.querySelectorAll('a')).map(a => a.getAttribute('href'))
    expect(links).toContain('/en/donate')
    expect(links).toContain('/en')
  })

  it('overrides texts', () => {
    render(
      <DonateCancelTemplate
        texts={{
          title: 'Bye',
          description: 'See ya',
          primaryCtaLabel: 'Retry',
          secondaryCtaLabel: 'Home',
        }}
      />
    )
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('Bye')
    expect(screen.getByText('See ya')).toBeInTheDocument()
    expect(screen.getByText('Retry')).toBeInTheDocument()
    expect(screen.getByText('Home')).toBeInTheDocument()
  })
})

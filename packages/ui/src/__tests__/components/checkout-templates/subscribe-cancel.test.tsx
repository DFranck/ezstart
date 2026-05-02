/**
 * SubscribeCancelTemplate — drop-in subscribe cancel landing.
 *
 * Verifies English defaults, texts override, and CTA hrefs.
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

const { SubscribeCancelTemplate } =
  await import('../../../components/checkout-templates/subscribe-cancel')

describe('SubscribeCancelTemplate', () => {
  it('renders English defaults', () => {
    render(<SubscribeCancelTemplate />)
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('Checkout Cancelled')
    expect(screen.getByText(/Your subscription was not started/)).toBeInTheDocument()
    expect(screen.getByText('Back to pricing')).toBeInTheDocument()
    expect(screen.getByText('Back to home')).toBeInTheDocument()
    expect(screen.getByText('Need help?')).toBeInTheDocument()
  })

  it('uses custom hrefs', () => {
    const { container } = render(
      <SubscribeCancelTemplate backToPricingHref="/en/#pricing" backHomeHref="/en" />
    )
    const links = Array.from(container.querySelectorAll('a')).map(a => a.getAttribute('href'))
    expect(links).toContain('/en/#pricing')
    expect(links).toContain('/en')
  })

  it('overrides texts via texts prop', () => {
    render(
      <SubscribeCancelTemplate
        texts={{
          title: 'Bye',
          description: 'See ya',
          primaryCtaLabel: 'Pricing',
          secondaryCtaLabel: 'Home',
          stepsTitle: 'FAQ',
          steps: ['Foo', 'Bar'],
        }}
      />
    )
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('Bye')
    expect(screen.getByText('See ya')).toBeInTheDocument()
    expect(screen.getByText('Pricing')).toBeInTheDocument()
    expect(screen.getByText('Home')).toBeInTheDocument()
    expect(screen.getByText('FAQ')).toBeInTheDocument()
    expect(screen.getByText('Foo')).toBeInTheDocument()
  })
})

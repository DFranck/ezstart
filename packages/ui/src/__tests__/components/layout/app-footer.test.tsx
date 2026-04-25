import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import * as React from 'react'

import { FooterLink } from '../../../components/layout/app-footer'

describe('FooterLink', () => {
  it('renders a native <a> wrapped in <li> when asChild is omitted', () => {
    render(<FooterLink href="/privacy">Privacy</FooterLink>)
    const anchor = screen.getByText('Privacy')
    expect(anchor.tagName).toBe('A')
    expect(anchor).toHaveAttribute('href', '/privacy')
    expect(anchor).toHaveAttribute('data-slot', 'footer-link')
    expect(anchor.parentElement?.tagName).toBe('LI')
  })

  it('renders the child element when asChild is true and keeps the <li> wrapper', () => {
    function FakeLink({ href, children, ...rest }: React.AnchorHTMLAttributes<HTMLAnchorElement>) {
      return (
        <a href={href} data-testid="footer-fake-link" {...rest}>
          {children}
        </a>
      )
    }
    render(
      <FooterLink asChild className="extra">
        <FakeLink href="/terms">Terms</FakeLink>
      </FooterLink>
    )
    const link = screen.getByTestId('footer-fake-link')
    expect(link.tagName).toBe('A')
    expect(link).toHaveAttribute('href', '/terms')
    expect(link).toHaveAttribute('data-slot', 'footer-link')
    expect(link.className).toMatch(/extra/)
    expect(link.parentElement?.tagName).toBe('LI')
  })
})

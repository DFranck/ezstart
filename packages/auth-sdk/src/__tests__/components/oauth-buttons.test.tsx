import { describe, it, expect } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import React from 'react'
import { OAuthButtons } from '../../components/OAuthButtons.js'

describe('OAuthButtons', () => {
  it('renders Google button by default', () => {
    render(<OAuthButtons appName="myapp" />)
    expect(screen.getByText('Continue with Google')).toBeInTheDocument()
  })

  it('renders divider text', () => {
    render(<OAuthButtons appName="myapp" />)
    expect(screen.getByText('or continue with')).toBeInTheDocument()
  })

  it('uses custom texts', () => {
    render(
      <OAuthButtons
        appName="myapp"
        texts={{
          continueWithGoogle: 'Se connecter avec Google',
          orContinueWith: 'ou continuer avec',
        }}
      />
    )
    expect(screen.getByText('Se connecter avec Google')).toBeInTheDocument()
    expect(screen.getByText('ou continuer avec')).toBeInTheDocument()
  })

  it('clicking Google button sets location to OAuth URL', async () => {
    // jsdom doesn't allow spying on window.location.href,
    // but we can use Object.defineProperty to capture the assignment
    let capturedHref = ''
    const originalLocation = window.location
    // @ts-expect-error - jsdom location override for test
    delete window.location
    window.location = {
      ...originalLocation,
      set href(val: string) {
        capturedHref = val
      },
      get href() {
        return originalLocation.href
      },
    } as Location

    render(<OAuthButtons appName="myapp" redirectUri="https://app.com/callback" />)
    const btn = screen.getByText('Continue with Google')
    fireEvent.click(btn)

    // The click handler is async (it mints a PKCE pair before navigating), so
    // wait for the navigation to be assigned. Whether PKCE succeeds or falls
    // back to no-PKCE, the base authorize URL + app/redirect_uri params hold.
    await waitFor(() => {
      expect(capturedHref).toContain('/api/auth/google?')
    })
    expect(capturedHref).toContain('app=myapp')
    expect(capturedHref).toContain('redirect_uri=')

    window.location = originalLocation
  })

  it('sends a locale-less explicit redirect_uri when provided as a prop (RFC 6749 §3.1.2 allowlist exact-match)', async () => {
    let capturedHref = ''
    const originalLocation = window.location
    // @ts-expect-error - jsdom location override
    delete window.location
    window.location = {
      ...originalLocation,
      set href(val: string) {
        capturedHref = val
      },
      get href() {
        return originalLocation.href
      },
    } as Location

    render(<OAuthButtons appName="myapp" redirectUri="https://app.example.com/auth/callback" />)
    fireEvent.click(screen.getByText('Continue with Google'))

    await waitFor(() => {
      expect(capturedHref).toContain('/api/auth/google?')
    })

    // Decode the redirect_uri param and assert it is locale-less.
    const url = new URL(capturedHref)
    const sentRedirect = url.searchParams.get('redirect_uri')
    expect(sentRedirect).toBe('https://app.example.com/auth/callback')
    // Should NOT include a locale segment like /en or /fr
    expect(sentRedirect).not.toMatch(/\/[a-z]{2,3}\/auth\/callback$/)

    window.location = originalLocation
  })

  it('does not render Google button when not in providers list', () => {
    render(<OAuthButtons appName="myapp" providers={[]} />)
    expect(screen.queryByText('Continue with Google')).not.toBeInTheDocument()
  })
})

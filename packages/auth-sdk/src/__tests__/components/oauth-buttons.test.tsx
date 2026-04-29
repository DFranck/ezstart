import { describe, it, expect } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
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

  it('clicking Google button sets location to OAuth URL', () => {
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

    expect(capturedHref).toContain('/api/auth/google?')
    expect(capturedHref).toContain('app=myapp')
    expect(capturedHref).toContain('redirect_uri=')

    window.location = originalLocation
  })

  it('does not render Google button when not in providers list', () => {
    render(<OAuthButtons appName="myapp" providers={[]} />)
    expect(screen.queryByText('Continue with Google')).not.toBeInTheDocument()
  })
})

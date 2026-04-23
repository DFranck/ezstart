/**
 * EZAuthDashboard — home nav prop regression tests.
 *
 * Minimal render coverage focused on the `homeHref` / `onHomeClick` branch
 * (regression fix for hardcoded `<a href="/">` causing non-localized 404).
 */
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { act, fireEvent, render, screen } from '@testing-library/react'
import React from 'react'
import { createTestUser } from '../helpers.js'

// Extend @ezstart/ui/components mock with dashboard-layout primitives used by
// EZAuthDashboard. This is additive to the global mock in setup.ts.
vi.mock('@ezstart/ui/components', async () => {
  const actual = (await vi.importActual('@ezstart/ui/components')) as Record<string, unknown>
  const passthrough =
    (tag: string) =>
    ({ children, ...props }: React.PropsWithChildren<Record<string, unknown>>) => {
      // Strip non-DOM props
      const domProps: Record<string, unknown> = {}
      for (const [k, v] of Object.entries(props)) {
        if (
          typeof v === 'string' ||
          typeof v === 'number' ||
          typeof v === 'boolean' ||
          typeof v === 'function' ||
          v == null
        ) {
          domProps[k] = v
        }
      }
      return React.createElement(tag, domProps, children)
    }
  return {
    ...actual,
    DashboardLayout: passthrough('div'),
    DashboardSidebar: passthrough('aside'),
    DashboardMain: passthrough('main'),
    DashboardHeader: passthrough('header'),
    DashboardContent: passthrough('div'),
    SidebarHeader: passthrough('div'),
    SidebarNav: passthrough('nav'),
    SidebarFooter: passthrough('div'),
    SidebarToggle: passthrough('button'),
    SidebarLink: ({
      children,
      href,
      onClick,
      active: _active,
      icon: _icon,
      ...rest
    }: React.PropsWithChildren<{
      href?: string
      onClick?: (e: React.MouseEvent) => void
      active?: boolean
      icon?: React.ReactNode
    }>) =>
      React.createElement('a', { href, onClick, ...(rest as Record<string, unknown>) }, children),
  }
})

// Mock useAuth with an authenticated user so dashboard renders.
vi.mock('../../react/hooks.js', () => ({
  useAuth: () => ({
    user: createTestUser({ roles: ['user'] }),
    isAuthenticated: true,
    isLoggingIn: false,
    isAuthReady: true,
    login: vi.fn(),
    logout: vi.fn(),
  }),
}))

vi.mock('../../react/auth-provider.js', () => ({
  useAuthContext: () => ({
    client: { getApiUrl: () => 'http://localhost:6110/api/auth' },
    appName: 'testapp',
    webUrl: 'http://localhost:6111',
    keyConfig: null,
    scope: 'live',
  }),
}))

// Mock the heavy child components — we only care about sidebar brand rendering.
vi.mock('../../components/UserMenu.js', () => ({
  UserMenu: () => <div data-testid="UserMenu" />,
}))
vi.mock('../../components/UserSettings.js', () => ({
  UserSettings: () => <div data-testid="UserSettings" />,
}))
vi.mock('../../components/TwoFactorSettings.js', () => ({
  TwoFactorSettings: () => <div data-testid="TwoFactorSettings" />,
}))
vi.mock('../../components/EmailVerificationStatus.js', () => ({
  EmailVerificationStatus: () => <div data-testid="EmailVerificationStatus" />,
}))
vi.mock('../../components/SessionsManager.js', () => ({
  SessionsManager: () => <div data-testid="SessionsManager" />,
}))
vi.mock('../../components/developer/index.js', () => ({
  DeveloperPortal: () => <div data-testid="DeveloperPortal" />,
}))
vi.mock('../../components/AuthAdminDashboard.js', () => ({
  AuthAdminDashboard: () => <div data-testid="AuthAdminDashboard" />,
}))

const { EZAuthDashboard } = await import('../../components/EZAuthDashboard.js')

describe('EZAuthDashboard — home nav (homeHref / onHomeClick)', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('renders brand as <a href="/"> by default', () => {
    render(<EZAuthDashboard appName="testapp" />)
    // Await the `mounted` effect
    act(() => {})
    const brand = screen.getByText('Dashboard').closest('a')
    expect(brand).not.toBeNull()
    expect(brand).toHaveAttribute('href', '/')
  })

  it('renders brand with custom homeHref (locale-prefixed)', () => {
    render(<EZAuthDashboard appName="testapp" homeHref="/en" />)
    act(() => {})
    const brand = screen.getByText('Dashboard').closest('a')
    expect(brand).not.toBeNull()
    expect(brand).toHaveAttribute('href', '/en')
  })

  it('renders brand as <button> when onHomeClick is provided', () => {
    const onHomeClick = vi.fn()
    render(<EZAuthDashboard appName="testapp" onHomeClick={onHomeClick} />)
    act(() => {})

    // Brand span is inside a button, not an anchor
    const brandSpan = screen.getByText('Dashboard')
    const button = brandSpan.closest('button')
    expect(button).not.toBeNull()
    expect(button).toHaveAttribute('type', 'button')

    fireEvent.click(button as HTMLButtonElement)
    expect(onHomeClick).toHaveBeenCalledTimes(1)
  })

  it('onHomeClick takes precedence over homeHref when both are provided', () => {
    const onHomeClick = vi.fn()
    render(<EZAuthDashboard appName="testapp" homeHref="/en" onHomeClick={onHomeClick} />)
    act(() => {})

    const brandSpan = screen.getByText('Dashboard')
    const button = brandSpan.closest('button')
    // No anchor link should be rendered
    const anchor = brandSpan.closest('a')
    expect(button).not.toBeNull()
    expect(anchor).toBeNull()
  })
})

/**
 * TurnstileWidget — deprecated re-export contract test.
 *
 * The component was moved to `@ezstart/api-sdk/integrations` (2026-05-01)
 * because Cloudflare Turnstile is a generic captcha integration, not
 * auth-specific. The auth-sdk surface is preserved for 90 days as a
 * deprecated re-export (planned removal 2026-08-01). This test pins the
 * contract that the re-export keeps forwarding the props correctly so
 * consumers can migrate at their own pace.
 *
 * The exhaustive behaviour suite (script injection, cloudflare globals,
 * lifecycle) lives in
 * `@ezstart/api-sdk/__tests__/integrations/turnstile-widget.test.tsx`.
 */
import React from 'react'
import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { TurnstileWidget } from '../../components/TurnstileWidget.js'

describe('TurnstileWidget (deprecated re-export)', () => {
  it('renders nothing when siteKey is undefined (no-op)', () => {
    const { container } = render(<TurnstileWidget onSuccess={() => {}} />)
    expect(container.firstChild).toBeNull()
  })

  it('renders nothing when siteKey is an empty string (no-op)', () => {
    const { container } = render(<TurnstileWidget siteKey="" onSuccess={() => {}} />)
    expect(container.firstChild).toBeNull()
  })

  it('forwards siteKey to the underlying api-sdk integration when set', () => {
    render(<TurnstileWidget siteKey="0xABCDEF" onSuccess={() => {}} />)
    const widget = screen.getByTestId('TurnstileWidget')
    expect(widget).toBeInTheDocument()
    expect(widget).toHaveAttribute('data-sitekey', '0xABCDEF')
  })
})

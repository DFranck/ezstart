/**
 * PasswordStrength — deprecated re-export contract test.
 *
 * The component was moved to `@ezstart/ui` (2026-05-01). The auth-sdk
 * surface is preserved for 90 days as a deprecated re-export (planned
 * removal 2026-08-01). This test pins the contract that the re-export
 * keeps producing the same label so consumers can migrate at their own
 * pace.
 *
 * The exhaustive behaviour suite lives in
 * `@ezstart/ui/__tests__/components/forms/password-strength.test.tsx`.
 */
import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import React from 'react'
import { PasswordStrength } from '../../components/PasswordStrength.js'

describe('PasswordStrength (deprecated re-export)', () => {
  it('renders nothing when password is empty', () => {
    const { container } = render(<PasswordStrength password="" />)
    expect(container.innerHTML).toBe('')
  })

  it('shows "Weak" for short simple password', () => {
    render(<PasswordStrength password="abc" />)
    expect(screen.getByText('Weak')).toBeInTheDocument()
  })

  it('shows "Strong" for complex password', () => {
    render(<PasswordStrength password="MyP@ssw0rd!2024" />)
    expect(screen.getByText('Strong')).toBeInTheDocument()
  })

  it('uses custom texts when provided', () => {
    render(
      <PasswordStrength
        password="abc"
        texts={{ weak: 'Faible', fair: 'Moyen', good: 'Bon', strong: 'Fort' }}
      />
    )
    expect(screen.getByText('Faible')).toBeInTheDocument()
  })
})

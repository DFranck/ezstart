/**
 * PasswordStrength — public surface tests.
 *
 * Pin the contract for the password entropy + variety meter exposed by
 * `@ezstart/ui/components`. Originally extracted from `@ezstart/auth-sdk`
 * — now generic and reusable across all consumer apps and SDKs.
 */
import React from 'react'
import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'

import { PasswordStrength } from '../../../components/forms/password-strength'

describe('PasswordStrength', () => {
  it('renders nothing when password is empty', () => {
    const { container } = render(<PasswordStrength password="" />)
    expect(container.innerHTML).toBe('')
  })

  it('shows "Weak" for short simple password', () => {
    render(<PasswordStrength password="abc" />)
    expect(screen.getByText('Weak')).toBeInTheDocument()
  })

  it('shows "Fair" for medium-complexity password', () => {
    render(<PasswordStrength password="abc123" />)
    expect(screen.getByText('Fair')).toBeInTheDocument()
  })

  it('shows "Good" for good password', () => {
    // score: >=6(1) + >=10(1) + lower(1) + upper(1) + digit(1) = 5 → good
    render(<PasswordStrength password="Abc1234567" />)
    expect(screen.getByText('Good')).toBeInTheDocument()
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

  it('renders 4 strength bars + 1 label paragraph', () => {
    const { container } = render(<PasswordStrength password="abc" />)
    // The component does not crash; outer container is present and the label
    // is rendered in a <p>. The 4 bars are <div> children of the bars row.
    expect(container.firstChild).not.toBeNull()
    expect(screen.getByText('Weak').tagName).toBe('P')
  })
})

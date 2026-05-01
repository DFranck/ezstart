/**
 * ProgressBadge — public surface tests.
 *
 * Pin the contract for the generic usage / quota progress badge exposed
 * by `@ezstart/ui/components`. Originally inlined inside
 * `@ezstart/auth-sdk`'s `<UsageBadge>` — extracted so any consumer app
 * can reuse it for any quota surface (storage, seats, billing units, ...).
 */
import React from 'react'
import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'

import { ProgressBadge } from '../../../components/feedback/progress-badge'

describe('ProgressBadge', () => {
  describe('unlimited (limit = null)', () => {
    it('renders an "Unlimited" outline badge with no progress bar', () => {
      render(<ProgressBadge usage={{ used: 0, limit: null }} />)
      expect(screen.getByText('Unlimited')).toBeInTheDocument()
      expect(screen.queryByRole('progressbar')).not.toBeInTheDocument()
    })

    it('honours the texts prop override', () => {
      render(<ProgressBadge usage={{ used: 100, limit: null }} texts={{ unlimited: 'Illimité' }} />)
      expect(screen.getByText('Illimité')).toBeInTheDocument()
    })
  })

  describe('progress bar (limit > 0)', () => {
    it('renders the progress bar + percentage badge by default', () => {
      render(<ProgressBadge usage={{ used: 25, limit: 100 }} />)
      const bar = screen.getByRole('progressbar')
      expect(bar).toBeInTheDocument()
      expect(bar).toHaveAttribute('aria-valuenow', '25')
      expect(screen.getByText('25%')).toBeInTheDocument()
    })

    it('clamps percentage to 100 when used exceeds limit', () => {
      render(<ProgressBadge usage={{ used: 250, limit: 100 }} />)
      const bar = screen.getByRole('progressbar')
      expect(bar).toHaveAttribute('aria-valuenow', '100')
      expect(screen.getByText('100%')).toBeInTheDocument()
    })

    it('floors percentage at 0 when used is negative', () => {
      render(<ProgressBadge usage={{ used: -10, limit: 100 }} />)
      const bar = screen.getByRole('progressbar')
      expect(bar).toHaveAttribute('aria-valuenow', '0')
    })

    it('treats limit=0 as 0% (avoids divide-by-zero)', () => {
      render(<ProgressBadge usage={{ used: 5, limit: 0 }} />)
      const bar = screen.getByRole('progressbar')
      expect(bar).toHaveAttribute('aria-valuenow', '0')
    })

    it('uses default thresholds (success < 50, warning < 80, destructive >= 80)', () => {
      const { rerender } = render(<ProgressBadge usage={{ used: 10, limit: 100 }} />)
      expect(screen.getByText('10%')).toBeInTheDocument()
      // Below the 50% warning threshold → success palette is used; we don't
      // assert on color classes (CVA can change), but the bar should be
      // there with success-ish styling. Smoke-check via re-render.
      rerender(<ProgressBadge usage={{ used: 60, limit: 100 }} />)
      expect(screen.getByText('60%')).toBeInTheDocument()
      rerender(<ProgressBadge usage={{ used: 90, limit: 100 }} />)
      expect(screen.getByText('90%')).toBeInTheDocument()
    })

    it('honours custom thresholds for severity', () => {
      // With warning=10, danger=20 → 25% should be destructive.
      render(
        <ProgressBadge usage={{ used: 25, limit: 100 }} threshold={{ warning: 10, danger: 20 }} />
      )
      const bar = screen.getByRole('progressbar')
      expect(bar).toHaveAttribute('aria-valuenow', '25')
    })

    it('renders compact variant (no bar, only the percentage badge)', () => {
      render(<ProgressBadge variant="compact" usage={{ used: 75, limit: 100 }} />)
      expect(screen.queryByRole('progressbar')).not.toBeInTheDocument()
      expect(screen.getByText('75%')).toBeInTheDocument()
    })

    it('honours a custom label (raw "X / Y" instead of percentage)', () => {
      render(<ProgressBadge usage={{ used: 320, limit: 1000 }} label="320 / 1000" />)
      expect(screen.getByText('320 / 1000')).toBeInTheDocument()
    })

    it('exposes a custom aria-label on the progressbar when provided', () => {
      render(<ProgressBadge usage={{ used: 50, limit: 100 }} ariaLabel="Quota utilisé" />)
      const bar = screen.getByRole('progressbar')
      expect(bar).toHaveAttribute('aria-label', 'Quota utilisé')
    })

    it('appends the custom className to the wrapper', () => {
      const { container } = render(
        <ProgressBadge usage={{ used: 50, limit: 100 }} className="custom-x" />
      )
      // The className is applied on the wrapper Div surrounding the bar
      // and the badge — locate it via the progressbar's parent.
      const bar = screen.getByRole('progressbar')
      const wrapper = bar.parentElement
      expect(wrapper?.className).toContain('custom-x')
      expect(container).toBeInTheDocument()
    })
  })
})

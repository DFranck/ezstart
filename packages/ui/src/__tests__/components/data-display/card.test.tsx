/**
 * Card.intent prop — semantic-color callout pattern (Mantine `color` /
 * Chakra `colorScheme`). Pin the contract for the new optional prop:
 *
 *  - `intent="none"` (default) adds ZERO classes → backward-compat for
 *    every existing Card usage in the monorepo.
 *  - Each non-`none` value adds a tinted border + soft tinted background
 *    using semantic theme tokens (warning / success / info / destructive
 *    / primary).
 *  - `intent` composes with `variant`: both sets of classes are present
 *    on the rendered card.
 *  - Children (CardHeader / CardContent / CardFooter) render normally
 *    inside an intent-tinted Card.
 */
import React from 'react'
import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'

import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
} from '../../../components/data-display/card'

function getCard(testId: string): HTMLElement {
  return screen.getByTestId(testId)
}

describe('Card.intent', () => {
  it('renders without intent classes when intent is omitted (default = "none")', () => {
    render(
      <Card data-testid="card">
        <CardContent>content</CardContent>
      </Card>
    )
    const card = getCard('card')
    // None of the semantic-color tokens should be applied.
    expect(card.className).not.toContain('border-warning')
    expect(card.className).not.toContain('border-success')
    expect(card.className).not.toContain('border-info')
    expect(card.className).not.toContain('border-destructive')
    expect(card.className).not.toContain('border-primary/40')
    expect(card.className).not.toContain('bg-warning')
    expect(card.className).not.toContain('bg-success')
    expect(card.className).not.toContain('bg-info')
    expect(card.className).not.toContain('bg-destructive')
    expect(card.className).not.toContain('bg-primary/5')
  })

  it('renders with no intent classes when intent="none" is passed explicitly', () => {
    render(
      <Card data-testid="card" intent="none">
        <CardContent>content</CardContent>
      </Card>
    )
    const card = getCard('card')
    expect(card.className).not.toContain('border-warning')
    expect(card.className).not.toContain('bg-warning')
  })

  it('applies warning intent classes', () => {
    render(
      <Card data-testid="card" intent="warning">
        <CardContent>content</CardContent>
      </Card>
    )
    const card = getCard('card')
    expect(card.className).toContain('border-warning/40')
    expect(card.className).toContain('bg-warning/5')
  })

  it('applies success intent classes', () => {
    render(
      <Card data-testid="card" intent="success">
        <CardContent>content</CardContent>
      </Card>
    )
    const card = getCard('card')
    expect(card.className).toContain('border-success/40')
    expect(card.className).toContain('bg-success/5')
  })

  it('applies info intent classes', () => {
    render(
      <Card data-testid="card" intent="info">
        <CardContent>content</CardContent>
      </Card>
    )
    const card = getCard('card')
    expect(card.className).toContain('border-info/40')
    expect(card.className).toContain('bg-info/5')
  })

  it('applies destructive intent classes', () => {
    render(
      <Card data-testid="card" intent="destructive">
        <CardContent>content</CardContent>
      </Card>
    )
    const card = getCard('card')
    expect(card.className).toContain('border-destructive/40')
    expect(card.className).toContain('bg-destructive/5')
  })

  it('applies primary intent classes', () => {
    render(
      <Card data-testid="card" intent="primary">
        <CardContent>content</CardContent>
      </Card>
    )
    const card = getCard('card')
    expect(card.className).toContain('border-primary/40')
    expect(card.className).toContain('bg-primary/5')
  })

  it('composes intent classes WITH the existing variant classes (variant=floating + intent=warning)', () => {
    render(
      <Card data-testid="card" variant="floating" intent="warning">
        <CardContent>content</CardContent>
      </Card>
    )
    const card = getCard('card')
    // variant=floating contract
    expect(card.className).toContain('backdrop-blur-sm')
    expect(card.className).toContain('shadow-lg')
    // intent=warning contract
    expect(card.className).toContain('border-warning/40')
    expect(card.className).toContain('bg-warning/5')
  })

  it('renders CardHeader / CardTitle / CardContent / CardFooter children unchanged inside an intent-tinted card', () => {
    render(
      <Card data-testid="card" intent="warning">
        <CardHeader data-testid="header">
          <CardTitle>Demo mode</CardTitle>
        </CardHeader>
        <CardContent data-testid="content">body</CardContent>
        <CardFooter data-testid="footer">footer</CardFooter>
      </Card>
    )
    expect(getCard('card').className).toContain('border-warning/40')
    expect(getCard('header')).toBeInTheDocument()
    expect(screen.getByText('Demo mode')).toBeInTheDocument()
    expect(getCard('content')).toHaveTextContent('body')
    expect(getCard('footer')).toHaveTextContent('footer')
  })

  it('respects consumer-provided className alongside intent classes', () => {
    render(
      <Card data-testid="card" intent="warning" className="overflow-hidden custom-x">
        <CardContent>content</CardContent>
      </Card>
    )
    const card = getCard('card')
    expect(card.className).toContain('border-warning/40')
    expect(card.className).toContain('overflow-hidden')
    expect(card.className).toContain('custom-x')
  })
})

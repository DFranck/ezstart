'use client'

import { Card, CardContent, Div, P, Span } from '@ezstart/ui/components'

export interface PlaceholderProps {
  /** Component name (rendered as a label) */
  name: string
  /** Reason the component can't be live-previewed. Keep it factual — describe
   *  what the component does, not why the visitor should leave. */
  reason: string
  /** Optional CTA label that points users to a related page. */
  cta?: { label: string; href?: string }
}

/**
 * Visual placeholder rendered when a component genuinely cannot be
 * live-previewed in the showcase (e.g. triggers a real OAuth redirect to a
 * third-party provider, or is mounted by a Next.js route on a specific URL).
 *
 * Devs see a factual "what this component does" message instead of a fake
 * demo or a "sign in to see it live" tease.
 */
export function Placeholder({ name, reason, cta }: PlaceholderProps) {
  return (
    <Card variant="default" className="max-w-md">
      <CardContent className="py-8 px-6 space-y-4 text-center">
        <Div className="space-y-2">
          <Span className="inline-flex items-center rounded bg-primary/10 px-2 py-0.5 text-xs font-mono text-primary">
            {name}
          </Span>
          <P className="text-sm text-muted-foreground">{reason}</P>
        </Div>
        {cta && (
          <Div className="pt-2 border-t">
            <P className="text-xs text-muted-foreground">
              {cta.href ? (
                <a
                  href={cta.href}
                  className="text-primary hover:underline"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  {cta.label} →
                </a>
              ) : (
                cta.label
              )}
            </P>
          </Div>
        )}
      </CardContent>
    </Card>
  )
}

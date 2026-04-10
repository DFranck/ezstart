'use client'

import { useMemo } from 'react'
import { Badge, Card, CardContent, CardHeader, Div, H1, H2, P, Span } from '@ezstart/ui/components'
import Link from 'next/link'
import { useParams } from 'next/navigation'
import { componentRegistry, type TokenStatus } from '../registry'

// ─── Token Lexicon Data ────────────────────────────────────

type TokenLexiconEntry = {
  status: TokenStatus
  category: 'structural' | 'visual'
  propagates: boolean
  purpose: string
  values?: string[]
  groups: Record<string, string>
}

const TOKEN_LEXICON: Record<string, TokenLexiconEntry> = {
  size: {
    status: 'standard',
    category: 'structural',
    propagates: true,
    purpose: 'Scale of elements — touch targets, padding, font size, gap',
    values: ['xs', 'sm', 'default', 'lg', 'xl'],
    groups: {
      container: 'padding, gap between children',
      interactive: 'touch target height, font-size, padding',
      text: 'font-size',
      feedback: 'element dimensions, padding, font',
      navigation: 'step/tab height, font-size',
      overlay: 'modal/dialog width',
      data: 'row height, cell padding',
    },
  },
  variant: {
    status: 'standard',
    category: 'visual',
    propagates: false,
    purpose: 'Visual style of the component — each component has its own variant set',
    groups: {
      container: 'default, outline, ghost, floating, elevated, premium, dark',
      interactive: 'default, destructive, outline, secondary, ghost, link',
      feedback: 'default, secondary, destructive, outline, success, warning, info',
      data: 'default, striped, bordered, hoverable',
      navigation: 'default, minimal, pills',
    },
  },
  density: {
    status: 'standard',
    category: 'structural',
    propagates: true,
    purpose: 'Spacing between elements — gap, padding, line-height',
    values: ['compact', 'default', 'relaxed'],
    groups: {
      container: 'gap between children, internal padding',
      interactive: 'vertical padding (height adjustment)',
      text: 'line-height (tight/normal/relaxed)',
      data: 'row height, cell padding',
    },
  },
  intent: {
    status: 'standard',
    category: 'structural',
    propagates: true,
    purpose: 'Semantic color meaning — sets the mood of a subtree',
    values: ['default', 'primary', 'success', 'warning', 'destructive', 'danger', 'info'],
    groups: {
      container: 'background + border color',
      interactive: 'background + text color (Badge variant fallback)',
      text: 'text color',
      feedback: 'background + border + text',
    },
  },
  radius: {
    status: 'standard',
    category: 'structural',
    propagates: true,
    purpose: 'Border roundness — inherited from container to children',
    values: ['none', 'sm', 'default', 'md', 'lg', 'xl', '2xl', '3xl', 'full'],
    groups: {
      container: 'border-radius',
      interactive: 'border-radius',
      feedback: 'border-radius',
    },
  },
  colorScheme: {
    status: 'standard',
    category: 'visual',
    propagates: false,
    purpose: 'Color palette for themed sections (Thread)',
    values: ['blue', 'green', 'purple', 'neutral', 'custom'],
    groups: {
      thread: 'message bubbles, sidebar, composer colors',
    },
  },
  side: {
    status: 'radix',
    category: 'visual',
    propagates: false,
    purpose: 'Radix position — which side the overlay appears on',
    values: ['top', 'right', 'bottom', 'left'],
    groups: {
      overlay: 'slide direction (Sheet), tooltip position',
    },
  },
  orientation: {
    status: 'radix',
    category: 'visual',
    propagates: false,
    purpose: 'Radix direction — horizontal or vertical layout',
    values: ['horizontal', 'vertical'],
    groups: {
      media: 'scroll direction (Carousel)',
      data: 'separator direction',
    },
  },
  layout: {
    status: 'candidate',
    category: 'structural',
    propagates: true,
    purpose: 'Container layout mode — flex direction and grid',
    values: ['inline', 'block', 'col', 'row', 'grid', 'center'],
    groups: {
      container: 'flex/grid direction and alignment',
    },
  },
  align: {
    status: 'candidate',
    category: 'structural',
    propagates: true,
    purpose: 'Content alignment within container',
    values: ['center', 'left', 'right', 'between', 'around', 'evenly'],
    groups: {
      container: 'items + justify alignment',
      text: 'text-align',
    },
  },
}

const statusBadgeVariant: Record<TokenStatus, 'default' | 'outline' | 'warning' | 'secondary'> = {
  standard: 'default',
  radix: 'outline',
  candidate: 'warning',
  specific: 'secondary',
}

// ─── Page ──────────────────────────────────────────────────

export default function TokenLexiconPage() {
  const params = useParams()
  const locale = params.locale as string

  const componentsWithToken = useMemo(() => {
    const map = new Map<string, string[]>()
    for (const [tokenName] of Object.entries(TOKEN_LEXICON)) {
      const components: string[] = []
      for (const entry of Object.values(componentRegistry)) {
        if (
          entry.tokens.some(t => t.name === tokenName) ||
          entry.providesTokens.includes(tokenName) ||
          entry.inheritsTokens.includes(tokenName)
        ) {
          components.push(entry.name)
        }
      }
      map.set(tokenName, components.sort())
    }
    return map
  }, [])

  return (
    <Div className="max-w-4xl mx-auto px-4 py-8 space-y-8">
      {/* Header */}
      <Div className="space-y-3">
        <Link
          href={`/${locale}/packages/ui/inspector`}
          className="text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          &larr; Inspector
        </Link>
        <H1 className="text-2xl font-bold">Token Lexicon</H1>
        <P className="text-muted-foreground">
          Design system token reference — purpose, propagation, and response by component group.
        </P>
      </Div>

      {/* Token cards */}
      {Object.entries(TOKEN_LEXICON).map(([name, token]) => {
        const components = componentsWithToken.get(name) || []
        return (
          <Card key={name} variant="default">
            <CardHeader className="pb-3">
              <Div className="flex items-center gap-2 flex-wrap">
                <H2 className="text-lg font-semibold font-mono">{name}</H2>
                <Badge variant={statusBadgeVariant[token.status]} size="sm">
                  {token.status}
                </Badge>
                <Badge variant="outline" size="sm">
                  {token.category}
                </Badge>
                {token.propagates && (
                  <Badge variant="success" size="sm">
                    propagates
                  </Badge>
                )}
              </Div>
            </CardHeader>
            <CardContent className="space-y-4">
              <P className="text-sm text-muted-foreground">{token.purpose}</P>

              {/* Values */}
              {token.values && token.values.length > 0 && (
                <Div className="space-y-1">
                  <P className="text-xs font-medium text-muted-foreground">Values</P>
                  <Div className="flex flex-wrap gap-1">
                    {token.values.map(v => (
                      <Badge key={v} variant="secondary" size="sm" className="font-mono">
                        {v}
                      </Badge>
                    ))}
                  </Div>
                </Div>
              )}

              {/* Groups table */}
              <Div className="space-y-1">
                <P className="text-xs font-medium text-muted-foreground">
                  Response by component group
                </P>
                <Div className="space-y-1">
                  {Object.entries(token.groups).map(([group, response]) => (
                    <Div key={group} className="flex items-baseline gap-2 text-sm">
                      <Span className="font-medium text-foreground min-w-[100px] capitalize">
                        {group}
                      </Span>
                      <Span className="text-muted-foreground">&rarr;</Span>
                      <Span className="text-muted-foreground">{response}</Span>
                    </Div>
                  ))}
                </Div>
              </Div>

              {/* Components with this token */}
              {components.length > 0 && (
                <Div className="space-y-1">
                  <P className="text-xs font-medium text-muted-foreground">
                    Components ({components.length})
                  </P>
                  <Div className="flex flex-wrap gap-1">
                    {components.map(c => (
                      <Link key={c} href={`/${locale}/packages/ui/inspector/${c}`}>
                        <Badge
                          variant="secondary"
                          size="sm"
                          className="cursor-pointer hover:bg-accent transition-colors"
                        >
                          {c}
                        </Badge>
                      </Link>
                    ))}
                  </Div>
                </Div>
              )}
            </CardContent>
          </Card>
        )
      })}
    </Div>
  )
}

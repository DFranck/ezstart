'use client'

import { type ReactNode } from 'react'
import { Badge, Button, Card, CardContent, Div, Input, P, Span } from '@ezstart/ui/components'

type ChainItem = {
  name: string
  level: 'base' | 'composed' | 'complex'
  tokens: string[]
}

type InspectorPreviewProps = {
  chain: ChainItem[]
  tokens: Record<string, string>
}

const LEVEL_COLORS: Record<string, string> = {
  complex: 'border-l-purple-500',
  composed: 'border-l-blue-500',
  base: 'border-l-green-500',
}

const LEVEL_BADGE_VARIANT: Record<string, 'purple' | 'info' | 'success'> = {
  complex: 'purple',
  composed: 'info',
  base: 'success',
}

function renderBasePreview(name: string, tokens: Record<string, string>) {
  const size = tokens.size as 'sm' | 'default' | 'lg' | undefined
  const variant = tokens.variant as 'default' | 'outline' | 'ghost' | 'destructive' | undefined

  switch (name) {
    case 'Button':
      return (
        <Button size={size} variant={variant}>
          Sample Button
        </Button>
      )
    case 'Input':
      return <Input placeholder="Sample input..." />
    case 'Card':
      return (
        <Card
          variant={variant === 'ghost' ? 'ghost' : variant === 'outline' ? 'outline' : 'default'}
        >
          <CardContent>
            <P>Sample card content</P>
          </CardContent>
        </Card>
      )
    case 'Badge':
      return (
        <Badge
          variant={
            variant === 'ghost'
              ? 'secondary'
              : variant === 'destructive'
                ? 'destructive'
                : 'default'
          }
        >
          Sample Badge
        </Badge>
      )
    default:
      return (
        <Div className="p-4 bg-muted rounded-md">
          <P className="text-muted-foreground">{name} preview</P>
        </Div>
      )
  }
}

function renderChain(chain: ChainItem[], tokens: Record<string, string>, depth: number): ReactNode {
  if (chain.length === 0) return null

  const [current, ...rest] = chain
  if (!current) return null

  const isBase = rest.length === 0
  const borderColor = LEVEL_COLORS[current.level] ?? 'border-l-muted'
  const badgeVariant = LEVEL_BADGE_VARIANT[current.level] ?? 'secondary'

  return (
    <Div
      className={`border-l-4 ${borderColor} rounded-r-lg bg-card/50 p-4 space-y-3`}
      style={{ marginLeft: depth > 0 ? 16 : 0 }}
    >
      {/* Component header */}
      <Div className="flex items-center gap-2 flex-wrap">
        <Badge variant={badgeVariant} size="sm">
          {current.level}
        </Badge>
        <Span className="font-semibold text-foreground">{current.name}</Span>
      </Div>

      {/* Token info */}
      {current.tokens.length > 0 && (
        <Div className="flex flex-wrap gap-1.5">
          {current.tokens.map(token => {
            const action = isBase ? 'applies' : 'drills'
            return (
              <Badge key={token} variant="outline" size="sm">
                <Span className={isBase ? 'text-success' : 'text-muted-foreground'}>{action}</Span>{' '}
                <Span className="font-mono">{token}</Span>
                {tokens[token] && <Span className="text-primary ml-1">= {tokens[token]}</Span>}
              </Badge>
            )
          })}
        </Div>
      )}

      {/* Nested children or base preview */}
      {isBase ? (
        <Div className="mt-3 p-4 bg-background rounded-lg border border-border">
          <P className="text-xs text-muted-foreground mb-2">Rendered output:</P>
          {renderBasePreview(current.name, tokens)}
        </Div>
      ) : (
        renderChain(rest, tokens, depth + 1)
      )}
    </Div>
  )
}

export function InspectorPreview({ chain, tokens }: InspectorPreviewProps) {
  if (chain.length === 0) {
    return (
      <Div className="flex items-center justify-center p-8">
        <P className="text-muted-foreground">Select a component chain to inspect</P>
      </Div>
    )
  }

  return <Div className="space-y-2">{renderChain(chain, tokens, 0)}</Div>
}

export type { ChainItem, InspectorPreviewProps }

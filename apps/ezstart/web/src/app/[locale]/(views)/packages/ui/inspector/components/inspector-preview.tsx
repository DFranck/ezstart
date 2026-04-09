'use client'

import { type ReactNode } from 'react'
import { Badge, Button, Card, CardContent, Div, Input, P, Span } from '@ezstart/ui/components'
import { type TokenInfo, getTokenNames, getStructuralTokens, getVisualTokens } from '../registry'

type ChainItem = {
  name: string
  level: 'base' | 'composed' | 'complex'
  tokens: TokenInfo[]
}

type InspectorPreviewProps = {
  chain: ChainItem[]
  tokens: Record<string, string>
}

type CompatibilityResult = {
  flows: string[]
  lost: string[]
  uncontrollable: string[]
  localVisual: string[]
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

function computeCompatibility(parent: ChainItem, child: ChainItem): CompatibilityResult {
  const parentStructural = getStructuralTokens(parent.tokens)
  const childStructural = getStructuralTokens(child.tokens)
  const parentStructuralNames = new Set(parentStructural.map(t => t.name))
  const childStructuralNames = new Set(childStructural.map(t => t.name))

  // Only structural tokens participate in propagation compatibility
  const flows = parentStructural.filter(t => childStructuralNames.has(t.name)).map(t => t.name)
  const lost = parentStructural.filter(t => !childStructuralNames.has(t.name)).map(t => t.name)
  const uncontrollable = childStructural
    .filter(t => !parentStructuralNames.has(t.name))
    .map(t => t.name)

  // Visual tokens are always local — collect unique visual token names across both
  const allVisualNames = new Set([
    ...getVisualTokens(parent.tokens).map(t => t.name),
    ...getVisualTokens(child.tokens).map(t => t.name),
  ])
  const localVisual = [...allVisualNames]

  return { flows, lost, uncontrollable, localVisual }
}

function CompatibilityBadges({ parent, child }: { parent: ChainItem; child: ChainItem }) {
  const { flows, lost, uncontrollable, localVisual } = computeCompatibility(parent, child)

  if (
    flows.length === 0 &&
    lost.length === 0 &&
    uncontrollable.length === 0 &&
    localVisual.length === 0
  ) {
    return null
  }

  return (
    <Div className="py-2 px-3 space-y-1.5 bg-muted/30 rounded-md border border-border/50">
      <P className="text-xs font-medium text-muted-foreground">
        {parent.name} &rarr; {child.name}
      </P>
      <Div className="flex flex-wrap gap-1.5">
        {flows.map(token => (
          <Badge key={`flow-${token}`} variant="success" size="sm">
            <Span className="font-mono">{token}</Span>
            <Span className="ml-1">flows</Span>
          </Badge>
        ))}
        {lost.map(token => (
          <Badge key={`lost-${token}`} variant="warning" size="sm">
            <Span className="font-mono">{token}</Span>
            <Span className="ml-1">not drilled — child doesn&apos;t accept</Span>
          </Badge>
        ))}
        {uncontrollable.map(token => (
          <Badge key={`unctl-${token}`} variant="destructive" size="sm">
            <Span className="font-mono">{token}</Span>
            <Span className="ml-1">uncontrollable — parent doesn&apos;t drill</Span>
          </Badge>
        ))}
        {localVisual.map(token => (
          <Badge key={`visual-${token}`} variant="secondary" size="sm">
            <Span className="font-mono">{token}</Span>
            <Span className="ml-1 text-muted-foreground">local only — does not propagate</Span>
          </Badge>
        ))}
      </Div>
    </Div>
  )
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
  const nextItem = rest[0]

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
          {current.tokens.map(tokenInfo => {
            const isStructural = tokenInfo.category === 'structural'
            const action = isBase ? 'applies' : isStructural ? 'drills' : 'local'
            return (
              <Badge
                key={tokenInfo.name}
                variant={isStructural ? 'outline' : 'secondary'}
                size="sm"
              >
                <Span
                  className={
                    isBase
                      ? 'text-success'
                      : isStructural
                        ? 'text-muted-foreground'
                        : 'text-muted-foreground'
                  }
                >
                  {action}
                </Span>{' '}
                <Span className="font-mono">{tokenInfo.name}</Span>
                {tokens[tokenInfo.name] && (
                  <Span className="text-primary ml-1">= {tokens[tokenInfo.name]}</Span>
                )}
              </Badge>
            )
          })}
        </Div>
      )}

      {/* Compatibility badges between this component and next */}
      {nextItem && <CompatibilityBadges parent={current} child={nextItem} />}

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

export { computeCompatibility }
export type { ChainItem, InspectorPreviewProps, CompatibilityResult }

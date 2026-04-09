'use client'

import { Badge, Card, CardContent, Div, P, Span } from '@ezstart/ui/components'

type ChainItem = {
  name: string
  level: 'base' | 'composed' | 'complex'
  tokens: string[]
}

type TokenFlowProps = {
  chain: ChainItem[]
  tokens: Record<string, string>
}

const LEVEL_BADGE_VARIANT: Record<string, 'purple' | 'info' | 'success'> = {
  complex: 'purple',
  composed: 'info',
  base: 'success',
}

export function TokenFlow({ chain, tokens }: TokenFlowProps) {
  if (chain.length === 0) {
    return (
      <Div className="p-4">
        <P className="text-muted-foreground">No chain selected</P>
      </Div>
    )
  }

  // Collect all unique tokens across the chain
  const allTokens = [...new Set(chain.flatMap(item => item.tokens))]

  return (
    <Card variant="ghost" className="border-0">
      <CardContent className="p-0 space-y-4">
        {allTokens.map(tokenName => {
          const tokenValue = tokens[tokenName]
          const involvedItems = chain.filter(item => item.tokens.includes(tokenName))

          return (
            <Div key={tokenName} className="space-y-1">
              {/* Token header */}
              <Div className="flex items-center gap-2">
                <Badge variant="outline" size="sm">
                  <Span className="font-mono">{tokenName}</Span>
                </Badge>
                {tokenValue && (
                  <Span className="text-sm text-primary font-medium">= {tokenValue}</Span>
                )}
              </Div>

              {/* Flow steps */}
              <Div className="ml-2 space-y-0">
                {involvedItems.map((item, index) => {
                  const isLast = index === involvedItems.length - 1
                  const badgeVariant = LEVEL_BADGE_VARIANT[item.level] ?? 'secondary'

                  return (
                    <Div key={item.name} className="flex items-start gap-2 py-1">
                      {/* Arrow or check */}
                      <Span
                        className={`text-sm min-w-[20px] ${isLast ? 'text-success' : 'text-muted-foreground'}`}
                      >
                        {isLast ? '\u2705' : '\u2193'}
                      </Span>

                      {/* Component info */}
                      <Div className="flex items-center gap-2 flex-wrap">
                        <Badge variant={badgeVariant} size="sm">
                          {item.level}
                        </Badge>
                        <Span className="font-semibold text-sm text-foreground">{item.name}</Span>
                        <Span className="text-xs text-muted-foreground">
                          {isLast
                            ? `applies: renders with ${tokenName}="${tokenValue ?? 'default'}"`
                            : `receives ${tokenName}="${tokenValue ?? 'default'}"`}
                        </Span>
                      </Div>
                    </Div>
                  )
                })}

                {/* Summary */}
                {involvedItems.length > 1 && (
                  <Div className="ml-[28px] mt-1">
                    <P className="text-xs text-muted-foreground italic">
                      Drilled through {involvedItems.length - 1} component
                      {involvedItems.length > 2 ? 's' : ''} before applying
                    </P>
                  </Div>
                )}
              </Div>
            </Div>
          )
        })}
      </CardContent>
    </Card>
  )
}

export type { ChainItem, TokenFlowProps }

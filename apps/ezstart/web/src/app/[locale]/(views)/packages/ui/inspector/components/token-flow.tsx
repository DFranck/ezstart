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

type TokenStatus = 'flows' | 'lost' | 'has' | 'missing'

function getTokenStatusPerStep(
  chain: ChainItem[],
  tokenName: string
): { item: ChainItem; status: TokenStatus }[] {
  return chain.map((item, index) => {
    const hasToken = item.tokens.includes(tokenName)

    if (index === 0) {
      return { item, status: hasToken ? ('has' as const) : ('missing' as const) }
    }

    const prevItem = chain[index - 1]
    const prevHas = prevItem ? prevItem.tokens.includes(tokenName) : false

    if (prevHas && hasToken) return { item, status: 'flows' as const }
    if (prevHas && !hasToken) return { item, status: 'lost' as const }
    if (!prevHas && hasToken) return { item, status: 'has' as const }
    return { item, status: 'missing' as const }
  })
}

function StatusIcon({ status }: { status: TokenStatus }) {
  switch (status) {
    case 'flows':
      return <Span className="text-success min-w-[20px]">{'\u2705'}</Span>
    case 'has':
      return <Span className="text-success min-w-[20px]">{'\u2705'}</Span>
    case 'lost':
      return <Span className="text-warning min-w-[20px]">{'\u26A0'}</Span>
    case 'missing':
      return <Span className="text-muted-foreground min-w-[20px]">{'\u2014'}</Span>
  }
}

function statusLabel(status: TokenStatus, tokenName: string, isFirst: boolean): string {
  switch (status) {
    case 'flows':
      return `receives ${tokenName}`
    case 'has':
      return isFirst ? `owns ${tokenName}` : `has ${tokenName} but can't receive from parent`
    case 'lost':
      return `doesn't accept ${tokenName} — not drilled (may be normal)`
    case 'missing':
      return `no ${tokenName}`
  }
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
          const steps = getTokenStatusPerStep(chain, tokenName)

          // Determine overall health
          const hasError = steps.some(s => s.status === 'has' && steps.indexOf(s) > 0) // uncontrollable = real error
          const hasWarning = steps.some(s => s.status === 'lost') // not drilled = warning only

          return (
            <Div key={tokenName} className="space-y-1">
              {/* Token header */}
              <Div className="flex items-center gap-2">
                <Badge
                  variant={hasError ? 'destructive' : hasWarning ? 'warning' : 'success'}
                  size="sm"
                >
                  <Span className="font-mono">{tokenName}</Span>
                </Badge>
                {tokenValue && (
                  <Span className="text-sm text-primary font-medium">= {tokenValue}</Span>
                )}
                {hasError && (
                  <Span className="text-xs text-destructive">
                    uncontrollable — child can&apos;t receive from parent
                  </Span>
                )}
                {!hasError && hasWarning && (
                  <Span className="text-xs text-warning">not drilled — may be intentional</Span>
                )}
              </Div>

              {/* Flow steps */}
              <Div className="ml-2 space-y-0">
                {steps.map((step, index) => {
                  const badgeVariant = LEVEL_BADGE_VARIANT[step.item.level] ?? 'secondary'
                  const isFirst = index === 0
                  const label = statusLabel(step.status, tokenName, isFirst)

                  return (
                    <Div key={step.item.name} className="flex items-start gap-2 py-1">
                      <StatusIcon status={step.status} />

                      <Div className="flex items-center gap-2 flex-wrap">
                        <Badge variant={badgeVariant} size="sm">
                          {step.item.level}
                        </Badge>
                        <Span className="font-semibold text-sm text-foreground">
                          {step.item.name}
                        </Span>
                        <Span
                          className={`text-xs ${
                            step.status === 'lost'
                              ? 'text-warning'
                              : step.status === 'has' && !isFirst
                                ? 'text-destructive'
                                : 'text-muted-foreground'
                          }`}
                        >
                          {label}
                        </Span>
                      </Div>

                      {/* Arrow between steps */}
                      {index < steps.length - 1 && (
                        <Span className="text-muted-foreground ml-auto text-xs">{'\u2193'}</Span>
                      )}
                    </Div>
                  )
                })}
              </Div>
            </Div>
          )
        })}
      </CardContent>
    </Card>
  )
}

export type { ChainItem, TokenFlowProps }

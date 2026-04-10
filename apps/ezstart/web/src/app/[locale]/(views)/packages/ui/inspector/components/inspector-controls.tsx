'use client'

import { Button, Div, Span } from '@ezstart/ui/components'
import { type TokenInfo } from '../registry'

type InspectorControlsProps = {
  tokens: Record<string, string>
  availableTokens: TokenInfo[]
  onChange: (tokenName: string, value: string) => void
}

function TokenControlRow({
  token,
  currentValue,
  onChange,
}: {
  token: TokenInfo
  currentValue: string
  onChange: (tokenName: string, value: string) => void
}) {
  const options = token.values
  if (!options || options.length === 0) return null

  return (
    <Div className="flex items-center gap-2 flex-wrap">
      <Span className="text-xs font-medium text-muted-foreground capitalize min-w-[60px]">
        {token.name}
      </Span>
      <Div className="flex flex-wrap gap-1">
        {options.map(option => (
          <Button
            key={option}
            variant={currentValue === option ? 'default' : 'outline'}
            size="sm"
            onClick={() => onChange(token.name, option)}
            className="h-6 px-2 text-xs"
          >
            {option}
          </Button>
        ))}
      </Div>
    </Div>
  )
}

export function InspectorControls({ tokens, availableTokens, onChange }: InspectorControlsProps) {
  const structuralTokens = availableTokens.filter(t => t.category === 'structural')
  const visualTokens = availableTokens.filter(t => t.category === 'visual')

  const hasStructural = structuralTokens.some(t => t.values && t.values.length > 0)
  const hasVisual = visualTokens.some(t => t.values && t.values.length > 0)

  return (
    <Div className="space-y-2">
      {hasStructural && (
        <Div className="space-y-1.5">
          <Span className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium">
            Structural (auto-drill)
          </Span>
          {structuralTokens.map(tokenInfo => (
            <TokenControlRow
              key={tokenInfo.name}
              token={tokenInfo}
              currentValue={tokens[tokenInfo.name] ?? 'default'}
              onChange={onChange}
            />
          ))}
        </Div>
      )}

      {hasStructural && hasVisual && <Div className="border-t border-border/50" />}

      {hasVisual && (
        <Div className="space-y-1.5">
          <Span className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium">
            Visual (per-component)
          </Span>
          {visualTokens.map(tokenInfo => (
            <TokenControlRow
              key={tokenInfo.name}
              token={tokenInfo}
              currentValue={tokens[tokenInfo.name] ?? 'default'}
              onChange={onChange}
            />
          ))}
        </Div>
      )}
    </Div>
  )
}

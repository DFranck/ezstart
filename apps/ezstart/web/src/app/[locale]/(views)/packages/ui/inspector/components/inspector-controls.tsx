'use client'

import { Button, Card, CardContent, Div, Label, P } from '@ezstart/ui/components'
import { type TokenInfo } from '../registry'

type InspectorControlsProps = {
  tokens: Record<string, string>
  availableTokens: TokenInfo[]
  onChange: (tokenName: string, value: string) => void
}

function TokenControlGroup({
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
    <Card variant="ghost" className="border-0 p-0">
      <CardContent className="p-0 space-y-2">
        <Label className="text-sm font-medium capitalize text-muted-foreground">{token.name}</Label>
        <Div className="flex flex-wrap gap-1.5">
          {options.map(option => (
            <Button
              key={option}
              variant={currentValue === option ? 'default' : 'outline'}
              size="sm"
              onClick={() => onChange(token.name, option)}
              className="min-w-[70px]"
            >
              {option}
            </Button>
          ))}
        </Div>
      </CardContent>
    </Card>
  )
}

export function InspectorControls({ tokens, availableTokens, onChange }: InspectorControlsProps) {
  const structuralTokens = availableTokens.filter(t => t.category === 'structural')
  const visualTokens = availableTokens.filter(t => t.category === 'visual')

  const hasStructural = structuralTokens.some(t => t.values && t.values.length > 0)
  const hasVisual = visualTokens.some(t => t.values && t.values.length > 0)

  return (
    <Div className="space-y-4">
      {/* Structural tokens section */}
      {hasStructural && (
        <Div className="space-y-3">
          <P className="text-xs uppercase tracking-wider text-muted-foreground font-medium">
            Structural Tokens (auto-drill to children)
          </P>
          {structuralTokens.map(tokenInfo => (
            <TokenControlGroup
              key={tokenInfo.name}
              token={tokenInfo}
              currentValue={tokens[tokenInfo.name] ?? 'default'}
              onChange={onChange}
            />
          ))}
        </Div>
      )}

      {/* Separator between sections */}
      {hasStructural && hasVisual && <Div className="border-t border-border" />}

      {/* Visual tokens section */}
      {hasVisual && (
        <Div className="space-y-3">
          <P className="text-xs uppercase tracking-wider text-muted-foreground font-medium">
            Visual Tokens (per-component)
          </P>
          {visualTokens.map(tokenInfo => (
            <TokenControlGroup
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

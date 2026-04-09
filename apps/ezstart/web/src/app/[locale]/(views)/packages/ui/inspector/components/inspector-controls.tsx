'use client'

import { Button, Card, CardContent, Div, Label, P } from '@ezstart/ui/components'
import { type TokenInfo } from '../registry'

type InspectorControlsProps = {
  tokens: Record<string, string>
  availableTokens: TokenInfo[]
  onChange: (tokenName: string, value: string) => void
}

const TOKEN_OPTIONS: Record<string, string[]> = {
  density: ['compact', 'default', 'relaxed'],
  size: ['sm', 'default', 'lg'],
  variant: ['default', 'outline', 'ghost', 'destructive'],
  colorScheme: ['blue', 'green', 'purple', 'neutral'],
}

function TokenControlGroup({
  tokenName,
  currentValue,
  onChange,
}: {
  tokenName: string
  currentValue: string
  onChange: (tokenName: string, value: string) => void
}) {
  const options = TOKEN_OPTIONS[tokenName]
  if (!options) return null

  return (
    <Card variant="ghost" className="border-0 p-0">
      <CardContent className="p-0 space-y-2">
        <Label className="text-sm font-medium capitalize text-muted-foreground">{tokenName}</Label>
        <Div className="flex flex-wrap gap-1.5">
          {options.map(option => (
            <Button
              key={option}
              variant={currentValue === option ? 'default' : 'outline'}
              size="sm"
              onClick={() => onChange(tokenName, option)}
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

  const hasStructural = structuralTokens.some(t => TOKEN_OPTIONS[t.name])
  const hasVisual = visualTokens.some(t => TOKEN_OPTIONS[t.name])

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
              tokenName={tokenInfo.name}
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
              tokenName={tokenInfo.name}
              currentValue={tokens[tokenInfo.name] ?? 'default'}
              onChange={onChange}
            />
          ))}
        </Div>
      )}
    </Div>
  )
}

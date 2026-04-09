'use client'

import { Button, Card, CardContent, Div, Label } from '@ezstart/ui/components'

type InspectorControlsProps = {
  tokens: Record<string, string>
  availableTokens: string[]
  onChange: (tokenName: string, value: string) => void
}

const TOKEN_OPTIONS: Record<string, string[]> = {
  density: ['compact', 'default', 'relaxed'],
  size: ['sm', 'default', 'lg'],
  variant: ['default', 'outline', 'ghost', 'destructive'],
  colorScheme: ['blue', 'green', 'purple', 'neutral'],
}

export function InspectorControls({ tokens, availableTokens, onChange }: InspectorControlsProps) {
  return (
    <Div className="space-y-4">
      {availableTokens.map(tokenName => {
        const options = TOKEN_OPTIONS[tokenName]
        if (!options) return null

        const currentValue = tokens[tokenName] ?? options[0]

        return (
          <Card key={tokenName} variant="ghost" className="border-0 p-0">
            <CardContent className="p-0 space-y-2">
              <Label className="text-sm font-medium capitalize text-muted-foreground">
                {tokenName}
              </Label>
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
      })}
    </Div>
  )
}

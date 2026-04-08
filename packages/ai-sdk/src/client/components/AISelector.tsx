/**
 * AISelector Component
 * Dropdown to select AI provider
 */
'use client'

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Badge,
  Icon,
  Div,
  Span,
  P,
  KnownIconName,
} from '@ezstart/ui/components'

interface AIProvider {
  id: string
  name: string
  type: string
  enabled: boolean
  capabilities: { vision?: boolean; audio?: boolean } | undefined
}

interface AISelectorProps {
  value: string
  onChange: (providerId: string) => void
  providers: AIProvider[]
  showCapabilities?: boolean
}

export function AISelector({
  value,
  onChange,
  providers,
  showCapabilities = true,
}: AISelectorProps) {
  if (providers.length === 0) {
    return (
      <P variant="description" size="sm">
        No providers available
      </P>
    )
  }

  return (
    <Select value={value} onValueChange={onChange}>
      <SelectTrigger>
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        {providers.map(provider => (
          <SelectItem key={provider.id} value={provider.id}>
            <Div layout="row">
              <Icon name={getProviderIcon(provider.type) as KnownIconName} size={16} />
              <Span>{provider.name}</Span>

              {showCapabilities && (
                <Div layout="row">
                  {provider.capabilities?.vision && (
                    <Badge variant="secondary" size="sm">
                      Vision
                    </Badge>
                  )}
                  {provider.capabilities?.audio && (
                    <Badge variant="secondary" size="sm">
                      Audio
                    </Badge>
                  )}
                </Div>
              )}
            </Div>
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  )
}

function getProviderIcon(type: string) {
  switch (type) {
    case 'openai':
      return 'simple-icons:openai'
    case 'gemini':
      return 'simple-icons:google'
    case 'anthropic':
      return 'simple-icons:anthropic'
    default:
      return 'lucide:Bot'
  }
}

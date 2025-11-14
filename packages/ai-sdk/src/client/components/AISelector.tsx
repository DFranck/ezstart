/**
 * AISelector Component
 * Dropdown to select AI provider
 */
'use client'

import { Select, SelectItem, Badge, Icon } from '@ezstart/ui/components'

interface AIProvider {
  id: string
  name: string
  type: string
  enabled: boolean
  capabilities: any
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
    return <div className="text-sm text-muted-foreground">No providers available</div>
  }

  return (
    <Select value={value} onValueChange={onChange}>
      {providers.map(provider => (
        <SelectItem key={provider.id} value={provider.id}>
          <div className="flex items-center gap-2">
            <Icon name={getProviderIcon(provider.type) as any} size={16} />
            <span>{provider.name}</span>

            {showCapabilities && (
              <div className="flex gap-1 ml-auto">
                {provider.capabilities?.vision && (
                  <Badge variant="secondary" className="text-xs">
                    Vision
                  </Badge>
                )}
                {provider.capabilities?.audio && (
                  <Badge variant="secondary" className="text-xs">
                    Audio
                  </Badge>
                )}
              </div>
            )}
          </div>
        </SelectItem>
      ))}
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

'use client'

import { Button } from '@ezstart/ui/components'
import { CVConfig } from '../types'

interface TemplateSelectorProps {
  selected: CVConfig['template']
  onSelect: (template: CVConfig['template']) => void
}

const TEMPLATES: Array<{ id: CVConfig['template']; name: string; description: string }> = [
  { id: 'professional', name: 'Professional', description: 'Classic corporate layout' },
  { id: 'modern', name: 'Modern', description: 'Contemporary design with sidebar' },
  { id: 'creative', name: 'Creative', description: 'Unique artistic presentation' },
  { id: 'academic', name: 'Academic', description: 'Research-focused format' },
]

export function TemplateSelector({ selected, onSelect }: TemplateSelectorProps) {
  return (
    <Div className="space-y-2">
      <P className="text-sm font-medium">Template</P>
      <Div className="grid grid-cols-2 gap-2">
        {TEMPLATES.map(template => (
          <Button
            key={template.id}
            variant={selected === template.id ? 'default' : 'outline'}
            size="sm"
            onClick={() => onSelect(template.id)}
            className="flex-col h-auto py-3"
            aria-pressed={selected === template.id}
          >
            <Span className="font-medium">{template.name}</Span>
            <Span className="text-xs opacity-80">{template.description}</Span>
          </Button>
        ))}
      </Div>
    </Div>
  )
}

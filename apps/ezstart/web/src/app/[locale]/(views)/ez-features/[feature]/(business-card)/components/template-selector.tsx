'use client';

import { Button, Div } from '@ezstart/ui/components';
import { BusinessCardConfig } from '../types';

interface TemplateSelectorProps {
  selected: BusinessCardConfig['template'];
  onSelect: (template: BusinessCardConfig['template']) => void;
}

const TEMPLATES: Array<{ id: BusinessCardConfig['template']; name: string; description: string }> = [
  { id: 'classic', name: 'Classic', description: 'Traditional professional layout' },
  { id: 'modern', name: 'Modern', description: 'Contemporary design with bold accents' },
  { id: 'minimal', name: 'Minimal', description: 'Clean and simple aesthetic' },
  { id: 'creative', name: 'Creative', description: 'Unique artistic layout' },
];

export function TemplateSelector({ selected, onSelect }: TemplateSelectorProps) {
  return (
    <div className='space-y-2'>
      <p className='text-sm font-medium'>Template</p>
      <div className='grid grid-cols-2 gap-2'>
        {TEMPLATES.map((template) => (
          <Button
            key={template.id}
            variant={selected === template.id ? 'default' : 'outline'}
            size='sm'
            onClick={() => onSelect(template.id)}
            className='flex-col h-auto py-3'
            aria-pressed={selected === template.id}
          >
            <span className='font-medium'>{template.name}</span>
            <span className='text-xs opacity-80'>{template.description}</span>
          </Button>
        ))}
      </div>
    </div>
  );
}

'use client'

import {
  Div,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Label,
} from '@ezstart/ui/components'

type PlaygroundVariantSelectsProps = {
  meta: Record<string, string[]>
  selected: Record<string, string>
  onChange: (prop: string, value: string) => void
  columns?: number
}

export function PlaygroundVariantSelects({
  meta,
  selected,
  onChange,
}: PlaygroundVariantSelectsProps) {
  return (
    <Div className="space-y-4">
      {Object.entries(meta).map(([variantName, values]) => (
        <Div key={variantName} className="space-y-2">
          <Label className="text-sm font-medium capitalize">{variantName}</Label>
          <Select
            value={selected[variantName]}
            onValueChange={(v: string) => onChange(variantName, v)}
          >
            <SelectTrigger className="w-full">
              <SelectValue placeholder={`Select ${variantName}`} />
            </SelectTrigger>
            <SelectContent>
              {values.map(v => (
                <SelectItem key={v} value={v}>
                  {v}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </Div>
      ))}
    </Div>
  )
}

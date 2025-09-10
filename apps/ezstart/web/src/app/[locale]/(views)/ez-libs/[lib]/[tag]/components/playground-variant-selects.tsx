'use client';

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Label,
} from '@ezstart/ui/components';

type PlaygroundVariantSelectsProps = {
  meta: Record<string, string[]>;
  selected: Record<string, string>;
  onChange: (prop: string, value: string) => void;
  columns?: number;
};

export function PlaygroundVariantSelects({
  meta,
  selected,
  onChange,
  columns = 3,
}: PlaygroundVariantSelectsProps) {
  return (
    <div className={`grid gap-3 md:grid-cols-${columns}`}>
      {Object.entries(meta).map(([variantName, values]) => (
        <div key={variantName} className='flex flex-col gap-1'>
          <Label className='text-xs font-medium text-neutral-400'>
            {variantName}
          </Label>
          <Select
            value={selected[variantName]}
            onValueChange={(v: string) => onChange(variantName, v)}
          >
            <SelectTrigger className='w-full'>
              <SelectValue placeholder={variantName} />
            </SelectTrigger>
            <SelectContent>
              {values.map((v) => (
                <SelectItem key={v} value={v}>
                  {v}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      ))}
    </div>
  );
}

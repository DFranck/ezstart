'use client';

import {
  H6,
  P,
  pVariantsMeta,
  Section,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@ezstart/ui/components';
import { useState } from 'react';
import { buildFakeTag } from './build-fake-tag';

export default function PPlayground() {
  // State des variants sélectionnés
  const [selected, setSelected] = useState(() => {
    const out: Record<string, string> = {};
    Object.entries(pVariantsMeta).forEach(([variantName, values]) => {
      // Pick 'default' if available, otherwise first
      out[variantName] = values.includes('default')
        ? 'default'
        : values[0] || '';
    });
    return out;
  });

  const handleChange = (prop: string, value: string) => {
    setSelected((prev) => ({ ...prev, [prop]: value }));
  };

  const content = "I'm a text";
  const fakeTagCode = buildFakeTag('p', selected, undefined, content);
  const fakeAliasCode = buildFakeTag('p', selected, 'P', content);

  return (
    <Section variant={'outline'}>
      {/* Preview */}
      <P {...selected}>{content}</P>
      {/* Usage et Alias preview */}
      <div className='mb-3'>
        <div className='grid grid-cols-1 gap-2'>
          <div>
            <H6 className='mb-1'>Usage</H6>
            <pre className='bg-muted rounded p-2 text-xs overflow-x-auto'>
              <code>{fakeTagCode}</code>
            </pre>
          </div>
          <div>
            <H6 className='mb-1'>Alias</H6>
            <pre className='bg-muted rounded p-2 text-xs overflow-x-auto'>
              <code>{fakeAliasCode}</code>
            </pre>
          </div>
        </div>
      </div>
      {/* Select Controls */}
      <div className='grid gap-3 md:grid-cols-3'>
        {Object.entries(pVariantsMeta).map(([variantName, values]) => (
          <div key={variantName} className='flex flex-col gap-1'>
            <label className='text-xs font-medium text-neutral-400'>
              {variantName}
            </label>
            <Select
              value={selected[variantName]}
              onValueChange={(v: string) => handleChange(variantName, v)}
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
    </Section>
  );
}

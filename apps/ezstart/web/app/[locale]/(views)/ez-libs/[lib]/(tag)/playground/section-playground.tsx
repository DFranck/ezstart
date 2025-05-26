'use client';

import {
  Button,
  H3,
  H4,
  P,
  Section,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  tagVariantsMeta,
} from '@ezstart/ui/components';
import { useState } from 'react';
import PlaygroundCode from '../components/playground-code';
import { buildFakeTag } from '../utils/build-fake-tag';

const sectionMeta = tagVariantsMeta['section'];

export default function SectionPlayground() {
  // Set default selection to defaults
  const [selected, setSelected] = useState(() => {
    const out: Record<string, string> = {};
    Object.entries(sectionMeta).forEach(([variantName, values]) => {
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

  const content = (
    <>
      <H3>I'm a section</H3>
      <H4>Play with me</H4>
      <P>You can test my variants here and check my responsiveusage.</P>
      <Button>Fake Action</Button>
    </>
  );

  // Génération du code usage
  const fakeTagCode = buildFakeTag('section', selected, undefined, '...');
  const fakeAliasCode = buildFakeTag('section', selected, 'Section', '...');

  return (
    <>
      <Section {...selected} className='my-8'>
        {content}
      </Section>
      <Section>
        <div className='container mx-auto flex flex-col border border-border max-w-4xl px-4 md:px-10 py-4 md:py-10 gap-2 md:gap-4'>
          <PlaygroundCode
            fakeTagCode={fakeTagCode}
            fakeAliasCode={fakeAliasCode}
          />
          {/* Selects pour variantes */}
          <div className='grid gap-3 md:grid-cols-3'>
            {Object.entries(sectionMeta).map(([variantName, values]) => (
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
        </div>
      </Section>
    </>
  );
}

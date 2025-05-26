'use client';

import {
  Button,
  H3,
  H4,
  P,
  Section,
  tagVariantsMeta,
} from '@ezstart/ui/components';
import { useState } from 'react';
import PlaygroundCodeView from '../components/playground-code-view';
import { PlaygroundVariantSelects } from '../components/playground-variant-selects';
import { buildFakeTag } from '../utils/build-fake-tag';

const sectionMeta = tagVariantsMeta['section'];

export default function SectionPlayground() {
  const [selected, setSelected] = useState(() => {
    const out: Record<string, string> = {};
    Object.entries(sectionMeta).forEach(([variantName, values]) => {
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

  const fakeTagCode = buildFakeTag('section', selected, undefined, '...');
  const fakeAliasCode = buildFakeTag('section', selected, 'Section', '...');

  return (
    <>
      <Section {...selected} className='my-8'>
        {content}
      </Section>
      <Section>
        <div className='container mx-auto flex flex-col border border-border max-w-4xl px-4 md:px-10 py-4 md:py-10 gap-2 md:gap-4'>
          <PlaygroundCodeView
            fakeTagCode={fakeTagCode}
            fakeAliasCode={fakeAliasCode}
          />
          {/* Selects pour variantes */}
          <PlaygroundVariantSelects
            meta={sectionMeta}
            selected={selected}
            onChange={handleChange}
          />
        </div>
      </Section>
    </>
  );
}

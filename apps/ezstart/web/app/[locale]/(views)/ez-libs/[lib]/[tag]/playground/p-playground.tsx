'use client';

import {
  Div,
  Input,
  Label,
  P,
  pVariantsMeta,
  Section,
  Span,
} from '@ezstart/ui/components';
import { useState } from 'react';
import PlaygroundCodeView from '../components/playground-code-view';
import { PlaygroundVariantSelects } from '../components/playground-variant-selects';
import { buildFakeTag } from '../utils/build-fake-tag';
import { generateLorem } from '../utils/generate-lorem';

export default function PPlayground() {
  const [selected, setSelected] = useState(() => {
    const out: Record<string, string> = {};
    Object.entries(pVariantsMeta).forEach(([variantName, values]) => {
      out[variantName] = values.includes('default')
        ? 'default'
        : values[0] || '';
    });
    return out;
  });

  const handleChange = (prop: string, value: string) => {
    setSelected((prev) => ({ ...prev, [prop]: value }));
  };

  const [contentInput, setContentInput] = useState('lorem20');
  const content = (() => {
    const match = contentInput.match(/^lorem(\d+)$/i);
    if (match) {
      const count = parseInt(match[1], 20);
      return generateLorem(count);
    }
    return contentInput;
  })();
  const fakeTagCode = buildFakeTag('p', selected, undefined, content);
  const fakeAliasCode = buildFakeTag('p', selected, 'P', content);

  return (
    <Section>
      {/* Preview */}
      <P {...selected}>{content}</P>
      {/* Usage et Alias preview */}
      <Section>
        <Div variant={'outline'} layout={'grid'}>
          <PlaygroundCodeView
            fakeTagCode={fakeTagCode}
            fakeAliasCode={fakeAliasCode}
          />
          <Div size={'none'}>
            <Span>
              <Label htmlFor='loremCount' className='whitespace-nowrap'>
                Lorem count:
              </Label>
              <Input
                id='contentInput'
                type='text'
                value={contentInput}
                onChange={(e) => setContentInput(e.target.value)}
              />
            </Span>
            {/* Select Controls */}
            <PlaygroundVariantSelects
              meta={pVariantsMeta}
              selected={selected}
              onChange={handleChange}
            />
          </Div>
        </Div>
      </Section>
    </Section>
  );
}

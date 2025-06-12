'use client';

import { P, pVariantsMeta, Section } from '@ezstart/ui/components';
import { useState } from 'react';
import PlaygroundCodeView from '../components/playground-code-view';
import { PlaygroundVariantSelects } from '../components/playground-variant-selects';
import { buildFakeTag } from '../utils/build-fake-tag';

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

  const content = "I'm a text";
  const fakeTagCode = buildFakeTag('p', selected, undefined, content);
  const fakeAliasCode = buildFakeTag('p', selected, 'P', content);

  return (
    <Section>
      {/* Preview */}
      <P {...selected}>{content}</P>
      {/* Usage et Alias preview */}
      <PlaygroundCodeView
        fakeTagCode={fakeTagCode}
        fakeAliasCode={fakeAliasCode}
      />
      {/* Select Controls */}
      <PlaygroundVariantSelects
        meta={pVariantsMeta}
        selected={selected}
        onChange={handleChange}
      />
    </Section>
  );
}

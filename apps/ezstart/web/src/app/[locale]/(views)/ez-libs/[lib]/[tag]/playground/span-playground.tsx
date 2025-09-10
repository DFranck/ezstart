'use client';

import {
  DEFAULT_SPAN_VARIANTS,
  Div,
  P,
  Section,
  Span,
  tagVariantsMeta,
} from '@ezstart/ui/components';
import { useState } from 'react';
import PlaygroundCodeView from '../components/playground-code-view';
import { PlaygroundVariantSelects } from '../components/playground-variant-selects';
import { buildFakeTag } from '../utils/build-fake-tag';

const meta = tagVariantsMeta['span'];

export default function SpanPlayground() {
  const [selected, setSelected] = useState<Record<string, string>>(
    DEFAULT_SPAN_VARIANTS
  );

  const handleChange = (prop: string, value: string) => {
    setSelected((prev) => ({ ...prev, [prop]: value }));
  };

  const content = (
    <P>
      I'm a paragraph with a <Span {...selected}>styled span</Span> inside. Play
      with my variants below.
    </P>
  );

  const fakeTagCode = buildFakeTag('span', selected, undefined, 'Styled span');
  const fakeAliasCode = buildFakeTag('span', selected, 'Span', 'Styled span');

  return (
    <>
      <Span>{content}</Span>
      <Section size={'xs'}>
        <Div layout={'grid'} variant={'outline'}>
          <PlaygroundCodeView
            fakeTagCode={fakeTagCode}
            fakeAliasCode={fakeAliasCode}
          />
          <PlaygroundVariantSelects
            meta={meta}
            selected={selected}
            onChange={handleChange}
          />
        </Div>
      </Section>
    </>
  );
}

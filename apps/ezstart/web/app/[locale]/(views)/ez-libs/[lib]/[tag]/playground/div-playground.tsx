'use client';

import {
  Button,
  DEFAULT_DIV_VARIANTS,
  Div,
  H2,
  H4,
  P,
  Section,
  tagVariantsMeta,
} from '@ezstart/ui/components';
import { useState } from 'react';
import PlaygroundCodeView from '../components/playground-code-view';
import { PlaygroundVariantSelects } from '../components/playground-variant-selects';
import { buildFakeTag } from '../utils/build-fake-tag';

const meta = tagVariantsMeta['div'];

export default function DivPlayground() {
  const [selected, setSelected] =
    useState<Record<string, string>>(DEFAULT_DIV_VARIANTS);

  const handleChange = (prop: string, value: string) => {
    setSelected((prev) => ({ ...prev, [prop]: value }));
  };

  const content = (
    <>
      <div>
        <H2>I'm a Div</H2>
        <H4>Play with me, controls are below</H4>
      </div>

      <P className='line-clamp-3 md:line-clamp-none'>
        Lorem ipsum dolor, sit amet consectetur adipisicing elit. Error,
        accusantium quasi officia cum adipisci quia libero harum assumenda
        eligendi provident!
      </P>
      <Button>Fake Action</Button>
    </>
  );

  const fakeTagCode = buildFakeTag('div', selected, undefined, '...');
  const fakeAliasCode = buildFakeTag('div', selected, 'div', '...');

  return (
    <>
      <Section>
        <Div {...selected}>{content}</Div>
      </Section>
      <Section size={'xs'}>
        <Div variant={'outline'} layout={'grid'} size={'xs'}>
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

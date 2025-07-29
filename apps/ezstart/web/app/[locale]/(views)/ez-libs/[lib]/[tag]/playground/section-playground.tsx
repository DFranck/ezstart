'use client';

import {
  Button,
  DEFAULT_SECTION_VARIANTS,
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

const meta = tagVariantsMeta['section'];

export default function SectionPlayground() {
  const [selected, setSelected] = useState<Record<string, string>>(
    DEFAULT_SECTION_VARIANTS
  );

  const handleChange = (prop: string, value: string) => {
    setSelected((prev) => ({ ...prev, [prop]: value }));
  };

  const content = (
    <>
      <Div size={'xs'}>
        <H2>I'm a section</H2>
        <H4>Play with me, controls are below</H4>
      </Div>
      <Div size={'xs'}>
        <P className='line-clamp-3 md:line-clamp-none'>
          Lorem ipsum, dolor sit amet consectetur adipisicing elit. Delectus quo
          rerum officiis ex similique libero. Officiis esse corrupti magnam iste
          adipisci officia dignissimos ipsam ullam minus non incidunt accusamus
          eveniet inventore, deserunt culpa animi velit, voluptatibus sequi quia
          temporibus nemo dolorum eius. Ab ut, necessitatibus eos quisquam omnis
          debitis libero?
        </P>
        <Button>Fake Action</Button>
      </Div>
    </>
  );

  const fakeTagCode = buildFakeTag('section', selected, undefined, '...');
  const fakeAliasCode = buildFakeTag('section', selected, 'Section', '...');

  return (
    <>
      <Section {...selected}>{content}</Section>
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

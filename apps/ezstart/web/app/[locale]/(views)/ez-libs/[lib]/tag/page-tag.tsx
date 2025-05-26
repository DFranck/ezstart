'use client';
import {
  H1,
  H2,
  H3,
  Main,
  Section,
  tagVariantsMeta,
} from '@ezstart/ui/components';
import { useState } from 'react';
import { HeadingPlayground } from './heading-playground';
import { MainPlaygroundControls } from './main-playground-controls';
import PPlayground from './p-playground';
import SectionPlayground from './section-playground';

const mainMeta = tagVariantsMeta['main'];

const TagPage = () => {
  console.log('tagVariantsMeta', tagVariantsMeta);
  const [mainVariants, setMainVariants] = useState(() => {
    const out: Record<string, string> = {};
    Object.entries(mainMeta).forEach(([key, values]) => {
      out[key] = values[0];
    });
    return out;
  });
  const handleChange = (prop: string, value: string) => {
    setMainVariants((prev) => ({ ...prev, [prop]: value }));
  };
  return (
    <Main {...mainVariants}>
      <Section>
        <H1>Tag</H1>
        <H3>
          Here you can find the documentation of Tag wwith all the props and
          supported tag playground
        </H3>
      </Section>
      <Section>
        <H2>Main Tag</H2>
        <MainPlaygroundControls
          meta={mainMeta}
          selected={mainVariants}
          onChange={handleChange}
        />
      </Section>
      <Section>
        <H2>Heading Tags</H2>
        <HeadingPlayground />
      </Section>

      <H2 className='max-w-4xl w-full text-left px-4 md:px-10  '>
        Section Tag
      </H2>
      <SectionPlayground />
      <Section>
        <H2>P Tag</H2>
        <PPlayground />
      </Section>
    </Main>
  );
};

export default TagPage;

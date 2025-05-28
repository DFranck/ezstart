'use client';
import { H2, Main, Section, tagVariantsMeta } from '@ezstart/ui/components';
import { useState } from 'react';
import { HeaderLib } from '../components/header-lib';
import { HeadingPlayground } from './playground/heading-playground';
import ListingPlayground from './playground/listing-playground';
import { MainPlaygroundControls } from './playground/main-playground-controls';
import PPlayground from './playground/p-playground';
import SectionPlayground from './playground/section-playground';
const mainMeta = tagVariantsMeta['main'];

const TagPage = () => {
  const [mainVariants, setMainVariants] = useState(() => {
    const out: Record<string, string> = {};
    Object.entries(mainMeta).forEach(([variantName, values]) => {
      out[variantName] = values.includes('default')
        ? 'default'
        : values[0] || '';
    });
    return out;
  });
  const handleChange = (prop: string, value: string) => {
    setMainVariants((prev) => ({ ...prev, [prop]: value }));
  };

  return (
    <Main {...mainVariants}>
      <HeaderLib lib='tag' />
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
      <Section>
        <H2>Listing Tags</H2>
        <ListingPlayground />
      </Section>
    </Main>
  );
};

export default TagPage;

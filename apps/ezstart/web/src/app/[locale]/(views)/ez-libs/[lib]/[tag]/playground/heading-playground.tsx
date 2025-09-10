'use client';

import {
  Div,
  HEADING_TAGS,
  headingVariants,
  Section,
  Tag,
  tagVariantsMeta,
} from '@ezstart/ui/components';
import { useState } from 'react';
import { buildFakeTag } from '../utils/build-fake-tag';

import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@ezstart/ui/components';
import PlaygroundCodeView from '../components/playground-code-view';
import { PlaygroundVariantSelects } from '../components/playground-variant-selects';

export const HeadingPlayground = () => (
  <Section>
    <Accordion type='multiple' className='w-full'>
      {HEADING_TAGS.map((tag) => (
        <AccordionItem value={tag} key={tag} className='border-b'>
          <AccordionTrigger className='capitalize text-xl font-semibold cursor-pointer'>
            {`<${tag}> playground`}
          </AccordionTrigger>
          <AccordionContent>
            <HeadingVariantTester tag={tag} />
          </AccordionContent>
        </AccordionItem>
      ))}
    </Accordion>
  </Section>
);

type TesterProps = {
  tag: (typeof HEADING_TAGS)[number];
};

const HeadingVariantTester = ({ tag }: TesterProps) => {
  const meta = tagVariantsMeta[tag];
  const factory = headingVariants[tag] as any;
  const [selected, setSelected] = useState(() => {
    const out: Record<string, string> = {};
    Object.entries(meta).forEach(([variantName, values]) => {
      if (variantName === 'size' && values.includes(tag)) {
        out[variantName] = tag;
      } else {
        out[variantName] = factory.defaultVariants?.[variantName] ?? values[0];
      }
    });

    return out;
  });

  const handleChange = (prop: string, value: string) => {
    setSelected((prev) => ({ ...prev, [prop]: value }));
  };

  const aliasComponent = `H${tag.slice(1)}`;
  const content = `I'm a ${tag.toUpperCase()}`;
  const fakeTagCode = buildFakeTag(tag, selected, undefined, content);
  const fakeAliasCode = buildFakeTag(tag, selected, aliasComponent, content);

  return (
    <Section size={'xs'}>
      {/* Preview */}
      <div className='flex-1 min-w-0'>
        <Tag as={tag} {...selected}>
          {content}
        </Tag>
      </div>

      {/* Controls & usage */}
      <Div variant={'outline'} layout={'grid'} className='w-full'>
        <PlaygroundCodeView
          fakeTagCode={fakeTagCode}
          fakeAliasCode={fakeAliasCode}
        />
        <PlaygroundVariantSelects
          meta={meta}
          selected={selected}
          onChange={handleChange}
          columns={2}
        />
      </Div>
    </Section>
  );
};

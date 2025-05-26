'use client';

import {
  H6,
  headings,
  headingVariants,
  Section,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Tag,
  tagVariantsMeta,
} from '@ezstart/ui/components';
import { useState } from 'react';
import { buildFakeTag } from './buildFakeTag';

import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@ezstart/ui/components';

export const HeadingPlayground = () => (
  <Accordion type='multiple' className='w-full'>
    {headings.map((tag) => (
      <AccordionItem value={tag} key={tag} className='border-b'>
        <AccordionTrigger className='capitalize text-xl font-semibold'>
          {`<${tag}> playground`}
        </AccordionTrigger>
        <AccordionContent>
          <HeadingVariantTester tag={tag} />
        </AccordionContent>
      </AccordionItem>
    ))}
  </Accordion>
);

type TesterProps = {
  tag: (typeof headings)[number];
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
    <Section variant={'outline'}>
      {/* Preview */}
      <div className='flex-1 min-w-0'>
        <Tag as={tag} {...selected}>
          {content}
        </Tag>
      </div>

      {/* Controls & usage */}
      <div className='flex-1 min-w-[240px]'>
        <div className='mb-3'>
          <div className='grid grid-cols-1 gap-2'>
            <div>
              <H6 className='mb-1'>Usage</H6>
              <pre className='bg-muted rounded p-2 text-xs overflow-x-auto'>
                <code>{fakeTagCode}</code>
              </pre>
            </div>
            <div>
              <H6 className='mb-1'>Alias</H6>
              <pre className='bg-muted rounded p-2 text-xs overflow-x-auto'>
                <code>{fakeAliasCode}</code>
              </pre>
            </div>
          </div>
        </div>
        <form className='grid gap-3 md:grid-cols-3'>
          {Object.entries(meta).map(([variantName, values]) => (
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
        </form>
      </div>
    </Section>
  );
};

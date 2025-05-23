'use client';

import { EzTag, headings, tagVariantsMeta } from '@ezstart/ez-tag';
import { useState } from 'react';
import { headingVariants } from '../../../../../../../../packages/libs/ez-tag/src/variants/groups/heading';
import { buildFakeTag } from './buildFakeTag';

export const HeadingPlayground = () => {
  return (
    <div className='space-y-6'>
      {headings.map((tag) => (
        <HeadingVariantTester key={tag} tag={tag} />
      ))}
    </div>
  );
};

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
        // Pour la prop "size", on initialise à la valeur du tag (ex: "h2" pour <h2>)
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
  const fakeTagCode = buildFakeTag(tag, selected);
  const fakeAliasCode = buildFakeTag(tag, selected, aliasComponent);

  return (
    <div className='space-y-2'>
      <h3 className='text-lg font-bold capitalize'>{`<${tag}>`}</h3>
      <div className='flex gap-4 flex-wrap items-end'>
        {Object.entries(meta).map(([variantName, values]) => (
          <div key={variantName} className='flex flex-col gap-1'>
            <label className='text-xs text-neutral-400'>{variantName}</label>
            <select
              className='rounded border p-2 bg-black text-white'
              value={selected[variantName]}
              onChange={(e) => handleChange(variantName, e.target.value)}
            >
              {values.map((v) => (
                <option key={v} value={v}>
                  {v}
                </option>
              ))}
            </select>
          </div>
        ))}
        <EzTag as={tag} {...selected}>
          {`${tag.toUpperCase()} • ${Object.entries(selected)
            .map(([k, v]) => `${k}: ${v}`)
            .join(' • ')}`}
        </EzTag>
      </div>
      {/* Bloc code dynamic */}
      <pre className='rounded bg-zinc-900/80 px-4 py-2 text-sm text-zinc-100 mt-2 font-mono'>
        <code>{fakeAliasCode}</code>
      </pre>
      <pre className='rounded bg-zinc-900/80 px-4 py-2 text-sm text-zinc-100 font-mono'>
        <code>{fakeTagCode}</code>
      </pre>
    </div>
  );
};

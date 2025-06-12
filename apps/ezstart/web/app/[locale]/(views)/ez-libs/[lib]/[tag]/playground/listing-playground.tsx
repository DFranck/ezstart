'use client';

import {
  Div,
  LI,
  listingVariantsMeta,
  Section,
  UL,
} from '@ezstart/ui/components';
import { useState } from 'react';
import PlaygroundCodeView from '../components/playground-code-view';
import { PlaygroundVariantSelects } from '../components/playground-variant-selects';
import { buildFakeTag } from '../utils/build-fake-tag';

const metaUL = listingVariantsMeta['ul'];
const metaLI = listingVariantsMeta['li'];

export default function ListingPlayground() {
  const [selectedUL, setSelectedUL] = useState<Record<string, string>>(() => {
    const out: Record<string, string> = {};
    Object.entries(metaUL).forEach(([variantName, values]) => {
      out[variantName] = values.includes('default')
        ? 'default'
        : values[0] || '';
    });
    return out;
  });

  const [selectedLI, setSelectedLI] = useState<Record<string, string>>(() => {
    const out: Record<string, string> = {};
    Object.entries(metaLI).forEach(([variantName, values]) => {
      out[variantName] = values.includes('default')
        ? 'default'
        : values[0] || '';
    });
    return out;
  });

  const handleChangeUL = (prop: string, value: string) => {
    setSelectedUL((prev) => ({ ...prev, [prop]: value }));
  };

  const handleChangeLI = (prop: string, value: string) => {
    setSelectedLI((prev) => ({ ...prev, [prop]: value }));
  };

  const fakeTagCodeUL = buildFakeTag('ul', selectedUL, 'UL', '\n  ...\n');
  const fakeTagCodeLI = buildFakeTag(
    'li',
    selectedLI,
    'LI',
    'List item content'
  );

  return (
    <>
      {/* Preview */}
      <UL {...selectedUL}>
        <LI {...selectedLI}>Item 1</LI>
        <LI {...selectedLI}>Item 2</LI>
        <LI {...selectedLI}>Item 3</LI>
      </UL>

      {/* Container Controls */}
      <Section size='xs' variant={'primary'} layout={'grid'}>
        <Div>
          <h3 className='text-lg font-semibold mb-2'>UL Variants</h3>
          <PlaygroundCodeView
            fakeTagCode={fakeTagCodeUL}
            fakeAliasCode={fakeTagCodeUL}
          />
          <PlaygroundVariantSelects
            meta={metaUL}
            selected={selectedUL}
            onChange={handleChangeUL}
          />
        </Div>
        <Div>
          <h3 className='text-lg font-semibold mb-2'>LI Variants</h3>
          <PlaygroundCodeView
            fakeTagCode={fakeTagCodeLI}
            fakeAliasCode={fakeTagCodeLI}
          />
          <PlaygroundVariantSelects
            meta={metaLI}
            selected={selectedLI}
            onChange={handleChangeLI}
          />
        </Div>
      </Section>

      {/* Item Controls */}
      <Section size='xs' className='mt-8'>
        <h3 className='text-lg font-semibold mb-2'>LI Variants</h3>
        <PlaygroundCodeView
          fakeTagCode={fakeTagCodeLI}
          fakeAliasCode={fakeTagCodeLI}
        />
        <PlaygroundVariantSelects
          meta={metaLI}
          selected={selectedLI}
          onChange={handleChangeLI}
        />
      </Section>
    </>
  );
}

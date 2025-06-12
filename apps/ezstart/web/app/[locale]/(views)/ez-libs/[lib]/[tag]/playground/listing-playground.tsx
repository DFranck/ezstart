'use client';

import { H6, listingVariantsMeta, Section, Tag } from '@ezstart/ui/components';
import { useState } from 'react';
import { PlaygroundVariantSelects } from '../components/playground-variant-selects';

export default function ListingPlayground() {
  const containerTag = 'ul';
  const itemTag = 'li';

  const variantContainer = listingVariantsMeta[containerTag] || {};
  const itemVariants = listingVariantsMeta[itemTag] || {};

  const [containerSelected, setContainerSelected] = useState(() => {
    const out: Record<string, string> = {};
    Object.entries(variantContainer).forEach(([variantName, values]) => {
      out[variantName] = values.includes('default')
        ? 'default'
        : values[0] || '';
    });
    return out;
  });

  const [itemSelected, setItemSelected] = useState(() => {
    const out: Record<string, string> = {};
    Object.entries(itemVariants).forEach(([variantName, values]) => {
      out[variantName] = values.includes('default')
        ? 'default'
        : values[0] || '';
    });
    return out;
  });

  const handleContainerChange = (key: string, value: string) => {
    setContainerSelected((prev) => ({ ...prev, [key]: value }));
  };

  const handleItemChange = (key: string, value: string) => {
    setItemSelected((prev) => ({ ...prev, [key]: value }));
  };

  return (
    <Section className='space-y-6'>
      {/* Preview */}
      <Tag as={containerTag} {...containerSelected}>
        {[...Array(3)].map((_, i) => (
          <Tag key={i} as={itemTag} {...itemSelected}>
            Item {i + 1}
          </Tag>
        ))}
      </Tag>

      {/* Select Controls */}
      <UL layout={'grid'} className='max-w-full'>
        <H6>Container</H6>
        <H6>Items</H6>
        <PlaygroundVariantSelects
          meta={variantContainer}
          selected={containerSelected}
          onChange={handleContainerChange}
        />
        <PlaygroundVariantSelects
          meta={itemVariants}
          selected={itemSelected}
          onChange={handleItemChange}
        />
      </UL>
    </Section>
  );
}

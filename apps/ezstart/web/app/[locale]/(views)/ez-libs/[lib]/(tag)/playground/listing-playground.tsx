'use client';

import {
  H4,
  H6,
  listingVariantsMeta,
  Section,
  Tag,
  Ul,
} from '@ezstart/ui/components';
import { useState } from 'react';
import { PlaygroundVariantSelects } from '../components/playground-variant-selects';

export default function ListingPlayground() {
  const containerTag = 'ul';
  const itemTag = 'li';

  const containerVariants = listingVariantsMeta[containerTag] || {};
  const itemVariants = listingVariantsMeta[itemTag] || {};

  const [containerSelected, setContainerSelected] = useState(() => {
    const out: Record<string, string> = {};
    Object.entries(containerVariants).forEach(([variantName, values]) => {
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
    <Section variant='outline' className='space-y-6'>
      {/* Preview */}
      <Tag as={containerTag} {...containerSelected}>
        <H4>Container</H4>
        {[...Array(3)].map((_, i) => (
          <Tag key={i} as={itemTag} {...itemSelected}>
            Item {i + 1}
          </Tag>
        ))}
      </Tag>

      {/* Select Controls */}
      <Ul layout={'grid'} className='max-w-full'>
        <H6>Container</H6>
        <H6>Items</H6>
        <PlaygroundVariantSelects
          meta={containerVariants}
          selected={containerSelected}
          onChange={handleContainerChange}
        />
        <PlaygroundVariantSelects
          meta={itemVariants}
          selected={itemSelected}
          onChange={handleItemChange}
        />
      </Ul>
    </Section>
  );
}

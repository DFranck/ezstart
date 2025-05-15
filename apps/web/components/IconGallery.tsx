'use client';

import type { KnownIconName } from '@ezstart/ez-icon';
import { EzIcon } from '@ezstart/ez-icon';
import { Div, EzTag } from '@ezstart/ez-tag';
import { useVirtualizer } from '@tanstack/react-virtual';
import { useRef, useState } from 'react';

export type IconGalleryItem = {
  lib: 'lucide' | 'fa' | 'custom';
  name: string;
};

interface IconGalleryProps {
  title?: string;
  icons: IconGalleryItem[];
  size?: number;
  searchable?: boolean;
  height?: number;
}

export const IconGallery = ({
  title = 'Icons',
  icons,
  size = 20,
  searchable = true,
  height = 600,
}: IconGalleryProps) => {
  const [search, setSearch] = useState('');
  const filtered = icons.filter(({ name }) =>
    name.toLowerCase().includes(search.toLowerCase())
  );

  const parentRef = useRef<HTMLDivElement>(null);

  const rowVirtualizer = useVirtualizer({
    count: filtered.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => size + 40, // row height
    overscan: 10,
  });

  return (
    <EzTag as='section'>
      <EzTag as='h1'>{title}</EzTag>

      {searchable && (
        <input
          type='text'
          placeholder='Search icon...'
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className='mb-4 border p-1 w-full max-w-xs'
        />
      )}

      <div
        ref={parentRef}
        className='relative overflow-y-auto border rounded'
        style={{ height }}
      >
        <div
          style={{
            height: rowVirtualizer.getTotalSize(),
            position: 'relative',
          }}
        >
          {rowVirtualizer.getVirtualItems().map((virtualRow) => {
            const item = filtered[virtualRow.index];
            return (
              <div
                key={`${item.lib}:${item.name}`}
                className='absolute left-0 w-full px-4 py-2'
                style={{ transform: `translateY(${virtualRow.start}px)` }}
              >
                <Div className='flex items-center gap-3 text-sm'>
                  <EzIcon
                    name={`${item.lib}:${item.name}` as KnownIconName}
                    size={size}
                  />
                  <span className='text-xs text-foreground'>
                    {item.name} ({item.lib})
                  </span>
                </Div>
              </div>
            );
          })}
        </div>
      </div>
    </EzTag>
  );
};

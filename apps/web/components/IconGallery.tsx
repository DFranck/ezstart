'use client';

import type { KnownIconName } from '@ezstart/ez-icon';
import { EzIcon } from '@ezstart/ez-icon';
import { EzTag } from '@ezstart/ez-tag';
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
  fullHeight?: boolean;
}

export const IconGallery = ({
  title = 'Icons',
  icons,
  size = 20,
  searchable = true,
  height = 600,
  fullHeight = false,
}: IconGalleryProps) => {
  const [search, setSearch] = useState('');
  const filtered = icons.filter(({ name }) =>
    name.toLowerCase().includes(search.toLowerCase())
  );

  const parentRef = useRef<HTMLDivElement>(null);

  const columnCount = 6;
  const rowCount = Math.ceil(filtered.length / columnCount);

  const rowVirtualizer = useVirtualizer({
    count: rowCount,
    getScrollElement: () => parentRef.current,
    estimateSize: () => size + 40,
    overscan: 5,
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
        className={`relative overflow-y-auto border rounded ${
          fullHeight ? 'h-full' : ''
        }`}
        style={{
          height: fullHeight ? undefined : height,
        }}
      >
        <div
          style={{
            height: rowVirtualizer.getTotalSize(),
            position: 'relative',
          }}
        >
          {rowVirtualizer.getVirtualItems().map((virtualRow) => {
            const startIndex = virtualRow.index * columnCount;
            const itemsInRow = filtered.slice(
              startIndex,
              startIndex + columnCount
            );

            return (
              <div
                key={virtualRow.index}
                className='absolute left-0 flex flex-wrap gap-1 w-full '
                style={{ transform: `translateY(${virtualRow.start}px)` }}
              >
                {itemsInRow.map((item) => (
                  <EzIcon
                    key={`${item.lib}:${item.name}`}
                    name={`${item.lib}:${item.name}` as KnownIconName}
                    size={size}
                    className='bg-muted'
                  />
                ))}
              </div>
            );
          })}
        </div>
      </div>
    </EzTag>
  );
};

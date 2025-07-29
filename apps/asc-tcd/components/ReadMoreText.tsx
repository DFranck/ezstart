'use client';

import { P } from '@ezstart/ui/components';
import { useState } from 'react';

type ReadMoreTextProps = {
  text: string;
  maxChars?: number;
  className?: string;
  variant?: 'default' | 'link' | 'description' | null;
};

export const ReadMoreText = ({
  text,
  maxChars = 220,
  className,
  variant,
}: ReadMoreTextProps) => {
  const [expanded, setExpanded] = useState(false);
  const isLong = text.length > maxChars;
  const displayText =
    expanded || !isLong ? text : text.slice(0, maxChars) + '…';

  return (
    <P variant={variant ? variant : undefined} className={className}>
      {displayText}
      {isLong && (
        <button
          onClick={() => setExpanded((prev) => !prev)}
          className='text-primary font-semibold ml-1 cursor-pointer'
        >
          {expanded ? 'Read less' : 'Read more'}
        </button>
      )}
    </P>
  );
};

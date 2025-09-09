'use client';

import { Button, P } from '@ezstart/ui/components';
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
        <Button
          onClick={() => setExpanded((prev) => !prev)}
          variant="link"
          className='ml-1 p-0 h-auto font-semibold'
        >
          {expanded ? 'Read less' : 'Read more'}
        </Button>
      )}
    </P>
  );
};
